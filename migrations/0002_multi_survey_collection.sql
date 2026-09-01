ALTER TABLE "survey_settings"
  ADD COLUMN IF NOT EXISTS "display_order" integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "survey_settings_history"
  ADD COLUMN IF NOT EXISTS "display_order" integer NOT NULL DEFAULT 0;
--> statement-breakpoint
UPDATE "survey_settings_history" AS history
SET "display_order" = settings."display_order"
FROM "survey_settings" AS settings
WHERE history."survey_settings_id" = settings."id";