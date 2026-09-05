CREATE TABLE IF NOT EXISTS "consent_evidence" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid,
  "inquiry_id" uuid,
  "purpose" text NOT NULL,
  "policy_version" text NOT NULL,
  "consented_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "consent_evidence_one_subject_check" CHECK (
    (("user_id" IS NOT NULL)::integer + ("inquiry_id" IS NOT NULL)::integer) = 1
  ),
  CONSTRAINT "consent_evidence_purpose_subject_check" CHECK (
    (
      ("purpose" IN ('account_terms', 'account_privacy') AND "user_id" IS NOT NULL AND "inquiry_id" IS NULL)
      OR ("purpose" = 'inquiry_privacy' AND "user_id" IS NULL AND "inquiry_id" IS NOT NULL)
    )
  ),
  CONSTRAINT "consent_evidence_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
    ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "consent_evidence_inquiry_id_inquiries_id_fk"
    FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id")
    ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "consent_evidence_user_purpose_version_unique"
  ON "consent_evidence" USING btree ("user_id", "purpose", "policy_version");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "consent_evidence_inquiry_purpose_version_unique"
  ON "consent_evidence" USING btree ("inquiry_id", "purpose", "policy_version");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "consent_evidence_subject_date_idx"
  ON "consent_evidence" USING btree ("user_id", "inquiry_id", "consented_at");