ALTER TABLE "consent_evidence_access_log"
  ADD COLUMN IF NOT EXISTS "retention_hold_until" timestamp with time zone;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "consent_evidence_access_log_retention_cleanup_idx"
  ON "consent_evidence_access_log" USING btree ("accessed_at", "retention_hold_until");