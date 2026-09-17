CREATE TABLE IF NOT EXISTS "member_service_organizations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "source_system" text NOT NULL,
  "source_record_key" text NOT NULL,
  "organization_type" text NOT NULL,
  "legal_form" text,
  "supervising_authority" text,
  "scope" text,
  "base_country" text NOT NULL,
  "base_region" text,
  "china_region_focus" text,
  "primary_domain" text,
  "summary_ko" text,
  "website_url" text,
  "contact_url" text,
  "verification_status" text NOT NULL,
  "source_type" text,
  "source_url" text,
  "last_verified_at" timestamptz,
  "next_review_at" timestamptz,
  "review_note" text,
  "is_active" boolean NOT NULL DEFAULT false,
  "public_approved" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "member_service_organizations_source_unique"
  ON "member_service_organizations" ("source_system", "source_record_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "member_service_organizations_public_lookup_idx"
  ON "member_service_organizations" ("public_approved", "is_active", "verification_status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "member_service_organizations_review_idx"
  ON "member_service_organizations" ("public_approved", "next_review_at");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "member_service_organization_localizations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL REFERENCES "member_service_organizations"("id") ON DELETE CASCADE,
  "locale" "locale" NOT NULL,
  "official_name" text NOT NULL,
  "display_name" text,
  "summary" text,
  "is_official" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "member_service_organization_localizations_org_locale_unique"
  ON "member_service_organization_localizations" ("organization_id", "locale");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "member_service_organization_localizations_name_lookup_idx"
  ON "member_service_organization_localizations" ("locale", "official_name");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "member_service_services" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" text NOT NULL UNIQUE,
  "name_ko" text NOT NULL,
  "name_en" text,
  "name_zh" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "member_service_organization_services" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL REFERENCES "member_service_organizations"("id") ON DELETE CASCADE,
  "service_id" uuid NOT NULL REFERENCES "member_service_services"("id") ON DELETE RESTRICT,
  "raw_value" text,
  "is_approved" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "member_service_organization_services_unique"
  ON "member_service_organization_services" ("organization_id", "service_id");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "member_service_regions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" text NOT NULL UNIQUE,
  "country_code" text NOT NULL,
  "name_ko" text NOT NULL,
  "name_en" text,
  "name_zh" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "member_service_organization_regions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL REFERENCES "member_service_organizations"("id") ON DELETE CASCADE,
  "region_id" uuid NOT NULL REFERENCES "member_service_regions"("id") ON DELETE RESTRICT,
  "relation_scope" text NOT NULL DEFAULT 'focus',
  "raw_value" text,
  "is_approved" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "member_service_organization_regions_unique"
  ON "member_service_organization_regions" ("organization_id", "region_id", "relation_scope");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "member_service_organization_contacts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL REFERENCES "member_service_organizations"("id") ON DELETE CASCADE,
  "contact_type" text NOT NULL,
  "label" text,
  "value" text NOT NULL,
  "is_public" boolean NOT NULL DEFAULT false,
  "verified_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "member_service_import_batches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "source_system" text NOT NULL,
  "source_file_name" text,
  "source_file_hash" text,
  "status" text NOT NULL DEFAULT 'staged',
  "imported_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "completed_at" timestamptz
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "member_service_import_batches_source_hash_unique"
  ON "member_service_import_batches" ("source_system", "source_file_hash");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "member_service_import_rows" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "batch_id" uuid NOT NULL REFERENCES "member_service_import_batches"("id") ON DELETE CASCADE,
  "source_record_key" text NOT NULL,
  "raw_data" jsonb NOT NULL,
  "status" text NOT NULL DEFAULT 'needs_review',
  "reason_codes" jsonb,
  "organization_id" uuid REFERENCES "member_service_organizations"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "member_service_import_rows_batch_record_unique"
  ON "member_service_import_rows" ("batch_id", "source_record_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "member_service_import_rows_review_queue_idx"
  ON "member_service_import_rows" ("status", "created_at");