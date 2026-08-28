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
  postMeta,
  postTranslations,
  posts,
  rolePermissions,
  roles,
  tiers,
  userMemberships,
  users,
} from "@shared/schema";
import { getPostPermissionKey } from "./postPermissions";
import { AuthorizationStateError, EventRegistrationError } from "./storage";

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
  "event registration enforces publication, timing, closure, capacity, and server-owned state",
  { skip: !databaseAvailable },
  async () => {
    const { db, storage } = await getDatabase();
    const eventIds: string[] = [];
    const userIds: string[] = [];
    const now = Date.now();

    const createEvent = async (options: {
      status?: "draft" | "published" | "archived";
      publishedAt?: Date | null;
      expiresAt?: Date | null;
      eventDate?: Date;
      registrationDeadline?: Date;
      capacity?: number;
      closed?: boolean;
    } = {}) => {
      const [event] = await db
        .insert(posts)
        .values({
          postType: "event",
          status: options.status || "published",
          visibility: "public",
          slug: `registration-rules-${randomUUID()}`,
          primaryLocale: "ko",
          publishedAt: options.publishedAt === undefined
            ? new Date(now - 60_000)
            : options.publishedAt,
          expiresAt: options.expiresAt,
        })
        .returning();
      eventIds.push(event.id);

      const meta = [
        {
          postId: event.id,
          key: "event.eventDate",
          valueTimestamp: options.eventDate || new Date(now + 3_600_000),
        },
        ...(options.registrationDeadline
          ? [{
              postId: event.id,
              key: "event.registrationDeadline",
              valueTimestamp: options.registrationDeadline,
            }]
          : []),
        ...(options.capacity !== undefined
          ? [{
              postId: event.id,
              key: "event.capacity",
              valueNumber: options.capacity,
            }]
          : []),
        ...(options.closed
          ? [{
              postId: event.id,
              key: "event.registrationClosed",
              valueBoolean: true,
            }]
          : []),
      ];
      await db.insert(postMeta).values(meta as any);
      return event;
    };

    const createUser = async () => {
      const [user] = await db
        .insert(users)
        .values({
          email: `event-rules-${randomUUID()}@example.test`,
          password: "test-password",
          name: "Event Rules Test User",
        })
        .returning();
      userIds.push(user.id);
      return user;
    };

    const assertRejected = async (
      eventOptions: Parameters<typeof createEvent>[0],
      code: EventRegistrationError["code"],
    ) => {
      const event = await createEvent(eventOptions);
      const user = await createUser();
      await assert.rejects(
        () => storage.registerForEvent({
          eventId: event.id,
          userId: user.id,
          attendeeName: user.name,
          attendeeEmail: user.email,
        }),
        (error: unknown) =>
          error instanceof EventRegistrationError && error.code === code,
      );
    };

    try {
      await assertRejected({ status: "draft" }, "EVENT_NOT_PUBLISHED");
      await assertRejected(
        { publishedAt: new Date(now + 60_000) },
        "EVENT_NOT_PUBLISHED",
      );
      await assertRejected(
        { expiresAt: new Date(now - 60_000) },
        "EVENT_EXPIRED",
      );
      await assertRejected(
        { eventDate: new Date(now - 60_000) },
        "EVENT_NOT_STARTED",
      );
      await assertRejected(
        { registrationDeadline: new Date(now - 60_000) },
        "EVENT_CLOSED",
      );
      await assertRejected({ closed: true }, "EVENT_CLOSED");

      const event = await createEvent({ capacity: 1 });
      const firstUser = await createUser();
      const secondUser = await createUser();
      const firstRegistration = await storage.registerForEvent({
        eventId: event.id,
        userId: firstUser.id,
        attendeeName: "Submitted name",
        attendeeEmail: "submitted@example.test",
        status: "attended",
        paymentStatus: "paid",
      });
      assert.equal(firstRegistration.status, "registered");
      assert.equal(firstRegistration.paymentStatus, "free");

      await assert.rejects(
        () => storage.registerForEvent({
          eventId: event.id,
          userId: secondUser.id,
          attendeeName: secondUser.name,
          attendeeEmail: secondUser.email,
        }),
        (error: unknown) =>
          error instanceof EventRegistrationError &&
          error.code === "EVENT_CAPACITY_REACHED",
      );
      await assert.rejects(
        () => storage.registerForEvent({
          eventId: event.id,
          userId: firstUser.id,
          attendeeName: firstUser.name,
          attendeeEmail: firstUser.email,
        }),
        (error: unknown) =>
          error instanceof EventRegistrationError &&
          error.code === "REGISTRATION_DUPLICATE",
      );

      const concurrentEvent = await createEvent({ capacity: 1 });
      const concurrentUsers = await Promise.all([createUser(), createUser()]);
      const concurrentResults = await Promise.allSettled(
        concurrentUsers.map((user) => storage.registerForEvent({
          eventId: concurrentEvent.id,
          userId: user.id,
          attendeeName: user.name,
          attendeeEmail: user.email,
        })),
      );
      assert.equal(
        concurrentResults.filter((result) => result.status === "fulfilled").length,
        1,
      );
      assert.equal(
        concurrentResults.filter(
          (result) =>
            result.status === "rejected" &&
            result.reason instanceof EventRegistrationError &&
            result.reason.code === "EVENT_CAPACITY_REACHED",
        ).length,
        1,
      );

      const cancelled = await storage.cancelEventRegistration(
        firstRegistration.id,
        firstUser.id,
      );
      assert.equal(cancelled.status, "cancelled");

      const secondRegistration = await storage.registerForEvent({
        eventId: event.id,
        userId: secondUser.id,
        attendeeName: secondUser.name,
        attendeeEmail: secondUser.email,
      });
      assert.equal(secondRegistration.status, "registered");

      await assert.rejects(
        () => storage.registerForEvent({
          eventId: event.id,
          userId: firstUser.id,
          attendeeName: firstUser.name,
          attendeeEmail: firstUser.email,
        }),
        (error: unknown) =>
          error instanceof EventRegistrationError &&
          error.code === "EVENT_CAPACITY_REACHED",
      );
    } finally {
      if (eventIds.length > 0) {
        await db.delete(eventRegistrations).where(inArray(eventRegistrations.eventId, eventIds));
        await db.delete(postMeta).where(inArray(postMeta.postId, eventIds));
        await db.delete(posts).where(inArray(posts.id, eventIds));
      }
      if (userIds.length > 0) {
        await db.delete(users).where(inArray(users.id, userIds));
      }
    }
  },
);


test(
  "registration and authorization mutations keep account and ACL state aligned",
  { skip: !databaseAvailable },
  async () => {
    const { db, storage } = await getDatabase();
    const [{ getUserPermissions }] = await Promise.all([
      import("./permissions"),
    ]);
    const suffix = randomUUID();
    const [memberRole] = await db
      .select()
      .from(roles)
      .where(eq(roles.code, "member"))
      .limit(1);
    const [operatorRole] = await db
      .select()
      .from(roles)
      .where(eq(roles.code, "operator"))
      .limit(1);
    const [adminRole] = await db
      .select()
      .from(roles)
      .where(eq(roles.code, "admin"))
      .limit(1);
    const [memberTier] = await db
      .select()
      .from(tiers)
      .where(eq(tiers.code, "MEMBER"))
      .limit(1);

    assert.ok(memberRole, "ACL seed must include the member role");
    assert.ok(operatorRole, "ACL seed must include the operator role");
    assert.ok(adminRole, "ACL seed must include the admin role");
    assert.ok(memberTier, "ACL seed must include the MEMBER tier");

    const user = await storage.createUserForRegistration({
      email: `authorization-sync-${suffix}@example.test`,
      password: "test-password",
      name: "Authorization Sync Test",
      userType: "staff",
    });

    try {
      const initialPermissions = await getUserPermissions(user.id);
      assert.equal(user.role, "user");
      assert.equal(initialPermissions.has("system.dashboard"), false);

      const updatedByMembership = await storage.updateUserMembership(
        user.id,
        memberTier.id,
        operatorRole.id,
      );
      assert.equal(updatedByMembership?.role, "operator");
      assert.equal((await getUserPermissions(user.id)).has("system.dashboard"), true);

      await assert.rejects(
        () => storage.updateUserMembership(user.id, randomUUID(), randomUUID()),
        AuthorizationStateError,
      );
      const unchangedMemberships = await db
        .select({ roleId: userMemberships.roleId })
        .from(userMemberships)
        .where(and(
          eq(userMemberships.userId, user.id),
          eq(userMemberships.isActive, true),
        ));
      assert.deepEqual(unchangedMemberships, [{ roleId: operatorRole.id }]);

      const demoted = await storage.updateUserAuthorization(user.id, {}, "user");
      assert.equal(demoted?.role, "user");
      assert.equal((await getUserPermissions(user.id)).has("system.dashboard"), false);
      assert.equal((await getUserPermissions(user.id)).has("member.read"), true);

      await storage.updateUserAuthorization(user.id, { isActive: false });
      assert.equal((await getUserPermissions(user.id)).size, 0);
      const inactiveMemberships = await db
        .select()
        .from(userMemberships)
        .where(and(
          eq(userMemberships.userId, user.id),
          eq(userMemberships.isActive, true),
        ));
      assert.equal(inactiveMemberships.length, 0);

      await storage.updateUserAuthorization(user.id, { isActive: true });
      const reactivated = await storage.getUser(user.id);
      assert.equal(reactivated?.role, "user");
      assert.equal((await getUserPermissions(user.id)).has("member.read"), true);

      const bootstrapped = await storage.bootstrapAdmin(user.email);
      assert.equal(bootstrapped.role, "admin");
      assert.equal((await getUserPermissions(user.id)).has("system.dashboard"), true);
      await storage.bootstrapAdmin(user.email);
      const activeAdminMemberships = await db
        .select()
        .from(userMemberships)
        .where(and(
          eq(userMemberships.userId, user.id),
          eq(userMemberships.isActive, true),
        ));
      assert.equal(activeAdminMemberships.length, 1);
      const finalUser = await storage.getUser(user.id);
      assert.equal(finalUser?.role, "admin");
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
    }
  },
);

test(
  "event registration enforces publication, timing, closure, capacity, and server-owned state",
  { skip: !databaseAvailable },
  async () => {
    const { db, storage } = await getDatabase();
    const eventIds: string[] = [];
    const userIds: string[] = [];
    const now = Date.now();

    const createEvent = async (options: {
      status?: "draft" | "published" | "archived";
      publishedAt?: Date | null;
      expiresAt?: Date | null;
      eventDate?: Date;
      registrationDeadline?: Date;
      capacity?: number;
      closed?: boolean;
    } = {}) => {
      const [event] = await db
        .insert(posts)
        .values({
          postType: "event",
          status: options.status || "published",
          visibility: "public",
          slug: `registration-rules-${randomUUID()}`,
          primaryLocale: "ko",
          publishedAt: options.publishedAt === undefined
            ? new Date(now - 60_000)
            : options.publishedAt,
          expiresAt: options.expiresAt,
        })
        .returning();
      eventIds.push(event.id);

      const meta = [
        {
          postId: event.id,
          key: "event.eventDate",
          valueTimestamp: options.eventDate || new Date(now + 3_600_000),
        },
        ...(options.registrationDeadline
          ? [{
              postId: event.id,
              key: "event.registrationDeadline",
              valueTimestamp: options.registrationDeadline,
            }]
          : []),
        ...(options.capacity !== undefined
          ? [{
              postId: event.id,
              key: "event.capacity",
              valueNumber: options.capacity,
            }]
          : []),
        ...(options.closed
          ? [{
              postId: event.id,
              key: "event.registrationClosed",
              valueBoolean: true,
            }]
          : []),
      ];
      await db.insert(postMeta).values(meta as any);
      return event;
    };

    const createUser = async () => {
      const [user] = await db
        .insert(users)
        .values({
          email: `event-rules-${randomUUID()}@example.test`,
          password: "test-password",
          name: "Event Rules Test User",
        })
        .returning();
      userIds.push(user.id);
      return user;
    };

    const assertRejected = async (
      eventOptions: Parameters<typeof createEvent>[0],
      code: EventRegistrationError["code"],
    ) => {
      const event = await createEvent(eventOptions);
      const user = await createUser();
      await assert.rejects(
        () => storage.registerForEvent({
          eventId: event.id,
          userId: user.id,
          attendeeName: user.name,
          attendeeEmail: user.email,
        }),
        (error: unknown) =>
          error instanceof EventRegistrationError && error.code === code,
      );
    };

    try {
      await assertRejected({ status: "draft" }, "EVENT_NOT_PUBLISHED");
      await assertRejected(
        { publishedAt: new Date(now + 60_000) },
        "EVENT_NOT_PUBLISHED",
      );
      await assertRejected(
        { expiresAt: new Date(now - 60_000) },
        "EVENT_EXPIRED",
      );
      await assertRejected(
        { eventDate: new Date(now - 60_000) },
        "EVENT_NOT_STARTED",
      );
      await assertRejected(
        { registrationDeadline: new Date(now - 60_000) },
        "EVENT_CLOSED",
      );
      await assertRejected({ closed: true }, "EVENT_CLOSED");

      const event = await createEvent({ capacity: 1 });
      const firstUser = await createUser();
      const secondUser = await createUser();
      const firstRegistration = await storage.registerForEvent({
        eventId: event.id,
        userId: firstUser.id,
        attendeeName: "Submitted name",
        attendeeEmail: "submitted@example.test",
        status: "attended",
        paymentStatus: "paid",
      });
      assert.equal(firstRegistration.status, "registered");
      assert.equal(firstRegistration.paymentStatus, "free");

      await assert.rejects(
        () => storage.registerForEvent({
          eventId: event.id,
          userId: secondUser.id,
          attendeeName: secondUser.name,
          attendeeEmail: secondUser.email,
        }),
        (error: unknown) =>
          error instanceof EventRegistrationError &&
          error.code === "EVENT_CAPACITY_REACHED",
      );
      await assert.rejects(
        () => storage.registerForEvent({
          eventId: event.id,
          userId: firstUser.id,
          attendeeName: firstUser.name,
          attendeeEmail: firstUser.email,
        }),
        (error: unknown) =>
          error instanceof EventRegistrationError &&
          error.code === "REGISTRATION_DUPLICATE",
      );

      const concurrentEvent = await createEvent({ capacity: 1 });
      const concurrentUsers = await Promise.all([createUser(), createUser()]);
      const concurrentResults = await Promise.allSettled(
        concurrentUsers.map((user) => storage.registerForEvent({
          eventId: concurrentEvent.id,
          userId: user.id,
          attendeeName: user.name,
          attendeeEmail: user.email,
        })),
      );
      assert.equal(
        concurrentResults.filter((result) => result.status === "fulfilled").length,
        1,
      );
      assert.equal(
        concurrentResults.filter(
          (result) =>
            result.status === "rejected" &&
            result.reason instanceof EventRegistrationError &&
            result.reason.code === "EVENT_CAPACITY_REACHED",
        ).length,
        1,
      );

      const cancelled = await storage.cancelEventRegistration(
        firstRegistration.id,
        firstUser.id,
      );
      assert.equal(cancelled.status, "cancelled");

      const secondRegistration = await storage.registerForEvent({
        eventId: event.id,
        userId: secondUser.id,
        attendeeName: secondUser.name,
        attendeeEmail: secondUser.email,
      });
      assert.equal(secondRegistration.status, "registered");

      await assert.rejects(
        () => storage.registerForEvent({
          eventId: event.id,
          userId: firstUser.id,
          attendeeName: firstUser.name,
          attendeeEmail: firstUser.email,
        }),
        (error: unknown) =>
          error instanceof EventRegistrationError &&
          error.code === "EVENT_CAPACITY_REACHED",
      );
    } finally {
      if (eventIds.length > 0) {
        await db.delete(eventRegistrations).where(inArray(eventRegistrations.eventId, eventIds));
        await db.delete(postMeta).where(inArray(postMeta.postId, eventIds));
        await db.delete(posts).where(inArray(posts.id, eventIds));
      }
      if (userIds.length > 0) {
        await db.delete(users).where(inArray(users.id, userIds));
      }
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
test(
  "complete post edits replace stale metadata and roll back for news, events, and resources",
  { skip: !databaseAvailable },
  async () => {
    const { db, storage } = await getDatabase();
    const postTypes = ["news", "event", "resource"] as const;
    const seededPosts = await db
      .insert(posts)
      .values(
        postTypes.map((postType) => ({
          postType,
          status: "draft" as const,
          visibility: "public" as const,
          slug: `atomic-edit-${postType}-${randomUUID()}`,
          primaryLocale: "ko" as const,
        })),
      )
      .returning();

    try {
      await db.insert(postTranslations).values(
        seededPosts.map((post) => ({
          postId: post.id,
          locale: "ko" as const,
          title: `${post.postType} old title`,
          excerpt: "old excerpt",
          content: "old content",
        })),
      );
      await db.insert(postMeta).values(
        seededPosts.flatMap((post) => [
          {
            postId: post.id,
            key: `${post.postType}.old`,
            valueText: "stale value",
          },
          ...(post.postType === "resource"
            ? [{
              postId: post.id,
              key: "resource.fileUrl",
              valueText: "/objects/old-resource-file",
            }]
            : []),
        ]),
      );

      for (const post of seededPosts) {
        const updated = await storage.updatePostComplete(
          post.id,
          { status: "published", publishedAt: new Date(), visibility: "public" },
          {
            postId: post.id,
            locale: "ko",
            title: `${post.postType} new title`,
            excerpt: "new excerpt",
            content: "new content",
          },
          [{
            key: `${post.postType}.current`,
            value: "current value",
          }, ...(post.postType === "resource"
            ? [{
              key: "resource.fileUrl",
              value: "/objects/new-resource-file",
            }]
            : [])],
        );

        assert.equal(updated?.status, "published");
        assert.equal(
          (await storage.getPostTranslation(post.id, "ko"))?.title,
          `${post.postType} new title`,
        );
        const currentMeta = await storage.getPostMetaAll(post.id);
        assert.deepEqual(
          currentMeta.map(({ key, valueText }) => ({ key, valueText })),
          [
            { key: `${post.postType}.current`, valueText: "current value" },
            ...(post.postType === "resource"
              ? [{ key: "resource.fileUrl", valueText: "/objects/new-resource-file" }]
              : []),
          ],
        );
        if (post.postType === "resource") {
          assert.equal(await storage.getPostByObjectPath("/objects/old-resource-file"), undefined);
          assert.equal((await storage.getPostByObjectPath("/objects/new-resource-file"))?.id, post.id);
        }

        await assert.rejects(
          storage.updatePostComplete(
            post.id,
            { status: "draft", visibility: "members" },
            {
              postId: post.id,
              locale: "invalid" as any,
              title: "should not persist",
              excerpt: "should not persist",
              content: "should not persist",
            },
            [{ key: `${post.postType}.replacement`, value: "should not persist" }],
          ),
        );

        const unchanged = await storage.getPost(post.id);
        assert.equal(unchanged?.status, "published");
        assert.equal(unchanged?.visibility, "public");
        assert.equal(
          (await storage.getPostTranslation(post.id, "ko"))?.title,
          `${post.postType} new title`,
        );
        assert.deepEqual(
          (await storage.getPostMetaAll(post.id)).map(({ key }) => key).sort(),
          [
            `${post.postType}.current`,
            ...(post.postType === "resource" ? ["resource.fileUrl"] : []),
          ].sort(),
        );
      }
    } finally {
      await db.delete(posts).where(inArray(posts.id, seededPosts.map(({ id }) => id)));
    }
  },
);
