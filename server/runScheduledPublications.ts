import { pool } from "./db";
import { runScheduledPublicationsOnce } from "./scheduledPublications";
import {
  CONSENT_EVIDENCE_ACCESS_LOG_RETENTION_YEARS,
} from "./consentEvidenceRetention";

async function main(): Promise<void> {
  try {
    const result = await runScheduledPublicationsOnce();
    console.log("[scheduled-publications] recovery_complete", JSON.stringify({
      ...result,
      consentEvidenceAccessLogRetentionYears:
        CONSENT_EVIDENCE_ACCESS_LOG_RETENTION_YEARS,
    }));
  } finally {
    await pool.end();
  }
}

void main();