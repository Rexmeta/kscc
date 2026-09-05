CREATE TABLE IF NOT EXISTS "consent_evidence_access_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "admin_user_id" uuid,
  "subject_type" text NOT NULL,
  "subject_id" uuid NOT NULL,
  "action" text NOT NULL,
  "accessed_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "consent_evidence_access_log_subject_type_check"
    CHECK ("subject_type" IN ('account', 'inquiry')),
  CONSTRAINT "consent_evidence_access_log_action_check"
    CHECK ("action" IN ('view', 'export')),
  CONSTRAINT "consent_evidence_access_log_admin_user_id_users_id_fk"
    FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("id")
    ON DELETE set null ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "consent_evidence_access_log_subject_access_idx"
  ON "consent_evidence_access_log" USING btree ("subject_type", "subject_id", "accessed_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "consent_evidence_access_log_action_access_idx"
  ON "consent_evidence_access_log" USING btree ("action", "accessed_at" DESC);