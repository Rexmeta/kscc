ALTER TABLE "users"
  ALTER COLUMN "email" DROP NOT NULL,
  ALTER COLUMN "password" DROP NOT NULL;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "wechat_identities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "provider" text DEFAULT 'wechat' NOT NULL,
  "app_id" text NOT NULL,
  "open_id" text NOT NULL,
  "union_id" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "wechat_identities_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
    ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "wechat_identities_user_provider_unique"
  ON "wechat_identities" USING btree ("user_id", "provider");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "wechat_identities_app_open_id_unique"
  ON "wechat_identities" USING btree ("provider", "app_id", "open_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "wechat_identities_union_id_unique"
  ON "wechat_identities" USING btree ("provider", "union_id");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "auth_handoffs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "code_hash" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "consumed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "auth_handoffs_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
    ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "auth_handoffs_code_hash_unique"
  ON "auth_handoffs" USING btree ("code_hash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_handoffs_expires_at_idx"
  ON "auth_handoffs" USING btree ("expires_at");