import { pool } from "./db";
import { runScheduledPublicationsOnce } from "./scheduledPublications";

async function main(): Promise<void> {
  try {
    const result = await runScheduledPublicationsOnce();
    console.log("[scheduled-publications] recovery_complete", JSON.stringify(result));
  } finally {
    await pool.end();
  }
}

void main();