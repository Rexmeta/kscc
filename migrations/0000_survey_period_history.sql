ALTER TABLE "survey_settings"
  ADD COLUMN IF NOT EXISTS "starts_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "survey_settings"
  ADD COLUMN IF NOT EXISTS "ends_at" timestamp with time zone;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "survey_settings_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "survey_settings_id" text NOT NULL,
  "version" integer NOT NULL,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "external_url" text,
  "is_active" boolean NOT NULL,
  "starts_at" timestamp with time zone,
  "ends_at" timestamp with time zone,
  "changed_by" uuid,
  "changed_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "survey_settings_history_survey_settings_id_survey_settings_id_fk"
    FOREIGN KEY ("survey_settings_id") REFERENCES "public"."survey_settings"("id")
    ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "survey_settings_history_changed_by_users_id_fk"
    FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id")
    ON DELETE set null ON UPDATE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "survey_settings_history_settings_version_unique"
  ON "survey_settings_history" USING btree ("survey_settings_id", "version");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "survey_settings_history_changed_at_idx"
  ON "survey_settings_history" USING btree ("survey_settings_id", "changed_at" DESC NULLS LAST, "version" DESC NULLS LAST, "id" DESC NULLS LAST);
--> statement-breakpoint
INSERT INTO "survey_settings_history" (
  "survey_settings_id",
  "version",
  "title",
  "description",
  "external_url",
  "is_active",
  "starts_at",
  "ends_at",
  "changed_by",
  "changed_at"
)
SELECT
  settings."id",
  1,
  settings."title",
  settings."description",
  settings."external_url",
  settings."is_active",
  settings."starts_at",
  settings."ends_at",
  settings."updated_by",
  COALESCE(settings."updated_at", settings."created_at", now())
FROM "survey_settings" AS settings
WHERE NOT EXISTS (
  SELECT 1
  FROM "survey_settings_history" AS history
  WHERE history."survey_settings_id" = settings."id"
);