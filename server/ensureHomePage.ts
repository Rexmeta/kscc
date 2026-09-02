import { eq } from "drizzle-orm";
import { db, pool } from "./db";
import { postTranslations, posts } from "@shared/schema";
import { getDefaultHomeTranslation, HOME_LOCALES } from "@shared/homeContent";

export async function ensureHomePage() {
  let [home] = await db
    .select()
    .from(posts)
    .where(eq(posts.slug, "home"))
    .limit(1);

  if (home && home.postType !== "page") {
    throw new Error(`The reserved home slug belongs to a ${home.postType} post`);
  }

  if (!home) {
    [home] = await db
      .insert(posts)
      .values({
        postType: "page",
        status: "published",
        visibility: "public",
        slug: "home",
        primaryLocale: "ko",
        publishedAt: new Date(),
      })
      .onConflictDoNothing({ target: posts.slug })
      .returning();

    // A concurrent release may have created the row after the initial read.
    if (!home) {
      [home] = await db
        .select()
        .from(posts)
        .where(eq(posts.slug, "home"))
        .limit(1);
    }
  }

  if (!home) throw new Error("Unable to prepare the home page");

  for (const locale of HOME_LOCALES) {
    const translation = getDefaultHomeTranslation(locale);
    await db
      .insert(postTranslations)
      .values({
        postId: home.id,
        locale,
        ...translation,
      })
      .onConflictDoNothing({
        target: [postTranslations.postId, postTranslations.locale],
      });
  }

  return home;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  ensureHomePage()
    .then((home) => {
      console.log(`Home page is ready (${home.id}).`);
    })
    .catch((error) => {
      console.error("Failed to ensure home page:", error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await pool.end();
    });
}