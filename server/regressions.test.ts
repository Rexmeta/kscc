import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import express from "express";
import jwt from "jsonwebtoken";
import { and, eq, inArray } from "drizzle-orm";
import {
  eventRegistrations,
  members,
  permissions,
  postTranslations,
  posts,
  rolePermissions,
  roles,
  tiers,
  userMemberships,
  users,
} from "@shared/schema";
import { getPostPermissionKey } from "./postPermissions";

const databaseAvailable = Boolean(process.env.DATABASE_URL);

test("managed post actions map to their scoped ACL permissions", () => {
  assert.equal(getPostPermissionKey("news", "read"), "news.read");
  assert.equal(getPostPermissionKey("news", "publish"), "news.publish");
  assert.equal(getPostPermissionKey("event", "create"), "event.create");
  assert.equal(getPostPermissionKey("event", "attendeeManage"), "event.attendee.manage");
  assert.equal(getPostPermissionKey("resource", "create"), "resource.upload");
  assert.equal(getPostPermissionKey("resource", "delete"), "resource.delete");
  assert.equal(getPostPermissionKey("page", "read"), undefined);
  assert.equal(getPostPermissionKey("news", "attendeeManage"), undefined);
});

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
  "effective ACL changes are reflected without a process restart",
  { skip: !databaseAvailable },
  async () => {
    const { db, storage } = await getDatabase();
    const [{ getUserPermissions }] = await Promise.all([
      import("./permissions"),
    ]);
    const suffix = randomUUID();
    const user = await storage.createUser({
      email: `operator-acl-${suffix}@example.test`,
      password: "test-password",
      name: "Operator ACL Test",
      role: "operator",
      userType: "staff",
    });
    const [tier] = await db.insert(tiers).values({
      code: `test-tier-${suffix}`,
      name: "Operator ACL Test Tier",
    }).returning();
    const [role] = await db.insert(roles).values({
      code: `test-role-${suffix}`,
      name: "Operator ACL Test Role",
    }).returning();
    const [permission] = await db.insert(permissions).values({
      key: `inquiry.read.${suffix}`,
      resource: "inquiry",
      action: "read",
      description: "Operator ACL regression permission",
    }).returning();
    await db.insert(rolePermissions).values({
      roleId: role.id,
      permissionId: permission.id,
    });
    const [membership] = await db.insert(userMemberships).values({
      userId: user.id,
      tierId: tier.id,
      roleId: role.id,
      expiresAt: new Date(Date.now() + 60_000),
    }).returning();

    try {
      assert.equal((await getUserPermissions(user.id)).has(permission.key), true);

      await db.update(userMemberships)
        .set({ isActive: false })
        .where(eq(userMemberships.id, membership.id));
      assert.equal((await getUserPermissions(user.id)).has(permission.key), false);

      await db.update(userMemberships)
        .set({ isActive: true })
        .where(eq(userMemberships.id, membership.id));
      await db.update(userMemberships)
        .set({ startedAt: new Date(Date.now() + 60_000) })
        .where(eq(userMemberships.id, membership.id));
      assert.equal((await getUserPermissions(user.id)).has(permission.key), false);

      await db.update(userMemberships)
        .set({ startedAt: new Date(Date.now() - 60_000) })
        .where(eq(userMemberships.id, membership.id));
      await db.update(users)
        .set({ isActive: false })
        .where(eq(users.id, user.id));
      assert.equal((await getUserPermissions(user.id)).has(permission.key), false);
    } finally {
      await db.delete(userMemberships).where(eq(userMemberships.id, membership.id));
      await db.delete(rolePermissions).where(eq(rolePermissions.roleId, role.id));
      await db.delete(permissions).where(eq(permissions.id, permission.id));
      await db.delete(users).where(eq(users.id, user.id));
      await db.delete(roles).where(eq(roles.id, role.id));
      await db.delete(tiers).where(eq(tiers.id, tier.id));
    }
  },
);


test(
  "compact post lists select the requested locale and fall back to the primary locale",
  { skip: !databaseAvailable },
  async () => {
    const { db, storage } = await getDatabase();
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
      await db.delete(postTranslations).where(eq(postTranslations.postId, fallbackPost.id));
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

      assert.equal(memberResults[0].members.length, 50);
      assert.equal(memberResults[1].members.length, 1);
      assert.equal(memberResults[2].members.length, 50);
      assert.equal(postResults[0].posts.length, 100);
      assert.equal(postResults[1].posts.length, 1);
      assert.equal(postResults[2].posts.length, 50);
    } finally {
      await db.delete(members).where(inArray(members.id, seededMembers.map(({ id }) => id)));
      await db.delete(posts).where(inArray(posts.id, seededPosts.map(({ id }) => id)));
    }
  },
);

test(
  "organization member endpoints keep inactive records private",
  { skip: !databaseAvailable },
  async () => {
    const originalSessionSecret = process.env.SESSION_SECRET;
    if (!process.env.SESSION_SECRET) {
      process.env.SESSION_SECRET = `organization-member-test-${randomUUID()}`;
    }
    const [{ registerRoutes }, { storage }] = await Promise.all([
      import("./routes"),
      import("./storage"),
    ]);
    const activeMember = {
      id: randomUUID(),
      name: "Active Executive",
      position: "Executive",
      category: "executives",
      isActive: true,
    };
    const inactiveMember = {
      id: randomUUID(),
      name: "Retired Executive",
      position: "Executive",
      category: "executives",
      isActive: false,
    };
    const adminUserId = randomUUID();
    const originalGetUser = storage.getUser;
    const originalGetOrganizationMembers = storage.getOrganizationMembers;
    const originalGetOrganizationMember = storage.getOrganizationMember;

    storage.getUser = async (id) =>
      id === adminUserId
        ? ({
            id: adminUserId,
            email: "organization-admin@example.test",
            name: "Organization Admin",
            role: "admin",
            userType: "staff",
            membershipTier: "free",
            isActive: true,
          } as any)
        : undefined;
    storage.getOrganizationMembers = async (filters) =>
      filters?.isActive === true ? [activeMember as any] : [activeMember as any, inactiveMember as any];
    storage.getOrganizationMember = async (id) => {
      if (id === activeMember.id) return activeMember as any;
      if (id === inactiveMember.id) return inactiveMember as any;
      return undefined;
    };

    const app = express();
    const server = await registerRoutes(app);
    try {
      await new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, resolve);
      });
      const address = server.address();
      assert.ok(address && typeof address !== "string");
      const baseUrl = `http://127.0.0.1:${address.port}`;
      const adminToken = jwt.sign({ id: adminUserId }, process.env.SESSION_SECRET!);
      const request = async (path: string, token?: string) => {
        const response = await fetch(`${baseUrl}${path}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        return { status: response.status, body: await response.json() };
      };

      const publicList = await request("/api/organization-members?isActive=true");
      assert.equal(publicList.status, 200);
      assert.deepEqual(publicList.body.map((member: any) => member.id), [activeMember.id]);

      const inactiveListAttempt = await request("/api/organization-members?isActive=false");
      assert.equal(inactiveListAttempt.status, 403);

      const invalidFilter = await request("/api/organization-members?isActive=all");
      assert.equal(invalidFilter.status, 400);

      const publicActiveDetail = await request(`/api/organization-members/${activeMember.id}`);
      assert.equal(publicActiveDetail.status, 200);
      assert.equal(publicActiveDetail.body.id, activeMember.id);

      const publicInactiveDetail = await request(`/api/organization-members/${inactiveMember.id}`);
      assert.equal(publicInactiveDetail.status, 404);

      const invalidId = await request("/api/organization-members/not-a-uuid");
      assert.equal(invalidId.status, 400);

      const adminList = await request("/api/organization-members?isActive=false", adminToken);
      assert.equal(adminList.status, 200);
      assert.deepEqual(
        adminList.body.map((member: any) => member.id),
        [activeMember.id, inactiveMember.id],
      );

      const adminInactiveDetail = await request(
        `/api/organization-members/${inactiveMember.id}`,
        adminToken,
      );
      assert.equal(adminInactiveDetail.status, 200);
      assert.equal(adminInactiveDetail.body.id, inactiveMember.id);
    } finally {
      storage.getUser = originalGetUser;
      storage.getOrganizationMembers = originalGetOrganizationMembers;
      storage.getOrganizationMember = originalGetOrganizationMember;
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      if (originalSessionSecret === undefined) {
        delete process.env.SESSION_SECRET;
      } else {
        process.env.SESSION_SECRET = originalSessionSecret;
      }
    }
  },
);