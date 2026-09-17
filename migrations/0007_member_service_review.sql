CREATE TABLE IF NOT EXISTS "member_service_review_audits" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL REFERENCES "member_service_organizations"("id") ON DELETE CASCADE,
  "reviewer_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "decision" text NOT NULL,
  "evidence_url" text,
  "verification_date" timestamptz,
  "public_approved" boolean NOT NULL,
  "note" text,
  "before_state" jsonb,
  "after_state" jsonb,
  "correlation_id" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "member_service_review_audits_org_created_idx"
  ON "member_service_review_audits" ("organization_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "member_service_review_audits_reviewer_created_idx"
  ON "member_service_review_audits" ("reviewer_id", "created_at");