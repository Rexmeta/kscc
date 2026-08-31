import assert from "node:assert/strict";
import { test } from "node:test";
import express from "express";
import type { Server } from "node:http";
import {
  emitOperationalEvent,
  getMetricsSnapshot,
  requestTelemetry,
  resetMetricsForTests,
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