ALTER TABLE "survey_settings_history"
  ADD COLUMN IF NOT EXISTS "changed_by_name" text;
--> statement-breakpoint
UPDATE "survey_settings_history" AS history
SET "changed_by_name" = COALESCE(editor."name", '알 수 없음')
FROM "users" AS editor
WHERE history."changed_by" = editor."id"
  AND history."changed_by_name" IS NULL;
--> statement-breakpoint
UPDATE "survey_settings_history"
SET "changed_by_name" = '알 수 없음'
WHERE "changed_by_name" IS NULL;
--> statement-breakpoint
ALTER TABLE "survey_settings_history"
  ALTER COLUMN "changed_by_name" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "survey_settings_history"
  DROP CONSTRAINT IF EXISTS "survey_settings_history_survey_settings_id_survey_settings_id_fk";
--> statement-breakpoint
ALTER TABLE "survey_settings_history"
  ADD CONSTRAINT "survey_settings_history_survey_settings_id_survey_settings_id_fk"
  FOREIGN KEY ("survey_settings_id") REFERENCES "public"."survey_settings"("id")
  ON DELETE restrict ON UPDATE no action;