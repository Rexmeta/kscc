import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

/**
 * Operational telemetry contract.
 *
 * Logs are JSON lines with a small allow-list of fields. Never pass request
 * bodies, headers, provider responses, or arbitrary error objects to this
 * module. The allow-list is intentional: it prevents a future log call from
 * accidentally turning operational output into a PII or secret sink.
 */
export type TelemetrySeverity = "info" | "warn" | "error";
export type RequestOutcome = "success" | "client_error" | "server_error";

type SafeTelemetryValue = string | number | boolean;
export type OperationalEventFields = Record<string, SafeTelemetryValue | undefined>;

const CORRELATION_HEADER = "X-Request-ID";
const MAX_CORRELATION_ID_LENGTH = 128;
const MAX_FIELD_LENGTH = 160;
const MAX_ROUTE_ENTRIES = 100;

/**
 * Provider-neutral alert policy. These values intentionally describe the
 * application process rather than a particular monitoring vendor.
 */
export const API_ALERT_THRESHOLDS = {
  windowMs: 5 * 60 * 1000,
  minimumRequests: 20,
  serverErrorRate: 0.05,
  latencyP95Ms: 1_000,
  maxSamples: 1_000,
} as const;

const SAFE_FIELDS = new Set([
  "correlationId",
  "requestId",
  "method",
  "route",
  "status",
  "durationMs",
  "outcome",
  "actorId",
  "actorRole",
  "operation",
  "reason",
  "errorType",
  "provider",
  "dependency",
  "contentType",
  "result",
  "state",
  "count",
  "rate",
  "threshold",
]);

interface RequestMetric {
  count: number;
  errorCount: number;
  durationMs: number;
}

interface AlertSample {
  at: number;
  durationMs: number;
  outcome: RequestOutcome;
}

const metrics = {
  requests: 0,
  errors: 0,
  durationMs: 0,
  outcomes: {
    success: 0,
    client_error: 0,
    server_error: 0,
  } as Record<RequestOutcome, number>,
  routes: new Map<string, RequestMetric>(),
};

const alertSamples: AlertSample[] = [];
const alertState = {
  serverErrorRate: false,
  latencyP95: false,
};

function boundedString(value: string): string {
  return value.length > MAX_FIELD_LENGTH
    ? `${value.slice(0, MAX_FIELD_LENGTH)}…`
    : value;
}

function safeFieldValue(value: unknown): SafeTelemetryValue | undefined {
  if (typeof value === "string") return boundedString(value);
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean") return value;
  return undefined;
}

function sanitizeFields(fields: OperationalEventFields): Record<string, SafeTelemetryValue> {
  const safe: Record<string, SafeTelemetryValue> = {};
  for (const [key, value] of Object.entries(fields)) {
    const safeValue = SAFE_FIELDS.has(key) ? safeFieldValue(value) : undefined;
    if (safeValue !== undefined) {
      safe[key] = safeValue;
    }
  }
  return safe;
}

export function emitOperationalEvent(
  event: string,
  severity: TelemetrySeverity,
  fields: OperationalEventFields = {},
): void {
  const payload = {
    timestamp: new Date().toISOString(),
    event: boundedString(event),
    severity,
    ...sanitizeFields(fields),
  };
  const line = JSON.stringify(payload);

  if (severity === "error") {
    console.error(line);
  } else if (severity === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

function isSafeCorrelationId(value: string): boolean {
  return value.length > 0 &&
    value.length <= MAX_CORRELATION_ID_LENGTH &&
    /^[A-Za-z0-9._:-]+$/.test(value);
}

export function createCorrelationId(requested?: string): string {
  return requested && isSafeCorrelationId(requested) ? requested : randomUUID();
}

export function getCorrelationId(req: Request): string {
  return req.correlationId || createCorrelationId();
}

export function getTelemetryRoute(req: Request): string {
  // originalUrl is deliberately not used: it may include sensitive query
  // values. Express route templates avoid logging slugs and identifiers.
  const route = req.route?.path;
  const mountedRoute = route
    ? `${req.baseUrl || ""}${typeof route === "string" ? route : ""}`
    : req.path;
  const withoutQuery = mountedRoute.split("?")[0] || "/";
  const safeRoute = withoutQuery
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ":id")
    .replace(/\/\d+(?=\/|$)/g, "/:id")
    .slice(0, MAX_FIELD_LENGTH);
  if (route) return safeRoute;

  // Before Express matches a route, retain only the first path segment after
  // the API prefix. Unknown segments may contain slugs or contact details.
  const segments = safeRoute.split("/").filter(Boolean);
  if (segments[0] === "api" && segments.length > 2) {
    return `/${segments.slice(0, 2).join("/")}/:param`;
  }
  return safeRoute;
}

function outcomeForStatus(status: number): RequestOutcome {
  if (status >= 500) return "server_error";
  if (status >= 400) return "client_error";
  return "success";
}

function recordRequest(route: string, durationMs: number, outcome: RequestOutcome): void {
  metrics.requests += 1;
  metrics.durationMs += durationMs;
  metrics.outcomes[outcome] += 1;
  if (outcome !== "success") metrics.errors += 1;

  let routeMetric = metrics.routes.get(route);
  if (!routeMetric) {
    // Keep memory bounded even if an attacker sends many distinct paths.
    if (metrics.routes.size >= MAX_ROUTE_ENTRIES) return;
    routeMetric = { count: 0, errorCount: 0, durationMs: 0 };
    metrics.routes.set(route, routeMetric);
  }
  routeMetric.count += 1;
  routeMetric.durationMs += durationMs;
  if (outcome !== "success") routeMetric.errorCount += 1;
}

function percentile(values: number[], percentileRank: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * percentileRank) - 1),
  );
  return sorted[index];
}

function emitThresholdAlerts(correlationId: string, now: number): void {
  const windowStart = now - API_ALERT_THRESHOLDS.windowMs;
  while (alertSamples.length > 0 && alertSamples[0].at < windowStart) {
    alertSamples.shift();
  }

  const requestCount = alertSamples.length;
  if (requestCount < API_ALERT_THRESHOLDS.minimumRequests) {
    alertState.serverErrorRate = false;
    alertState.latencyP95 = false;
    return;
  }

  const serverErrorCount = alertSamples.reduce(
    (count, sample) => count + (sample.outcome === "server_error" ? 1 : 0),
    0,
  );
  const serverErrorRate = serverErrorCount / requestCount;
  const latencyP95Ms = percentile(
    alertSamples.map((sample) => sample.durationMs),
    0.95,
  );
  const serverErrorRateExceeded = serverErrorRate >= API_ALERT_THRESHOLDS.serverErrorRate;
  const latencyExceeded = latencyP95Ms >= API_ALERT_THRESHOLDS.latencyP95Ms;

  if (serverErrorRateExceeded && !alertState.serverErrorRate) {
    emitOperationalEvent("http.alert", "warn", {
      correlationId,
      requestId: correlationId,
      reason: "server_error_rate",
      count: requestCount,
      rate: serverErrorRate,
      threshold: API_ALERT_THRESHOLDS.serverErrorRate,
    });
  }
  if (latencyExceeded && !alertState.latencyP95) {
    emitOperationalEvent("http.alert", "warn", {
      correlationId,
      requestId: correlationId,
      reason: "latency_p95",
      count: requestCount,
      durationMs: latencyP95Ms,
      threshold: API_ALERT_THRESHOLDS.latencyP95Ms,
    });
  }

  alertState.serverErrorRate = serverErrorRateExceeded;
  alertState.latencyP95 = latencyExceeded;
}

function recordAlertSample(
  durationMs: number,
  outcome: RequestOutcome,
  correlationId: string,
): void {
  const now = Date.now();
  alertSamples.push({ at: now, durationMs, outcome });
  if (alertSamples.length > API_ALERT_THRESHOLDS.maxSamples) {
    alertSamples.splice(0, alertSamples.length - API_ALERT_THRESHOLDS.maxSamples);
  }
  emitThresholdAlerts(correlationId, now);
}

function isAdministrativeMutation(req: Request): boolean {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return false;
  const path = req.path;
  return path.startsWith("/api/admin/") ||
    path.startsWith("/api/users") ||
    path.startsWith("/api/posts") ||
    path.startsWith("/api/partners") ||
    path.startsWith("/api/organization-members") ||
    (path.startsWith("/api/inquiries") && Boolean(req.user)) ||
    (path.startsWith("/api/members") && req.method === "DELETE");
}

/**
 * Add a validated correlation ID to every request and emit one bounded API
 * request event when the response completes. This middleware intentionally
 * does not inspect request bodies or authorization headers.
 */
export function requestTelemetry(req: Request, res: Response, next: NextFunction): void {
  const requestedId = req.get(CORRELATION_HEADER) || undefined;
  const correlationId = createCorrelationId(requestedId);
  req.correlationId = correlationId;
  res.setHeader(CORRELATION_HEADER, correlationId);
  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const roundedDurationMs = Math.max(0, Math.round(durationMs * 100) / 100);
    const outcome = outcomeForStatus(res.statusCode);
    const route = getTelemetryRoute(req);

    if (req.path.startsWith("/api")) {
      recordRequest(route, roundedDurationMs, outcome);
      recordAlertSample(roundedDurationMs, outcome, correlationId);
      emitOperationalEvent("http.request", outcome === "server_error" ? "error" : outcome === "client_error" ? "warn" : "info", {
        correlationId,
        requestId: correlationId,
        method: req.method,
        route,
        status: res.statusCode,
        durationMs: roundedDurationMs,
        outcome,
      });
    }

    if (isAdministrativeMutation(req)) {
      emitOperationalEvent("admin.change", outcome === "server_error" ? "error" : outcome === "client_error" ? "warn" : "info", {
        correlationId,
        actorId: req.user?.id,
        actorRole: req.user?.role,
        operation: req.method,
        route,
        status: res.statusCode,
        outcome,
      });
    }
  });

  next();
}

export function getMetricsSnapshot(): {
  requests: number;
  errors: number;
  durationMs: number;
  outcomes: Record<RequestOutcome, number>;
  routes: Record<string, RequestMetric>;
} {
  const routes: Record<string, RequestMetric> = {};
  metrics.routes.forEach((metric, route) => {
    routes[route] = { ...metric };
  });
  return {
    requests: metrics.requests,
    errors: metrics.errors,
    durationMs: metrics.durationMs,
    outcomes: { ...metrics.outcomes },
    routes,
  };
}

export function resetMetricsForTests(): void {
  metrics.requests = 0;
  metrics.errors = 0;
  metrics.durationMs = 0;
  metrics.outcomes.success = 0;
  metrics.outcomes.client_error = 0;
  metrics.outcomes.server_error = 0;
  metrics.routes.clear();
  alertSamples.length = 0;
  alertState.serverErrorRate = false;
  alertState.latencyP95 = false;
}