import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import { and, eq, inArray } from "drizzle-orm";
import {
  eventRegistrations,
  members,
  postTranslations,
  posts,
  users,
} from "@shared/schema";
import { canReadPost, publicPostAccess } from "./postAccess";
import { canAccessObject, ObjectPermission } from "./objectAcl";
import jwt from "jsonwebtoken";
import { getResourceObjectAclVisibility } from "./objectStorage";

const databaseAvailable = Boolean(process.env.DATABASE_URL);

const authTestAvailable = databaseAvailable && Boolean(process.env.SESSION_SECRET);

test("post visibility policy separates anonymous, member, premium, and admin callers", () => {
  const post = (visibility: "public" | "members" | "premium" | "internal", status: "draft" | "published" = "published") => ({
    status,
    visibility,
    publishedAt: new Date(Date.now() - 1_000),
    expiresAt: null,
  }) as any;
  const memberAccess = {
    ...publicPostAccess,
    userId: "member-user",
    canReadMembers: true,
  };
  const premiumAccess = {
    ...memberAccess,
    userId: "premium-user",
    canReadPremium: true,
  };
  const adminAccess = {
    ...premiumAccess,
    userId: "admin-user",
    isAdmin: true,
  };

  assert.equal(canReadPost(post("public"), publicPostAccess), true);
  assert.equal(canReadPost(post("members"), publicPostAccess), false);
  assert.equal(canReadPost(post("premium"), memberAccess), false);
  assert.equal(canReadPost(post("members"), memberAccess), true);
  assert.equal(canReadPost(post("premium"), premiumAccess), true);
  assert.equal(canReadPost(post("internal"), premiumAccess), false);
  assert.equal(canReadPost(post("draft"), adminAccess), true);
});

test("object reads fail closed without ACL metadata", async () => {
  const file = {
    async getMetadata() {
      return [{ metadata: {} }];
    },
  } as any;

  const publishedPost = (visibility: "public" | "members" | "premium") => ({
    status: "published",
    visibility,
  }) as any;
async function getDatabase() {
  const [{ db, pool }, { storage }] = await Promise.all([
    import("./db"),
    import("./storage"),
  ]);
  return { db, pool, storage };
}

if (databaseAvailable) {
  after(async () => {
    const { pool } = await getDatabase();
    await pool.end();
  });
}

async function createPost(
  db: Awaited<ReturnType<typeof getDatabase>>["db"],
  options: {
    primaryLocale?: "ko" | "en" | "zh";
    slugPrefix: string;
  },
) {
  const [post] = await db
    .insert(posts)
    .values({
      postType: "news",
      status: "published",
      visibility: "public",
      slug: `${options.slugPrefix}-${randomUUID()}`,
      primaryLocale: options.primaryLocale || "ko",
      publishedAt: new Date(),
    })
    .returning();
  return post;
}

test(
  "compact post lists select the requested locale and fall back to the primary locale",
  { skip: !databaseAvailable },
  async () => {
    const { db, storage } = await getDatabase();

    const initialUserCount = await storage.getUserCount();
    const requestedLocalePost = await createPost(db, { slugPrefix: "requested-locale" });
    const fallbackPost = await createPost(db, { slugPrefix: "primary-locale-fallback" });

    try {
      await db.insert(postTranslations).values([
        {
          postId: requestedLocalePost.id,
          locale: "ko",
          title: "한국어 제목",
          excerpt: "한국어 요약",
          content: "한국어 전체 본문",
        },
        {
          postId: requestedLocalePost.id,
          locale: "en",
          title: "English title",
          excerpt: "English summary",
          content: "English full article body",
        },
        {
          postId: fallbackPost.id,
          locale: "ko",
          title: "기본 제목",
          excerpt: "기본 요약",
          content: "기본 전체 본문",
        },
      ]);

      const result = await storage.getPosts({
        postType: "news",
        status: "published",
        locale: "en",
        compact: true,
        limit: 100,
      });
      const requestedLocale = result.posts.find((post) => post.id === requestedLocalePost.id);
      const fallback = result.posts.find((post) => post.id === fallbackPost.id);

      assert.ok(requestedLocale);
      assert.deepEqual(
        requestedLocale.translations.map((translation) => ({
          locale: translation.locale,
          title: translation.title,
        })),
        [{ locale: "en", title: "English title" }],
      );
      assert.equal(requestedLocale.translations[0].content, null);

      assert.ok(fallback);
      assert.deepEqual(
        fallback.translations.map((translation) => ({
          locale: translation.locale,
          title: translation.title,
        })),
        [{ locale: "ko", title: "기본 제목" }],
      );
      assert.equal(fallback.translations[0].content, null);
    } finally {
      await db.delete(postTranslations).where(eq(postTranslations.postId, requestedLocalePost.id));
      await db
        .delete(postTranslations)
        .where(eq(postTranslations.postId, fallbackPost.id));
      await db.delete(posts).where(eq(posts.id, requestedLocalePost.id));
      await db.delete(posts).where(eq(posts.id, fallbackPost.id));
    }
  },
);

test(
  "concurrent event registrations leave only one row for an event and user",
  { skip: !databaseAvailable },
  async () => {
    const { db, storage } = await getDatabase();

    const initialUserCount = await storage.getUserCount();
    const [event] = await db
      .insert(posts)
      .values({
        postType: "event",
        status: "published",
        visibility: "public",
        slug: `concurrent-registration-${randomUUID()}`,
        primaryLocale: "ko",
      })
      .returning();
    const [user] = await db
      .insert(users)
      .values({
        email: `registration-${randomUUID()}@example.test`,
        password: "test-password",
        name: "Registration Test User",
      })
      .returning();

    try {
      const attempts = await Promise.all(
        Array.from({ length: 16 }, () =>
          storage.createEventRegistration({
            eventId: event.id,
            userId: user.id,
            attendeeName: user.name,
            attendeeEmail: user.email,
          }),
        ),
      );
      const successfulInserts = attempts.filter(Boolean);
      const rows = await db
        .select()
        .from(eventRegistrations)
        .where(
          and(
            eq(eventRegistrations.eventId, event.id),
            eq(eventRegistrations.userId, user.id),
          ),
        );

      assert.equal(successfulInserts.length, 1);
      assert.equal(rows.length, 1);
    } finally {
      await db
        .delete(eventRegistrations)
        .where(
          and(
            eq(eventRegistrations.eventId, event.id),
            eq(eventRegistrations.userId, user.id),
          ),
        );
      await db.delete(posts).where(eq(posts.id, event.id));
      await db.delete(users).where(eq(users.id, user.id));
    }
  },
);

test(
  "member and post page sizes stay bounded for invalid and oversized limits",
  { skip: !databaseAvailable },
  async () => {
    const { db, storage } = await getDatabase();

    const initialUserCount = await storage.getUserCount();
    const seededPosts = await db
      .insert(posts)
      .values(
        Array.from({ length: 101 }, (_, index) => ({
          postType: "news" as const,
          status: "published" as const,
          visibility: "public" as const,
          slug: `pagination-post-${randomUUID()}-${index}`,
          primaryLocale: "ko" as const,
        })),
      )
      .returning({ id: posts.id });
    const seededMembers = await db
      .insert(members)
      .values(
        Array.from({ length: 51 }, (_, index) => ({
          companyName: `Pagination Test Company ${index}`,
          industry: "Testing",
          country: "Korea",
          city: "Seoul",
          address: "Test address",
          contactPerson: "Test contact",
          contactEmail: `pagination-${randomUUID()}-${index}@example.test`,
          isPublic: true,
        })),
      )
      .returning({ id: members.id });

    try {
      const memberResults = await Promise.all([
        storage.getMembers({ limit: 10_000 }),
        storage.getMembers({ limit: -10 }),
        storage.getMembers({ limit: Number.NaN }),
      ]);
      const postResults = await Promise.all([
        storage.getPosts({ limit: 10_000 }),
        storage.getPosts({ limit: -10 }),
        storage.getPosts({ limit: Number.NaN }),
      ]);

async function authorizeAdminWithToken(
  authenticateToken: typeof import("./routes")["authenticateToken"],
  requireAdmin: typeof import("./routes")["requireAdmin"],
  token: string,
): Promise<number> {
  return await new Promise((resolve, reject) => {
    const req = {
      headers: { authorization: `Bearer ${token}` },
    } as any;
    const res = {
      sendStatus: (status: number) => {
        resolve(status);
        return res;
      },
      status: (status: number) => ({
        json: () => resolve(status),
      }),
    } as any;

    authenticateToken(req, res, () => {
      requireAdmin(req, res, () => resolve(200));
    }).catch(reject);
  });
}

    try {
      assert.deepEqual(
        registrations.map((user) => user.role).sort(),
        ["admin", "member"],
      );
    } finally {
      await db.delete(users).where(
        inArray(users.id, registrations.map((user) => user.id)),
      );
    }
  },
);

    const [role] = await db
      .insert(roles)
      .values({
        code: `test-role-${randomUUID()}`,
        name: "ACL Test Role",
      })
      .returning();

    const [{ db, storage }, { getUserPermissions }] = await Promise.all([
      getDatabase(),
      import("./permissions"),
    ]);

    const [{ db, storage }, { authenticateToken, requireAdmin }] = await Promise.all([
      getDatabase(),
      import("./routes"),
    ]);

    const user = await storage.createUser({
      email: `acl-invalidation-${randomUUID()}@example.test`,
      password: "test-password",
      name: "ACL Invalidation Test User",
      role: "member",
      userType: "staff",
    });

      const [membership] = await db
        .insert(userMemberships)
        .values({
          userId: user.id,
          tierId: tier.id,
          roleId: role.id,
          expiresAt: new Date(Date.now() + 60_000),
        })
        .returning();

    const registrations = await Promise.all(
      Array.from({ length: 2 }, (_, index) =>
        storage.createUserForRegistration({
          email: `bootstrap-${randomUUID()}-${index}@example.test`,
          password: "test-password",
          name: `Bootstrap Test User ${index}`,
          userType: "staff",
        }),
      ),
    );

    const token = jwt.sign(
      { id: user.id, email: user.email, role: "admin" },
      process.env.SESSION_SECRET!,
      { expiresIn: "7d" },
    );

    const [tier] = await db
      .insert(tiers)
      .values({
        code: `test-tier-${randomUUID()}`,
        name: "ACL Test Tier",
      })
      .returning();

    const [permission] = await db
      .insert(permissions)
      .values({
        key: `test.permission.${randomUUID()}`,
        resource: "test",
        action: "read",
        description: "Permission used by the ACL invalidation regression",
      })
      .returning();
