import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const positiveInteger = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: positiveInteger(process.env.DB_POOL_MAX, 10),
  idleTimeoutMillis: positiveInteger(process.env.DB_IDLE_TIMEOUT_MS, 30_000),
  connectionTimeoutMillis: positiveInteger(process.env.DB_CONNECTION_TIMEOUT_MS, 10_000),
});
export const db = drizzle({ client: pool, schema });

const readinessTimeoutMs = 2_000;

/**
 * Check only the database connectivity needed for serving requests.
 * The timeout prevents a health probe from waiting on a stalled connection.
 */
export async function isDatabaseReady(): Promise<boolean> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      pool.query("select 1"),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error("database readiness check timed out")),
          readinessTimeoutMs,
        );
      }),
    ]);
    return true;
  } catch {
    return false;
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}
