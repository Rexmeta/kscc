import assert from "node:assert/strict";
import { test } from "node:test";
import express from "express";
import type { Server } from "node:http";
import {
  emitOperationalEvent,
  getMetricsSnapshot,
  requestTelemetry,
  resetMetricsForTests,
  API_ALERT_THRESHOLDS,
} from "./telemetry";

async function withServer(callback: (baseUrl: string) => Promise<void>): Promise<void> {
  const app = express();
  app.use(requestTelemetry);
  app.get("/api/telemetry-test", (_req, res) => res.status(201).json({ ok: true }));
  app.get("/public", (_req, res) => res.json({ ok: true }));
  const server = await new Promise<Server>((resolve) => {
    const listeningServer = app.listen(0, () => resolve(listeningServer));
  });

  try {
    const address = server.address();
    assert.notEqual(address, null);
    assert.notEqual(typeof address, "string");
    await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test("API requests receive a safe correlation ID and bounded structured metrics", async () => {
  resetMetricsForTests();
  const lines: string[] = [];
  const originalLog = console.log;
  console.log = (line?: unknown) => lines.push(String(line));

  try {
    await withServer(async (baseUrl) => {
      const response = await fetch(
        `${baseUrl}/api/telemetry-test?password=must-not-be-logged`,
        { headers: { "X-Request-ID": "release-test-42" } },
      );
      assert.equal(response.status, 201);
      assert.equal(response.headers.get("x-request-id"), "release-test-42");
    });
  } finally {
    console.log = originalLog;
  }

  assert.equal(lines.length, 1);
  const event = JSON.parse(lines[0]);
  assert.deepEqual(event, {
    timestamp: event.timestamp,
    event: "http.request",
    severity: "info",
    correlationId: "release-test-42",
    requestId: "release-test-42",
    method: "GET",
    route: "/api/telemetry-test",
    status: 201,
    durationMs: event.durationMs,
    outcome: "success",
  });
  assert.equal(JSON.stringify(event).includes("must-not-be-logged"), false);
  assert.deepEqual(getMetricsSnapshot().outcomes, {
    success: 1,
    client_error: 0,
    server_error: 0,
  });
});

test("unsafe correlation IDs are replaced instead of being logged", async () => {
  resetMetricsForTests();
  const lines: string[] = [];
  const originalLog = console.log;
  console.log = (line?: unknown) => lines.push(String(line));

  try {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/telemetry-test`, {
        headers: { "X-Request-ID": "bad secret" },
      });
      const requestId = response.headers.get("x-request-id");
      assert.ok(requestId);
      assert.notEqual(requestId, "bad secret");
    });
  } finally {
    console.log = originalLog;
  }

  assert.equal(lines.length, 1);
  assert.equal(lines[0].includes("bad"), false);
});

test("operational events drop unapproved fields and non-primitive values", () => {
  const lines: string[] = [];
  const originalLog = console.log;
  console.log = (line?: unknown) => lines.push(String(line));

  try {
    emitOperationalEvent("test.redaction", "info", {
      reason: "safe",
      password: "secret",
      message: "private message",
      details: { token: "secret" },
    } as never);
  } finally {
    console.log = originalLog;
  }

  assert.equal(lines.length, 1);
  const line = lines[0];
  assert.equal(line.includes("secret"), false);
  assert.equal(line.includes("private message"), false);
  assert.deepEqual(JSON.parse(line).reason, "safe");
});

test("server error alerts fire once per threshold crossing and remain correlated", async () => {
  resetMetricsForTests();
  const warningLines: string[] = [];
  const errorLines: string[] = [];
  const originalWarn = console.warn;
  const originalError = console.error;
  console.warn = (line?: unknown) => warningLines.push(String(line));
  console.error = (line?: unknown) => errorLines.push(String(line));

  const app = express();
  app.use(requestTelemetry);
  app.get("/api/telemetry-server-error", (_req, res) => {
    res.status(503).json({ ok: false });
  });
  const server = await new Promise<Server>((resolve) => {
    const listeningServer = app.listen(0, () => resolve(listeningServer));
  });

  try {
    const address = server.address();
    assert.notEqual(address, null);
    assert.notEqual(typeof address, "string");
    const baseUrl = `http://127.0.0.1:${address.port}`;
    for (let index = 1; index <= API_ALERT_THRESHOLDS.minimumRequests + 1; index += 1) {
      await fetch(`${baseUrl}/api/telemetry-server-error`, {
        headers: { "X-Request-ID": `server-error-${index}` },
      });
    }
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    console.warn = originalWarn;
    console.error = originalError;
  }

  const alerts = warningLines.map((line) => JSON.parse(line)).filter(
    (event) => event.event === "http.alert",
  );
  assert.equal(alerts.length, 1);
  assert.deepEqual(alerts[0], {
    timestamp: alerts[0].timestamp,
    event: "http.alert",
    severity: "warn",
    correlationId: `server-error-${API_ALERT_THRESHOLDS.minimumRequests}`,
    requestId: `server-error-${API_ALERT_THRESHOLDS.minimumRequests}`,
    reason: "server_error_rate",
    count: API_ALERT_THRESHOLDS.minimumRequests,
    rate: 1,
    threshold: API_ALERT_THRESHOLDS.serverErrorRate,
  });
  assert.equal(JSON.stringify(alerts[0]).includes("telemetry-server-error"), false);
  assert.equal(errorLines.length, API_ALERT_THRESHOLDS.minimumRequests + 1);
});

test("latency alerts report p95 once without exposing request data", async () => {
  resetMetricsForTests();
  const warningLines: string[] = [];
  const originalWarn = console.warn;
  const originalLog = console.log;
  const originalHrtimeBigint = process.hrtime.bigint;
  let fakeNow = 0n;
  console.warn = (line?: unknown) => warningLines.push(String(line));
  console.log = () => {};
  process.hrtime.bigint = (() => {
    const current = fakeNow;
    fakeNow += BigInt(API_ALERT_THRESHOLDS.latencyP95Ms + 100) * 1_000_000n;
    return current;
  }) as typeof process.hrtime.bigint;

  const app = express();
  app.use(requestTelemetry);
  app.get("/api/telemetry-slow", (_req, res) => {
    res.status(200).json({ ok: true });
  });
  const server = await new Promise<Server>((resolve) => {
    const listeningServer = app.listen(0, () => resolve(listeningServer));
  });

  try {
    const address = server.address();
    assert.notEqual(address, null);
    assert.notEqual(typeof address, "string");
    const baseUrl = `http://127.0.0.1:${address.port}`;
    for (let index = 1; index <= API_ALERT_THRESHOLDS.minimumRequests + 1; index += 1) {
      await fetch(`${baseUrl}/api/telemetry-slow?secret=must-not-be-logged`, {
        headers: { "X-Request-ID": `latency-${index}` },
      });
    }
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    process.hrtime.bigint = originalHrtimeBigint;
    console.warn = originalWarn;
    console.log = originalLog;
  }

  const alerts = warningLines.map((line) => JSON.parse(line)).filter(
    (event) => event.event === "http.alert",
  );
  assert.equal(alerts.length, 1);
  assert.deepEqual(alerts[0], {
    timestamp: alerts[0].timestamp,
    event: "http.alert",
    severity: "warn",
    correlationId: `latency-${API_ALERT_THRESHOLDS.minimumRequests}`,
    requestId: `latency-${API_ALERT_THRESHOLDS.minimumRequests}`,
    reason: "latency_p95",
    count: API_ALERT_THRESHOLDS.minimumRequests,
    durationMs: API_ALERT_THRESHOLDS.latencyP95Ms + 100,
    threshold: API_ALERT_THRESHOLDS.latencyP95Ms,
  });
  assert.equal(JSON.stringify(alerts[0]).includes("must-not-be-logged"), false);
});