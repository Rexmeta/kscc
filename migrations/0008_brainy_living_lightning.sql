CREATE TABLE IF NOT EXISTS "member_service_connection_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "requester_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "organization_id" uuid NOT NULL REFERENCES "member_service_organizations"("id") ON DELETE RESTRICT,
  "request_type" text NOT NULL,
  "purpose" text,
  "background" text,
  "industry" text,
  "item" text,
  "regions" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "desired_date" timestamptz,
  "language" "locale" NOT NULL DEFAULT 'ko',
  "disclosure_scope" jsonb NOT NULL,
  "consent_policy_version" text,
  "consented_at" timestamptz,
  "status" text NOT NULL DEFAULT 'draft',
  "idempotency_key" text,
  "assigned_operator_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "assigned_organization_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "submitted_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "member_service_connection_requests_status_check"
    CHECK ("status" IN ('draft', 'submitted', 'reviewing', 'assigned', 'in_progress', 'completed', 'closed', 'cancelled', 'rejected')),
  CONSTRAINT "member_service_connection_requests_disclosure_scope_object_check"
    CHECK (jsonb_typeof("disclosure_scope") = 'object')
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "member_service_connection_requests_requester_idempotency_unique"
  ON "member_service_connection_requests" ("requester_id", "idempotency_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "member_service_connection_requests_requester_status_idx"
  ON "member_service_connection_requests" ("requester_id", "status", "updated_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "member_service_connection_requests_organization_status_idx"
  ON "member_service_connection_requests" ("organization_id", "status", "updated_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "member_service_connection_requests_assigned_operator_idx"
  ON "member_service_connection_requests" ("assigned_operator_id", "status", "updated_at");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "member_service_connection_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "request_id" uuid NOT NULL REFERENCES "member_service_connection_requests"("id") ON DELETE CASCADE,
  "author_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "body" text NOT NULL,
  "disclosure_scope" jsonb NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "member_service_connection_messages_disclosure_scope_object_check"
    CHECK (jsonb_typeof("disclosure_scope") = 'object')
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "member_service_connection_messages_request_created_idx"
  ON "member_service_connection_messages" ("request_id", "created_at");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "member_service_attachments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "request_id" uuid NOT NULL REFERENCES "member_service_connection_requests"("id") ON DELETE CASCADE,
  "message_id" uuid REFERENCES "member_service_connection_messages"("id") ON DELETE SET NULL,
  "uploader_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "object_key" text NOT NULL,
  "file_name" text NOT NULL,
  "content_type" text NOT NULL,
  "size_bytes" integer NOT NULL,
  "disclosure_scope" jsonb NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "member_service_attachments_disclosure_scope_object_check"
    CHECK (jsonb_typeof("disclosure_scope") = 'object')
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "member_service_attachments_request_created_idx"
  ON "member_service_attachments" ("request_id", "created_at");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "member_service_audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "actor_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "action" text NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" uuid NOT NULL,
  "before" jsonb,
  "after" jsonb,
  "correlation_id" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "member_service_audit_logs_entity_created_idx"
  ON "member_service_audit_logs" ("entity_type", "entity_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "member_service_audit_logs_actor_created_idx"
  ON "member_service_audit_logs" ("actor_id", "created_at");