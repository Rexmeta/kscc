import assert from "node:assert/strict";
import { test } from "node:test";
import express from "express";
import type { Server } from "node:http";
import { registerHealthRoutes } from "./health";

async function withServer(
  checkReadiness: () => Promise<boolean>,
  callback: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const app = express();
  registerHealthRoutes(app, checkReadiness);
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

test("liveness is available without checking dependencies", async () => {
  await withServer(
    async () => {
      throw new Error("database should not be checked by liveness");
    },
    async (baseUrl) => {
      const response = await fetch(`${baseUrl}/healthz`);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { status: "ok" });
    },
  );
});

test("readiness reports dependency failure without leaking details", async () => {
  await withServer(
    async () => false,
    async (baseUrl) => {
      const response = await fetch(`${baseUrl}/readyz`);
      assert.equal(response.status, 503);
      assert.deepEqual(await response.json(), { status: "not_ready" });
    },
  );

  await withServer(
    async () => {
      throw new Error("connection string must not be exposed");
    },
    async (baseUrl) => {
      const response = await fetch(`${baseUrl}/readyz`);
      assert.equal(response.status, 503);
      assert.deepEqual(await response.json(), { status: "not_ready" });
    },
  );
});

test("readiness returns ready only when dependencies respond", async () => {
  await withServer(
    async () => true,
    async (baseUrl) => {
      const response = await fetch(`${baseUrl}/readyz`);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { status: "ready" });
    },
  );
});