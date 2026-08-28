import type { Express } from "express";

export const LIVENESS_PATH = "/healthz";
export const READINESS_PATH = "/readyz";

type ReadinessCheck = () => Promise<boolean>;

/**
 * Register probes that are safe to expose to a load balancer.
 *
 * Liveness intentionally has no dependency checks: a process that can answer
 * this endpoint is alive. Readiness is dependency-aware and must not include
 * the dependency error because it is an externally visible endpoint.
 */
export function registerHealthRoutes(
  app: Express,
  checkReadiness: ReadinessCheck,
): void {
  app.get(LIVENESS_PATH, (_req, res) => {
    res.set("Cache-Control", "no-store").status(200).json({ status: "ok" });
  });

  app.get(READINESS_PATH, async (_req, res) => {
    try {
      const ready = await checkReadiness();
      if (!ready) {
        return res
          .set("Cache-Control", "no-store")
          .status(503)
          .json({ status: "not_ready" });
      }

      return res
        .set("Cache-Control", "no-store")
        .status(200)
        .json({ status: "ready" });
    } catch {
      return res
        .set("Cache-Control", "no-store")
        .status(503)
        .json({ status: "not_ready" });
    }
  });
}