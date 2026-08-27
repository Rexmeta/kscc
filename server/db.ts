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
