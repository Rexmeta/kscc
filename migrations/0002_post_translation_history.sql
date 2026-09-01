CREATE TABLE IF NOT EXISTS "post_translation_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "post_id" uuid NOT NULL,
  "locale" "locale" NOT NULL,
  "changed_by" uuid,
  "changed_by_name" text NOT NULL,
  "changed_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "post_translation_history_post_id_posts_id_fk"
    FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id")
    ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "post_translation_history_changed_by_users_id_fk"
    FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id")
    ON DELETE set null ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "post_translation_history_post_locale_changed_at_idx"
  ON "post_translation_history" USING btree
  ("post_id", "locale", "changed_at" DESC NULLS LAST, "id" DESC NULLS LAST);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "post_translation_history_changed_at_idx"
  ON "post_translation_history" USING btree
  ("changed_at" DESC NULLS LAST, "id" DESC NULLS LAST);