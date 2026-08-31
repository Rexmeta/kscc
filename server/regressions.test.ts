import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import express from "express";
import jwt from "jsonwebtoken";
import { and, eq, inArray } from "drizzle-orm";
import {
  eventRegistrations,
  insertInquiryReplySchema,
  insertInquirySchema,
  inquiries,
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
import { canReadPost, publicPostAccess, type PostAccessContext } from "./postAccess";
import {
  AuthorizationStateError,
  DuplicateInquiryError,
  EventRegistrationError,
} from "./storage";
import { EmailService } from "./email";

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

test("inquiry contracts trim text and reject unsafe or oversized values", () => {
  const parsed = insertInquirySchema.parse({
    category: "membership",
    name: "  Inquiry User  ",
    email: "  inquiry@example.test  ",
    phone: "   ",
    companyName: "  Example Company  ",
    subject: "  Subject  ",
    message: "  A valid inquiry message.  ",
  });

  assert.equal(parsed.name, "Inquiry User");
  assert.equal(parsed.email, "inquiry@example.test");
  assert.equal(parsed.phone, undefined);
  assert.equal(parsed.companyName, "Example Company");
  assert.equal(parsed.subject, "Subject");
  assert.equal(parsed.message, "A valid inquiry message.");

  assert.throws(() => insertInquirySchema.parse({
    category: "membership",
    name: " ",
    email: "inquiry@example.test",
    subject: "Subject",
    message: "Message",
  }));
  assert.throws(() => insertInquirySchema.parse({
    category: "membership",
    name: "Inquiry User",
    email: "inquiry@example.test",
    subject: "x".repeat(201),
    message: "Message",
  }));
  assert.throws(() => insertInquirySchema.parse({
    category: "membership",
    name: "Inquiry User",
    email: "inquiry@example.test",
    subject: "Subject",
    message: "x".repeat(10_001),
  }));
  assert.throws(() => insertInquirySchema.parse({
    category: "unsupported",
    name: "Inquiry User",
    email: "inquiry@example.test",
    subject: "Subject",
    message: "Message",
    password: "must not be accepted",
  }));

  assert.throws(() => insertInquiryReplySchema.parse({
    inquiryId: "not-an-id",
    respondedBy: randomUUID(),
    message: "Reply",
  }));
  assert.throws(() => insertInquiryReplySchema.parse({
    inquiryId: randomUUID(),
    respondedBy: randomUUID(),
    message: " ",
  }));
  assert.throws(() => insertInquiryReplySchema.parse({
    inquiryId: randomUUID(),
    respondedBy: randomUUID(),
    message: "x".repeat(10_001),
  }));
});

test("email failures log only delivery metadata", async () => {
  const originalApiKey = process.env.RESEND_API_KEY;
  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;
  const originalError = console.error;
  const warningLogs: unknown[][] = [];
  const errorLogs: unknown[][] = [];
  const recipient = "private-recipient@example.test";
  const body = "private inquiry and reply body";

  try {
    delete process.env.RESEND_API_KEY;
    console.warn = (...args: unknown[]) => warningLogs.push(args);
    const missingProviderResult = await new EmailService().sendEmail({
      to: recipient,
      subject: "private subject",
      html: body,
      text: body,
    });
    assert.equal(missingProviderResult, false);
    assert.equal(JSON.stringify(warningLogs).includes(recipient), false);
    assert.equal(JSON.stringify(warningLogs).includes(body), false);

    process.env.RESEND_API_KEY = "test-provider-key";
    globalThis.fetch = async () => new Response("provider response with private data", {
      status: 502,
    });
    console.error = (...args: unknown[]) => errorLogs.push(args);
    const providerFailureResult = await new EmailService().sendEmail({
      to: recipient,
      subject: "private subject",
      html: body,
      text: body,
    });
    assert.equal(providerFailureResult, false);
    const serializedErrors = JSON.stringify(errorLogs);
    assert.equal(serializedErrors.includes(recipient), false);
    assert.equal(serializedErrors.includes(body), false);
    assert.equal(serializedErrors.includes("provider response with private data"), false);
    assert.equal(serializedErrors.includes("test-provider-key"), false);
  } finally {
    if (originalApiKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalApiKey;
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
    console.error = originalError;
  }
});

test(
  "inquiry routes reject invalid ids and bound repeated public submissions",
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
    const originalGetUser = storage.getUser;
    const originalCreateInquiry = storage.createInquiry;
    const adminUserId = randomUUID();
    storage.getUser = async (id) => id === adminUserId
      ? ({
          id: adminUserId,
          email: "inquiry-admin@example.test",
          password: "must-not-be-returned",
          name: "Inquiry Admin",
          role: "admin",
          userType: "staff",
          membershipTier: "free",
          isActive: true,
        } as any)
      : undefined;
    storage.createInquiry = async () => ({
      id: randomUUID(),
      category: "membership",
      name: "Inquiry User",
      email: "inquiry@example.test",
      phone: null,
      companyName: null,
      subject: "Subject",
      message: "Message",
      status: "new",
      createdAt: new Date(),
    });

    const app = express();
    app.use(express.json());
    const server = await registerRoutes(app);

    try {
      await new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, resolve);
      });
      const address = server.address();
      assert.ok(address && typeof address !== "string");
      const baseUrl = `http://127.0.0.1:${address.port}`;
      const invalidIdResponse = await fetch(`${baseUrl}/api/inquiries/not-an-uuid`, {
        headers: { Authorization: `Bearer ${jwt.sign({ id: adminUserId }, process.env.SESSION_SECRET!)}` },
      });
      assert.equal(invalidIdResponse.status, 400);

      const requestBody = {
        category: "membership",
        name: "Inquiry User",
        email: "inquiry@example.test",
        subject: "Subject",
        message: "Message",
      };
      const responses = [];
      for (let index = 0; index < 6; index += 1) {
        responses.push(await fetch(`${baseUrl}/api/inquiries`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        }));
      }
      assert.deepEqual(responses.slice(0, 5).map((response) => response.status), [201, 201, 201, 201, 201]);
      assert.equal(responses[5].status, 429);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      storage.getUser = originalGetUser;
      storage.createInquiry = originalCreateInquiry;
      if (originalSessionSecret === undefined) delete process.env.SESSION_SECRET;
      else process.env.SESSION_SECRET = originalSessionSecret;
    }
  },
);

test(
  "inquiry responder DTOs exclude password and unrelated account fields",
  { skip: !databaseAvailable },
  async () => {
    const { db, storage } = await getDatabase();
    const suffix = randomUUID();

    const admin = await storage.createUser({
      email: `member-admin-${suffix}@example.test`,
      password: "test-password",
      name: "Member Admin",
      role: "admin",
      userType: "staff",
    });
    const responder = await storage.createUser({
      email: `inquiry-responder-${suffix}@example.test`,
      password: "test-password",
      name: "Inquiry Responder",
      role: "operator",
      userType: "staff",
    });
    const inquiryInput = {
      category: "membership" as const,
      name: "Inquiry Contact",
      email: `inquiry-contact-${suffix}@example.test`,
      phone: null,
      companyName: null,
      subject: "DTO test",
      message: "DTO response test",
    };
    const inquiry = await storage.createInquiry(inquiryInput);

    try {
      await storage.createInquiryReply({
        inquiryId: inquiry.id,
        respondedBy: responder.id,
        message: "Safe responder test",
      });
      const result = await storage.getInquiryWithReplies(inquiry.id);
      assert.ok(result);
      assert.deepEqual(result.replies[0].responder, {
        id: responder.id,
        name: responder.name,
      });
      assert.equal("password" in result.replies[0].responder!, false);
      assert.equal("email" in result.replies[0].responder!, false);

      await assert.rejects(
        () => storage.createInquiry(inquiryInput),
        (error: unknown) => error instanceof DuplicateInquiryError,
      );
    } finally {
      await db.delete(inquiries).where(eq(inquiries.id, inquiry.id));
      await db.delete(users).where(eq(users.id, responder.id));
    }
  },
);

test("post visibility policy separates administrator and editor access", () => {
  const now = new Date();
  const editor: PostAccessContext = {
    userId: randomUUID(),
    isAdmin: false,
    isEditor: true,
    managedPostTypes: new Set(["news"]),
    canReadMembers: false,
    canReadPremium: false,
  };
  const memberEditor: PostAccessContext = {
    ...editor,
    canReadMembers: true,
    canReadPremium: true,
  };
  const admin: PostAccessContext = {
    userId: randomUUID(),
    isAdmin: true,
    isEditor: false,
    managedPostTypes: new Set(["news", "event", "resource", "page"]),
    canReadMembers: true,
    canReadPremium: true,
  };
  const post = (overrides: Record<string, unknown> = {}) => ({
    id: randomUUID(),
    postType: "news",
    status: "draft",
    visibility: "public",
    slug: "policy-test",
    primaryLocale: "ko",
    publishedAt: now,
    expiresAt: null,
    ...overrides,
  } as any);

  assert.equal(canReadPost(post(), editor), true);
  assert.equal(canReadPost(post({ postType: "event" }), editor), false);
  assert.equal(canReadPost(post({ status: "archived" }), editor), false);
  assert.equal(canReadPost(post({ visibility: "members" }), editor), false);
  assert.equal(canReadPost(post({ visibility: "members" }), memberEditor), true);
  assert.equal(canReadPost(post({ visibility: "premium" }), memberEditor), true);
  assert.equal(canReadPost(post({ visibility: "internal" }), memberEditor), false);
  assert.equal(canReadPost(post({
    status: "published",
    publishedAt: new Date(now.getTime() + 60_000),
  }), editor), false);
  assert.equal(canReadPost(post({
    status: "draft",
    publishedAt: new Date(now.getTime() + 60_000),
  }), editor), true);
  assert.equal(canReadPost(post({
    postType: "resource",
    status: "draft",
    visibility: "internal",
  }), admin), true);
  assert.equal(canReadPost(post({ status: "archived", visibility: "internal" }), admin), true);
  assert.equal(canReadPost(post({ status: "draft" }), publicPostAccess), false);
});

test(
  "ACL-derived editor contexts scope post lists and details without admin escalation",
  { skip: !databaseAvailable },
  async () => {
    const { db, storage } = await getDatabase();
    const suffix = randomUUID();
    const [newsReadPermission] = await db
      .select()
      .from(permissions)
      .where(eq(permissions.key, "news.read"))
      .limit(1);
    const [editorTier] = await db
      .select()
      .from(tiers)
      .where(eq(tiers.code, "MEMBER"))
      .limit(1);
    const [memberRole] = await db
      .select()
      .from(roles)
      .where(eq(roles.code, "member"))
      .limit(1);
    assert.ok(newsReadPermission, "ACL seed must include news.read");
    assert.ok(editorTier, "ACL seed must include the MEMBER tier");
    assert.ok(memberRole, "ACL seed must include the member role");

    const [editorRole] = await db.insert(roles).values({
      code: `news-editor-${suffix}`,
      name: "News-only editor regression role",
    }).returning();
    await db.insert(rolePermissions).values({
      roleId: editorRole.id,
      permissionId: newsReadPermission.id,
    });
    const editorUser = await storage.createUser({
      email: `news-editor-${suffix}@example.test`,
      password: "test-password",
      name: "News-only editor",
      role: "operator",
      userType: "staff",
    });
    const adminUser = await storage.createUser({
      email: `post-admin-${suffix}@example.test`,
      password: "test-password",
      name: "Post administrator",
      role: "admin",
      userType: "staff",
    });
    const regularUser = await storage.createUser({
      email: `post-member-${suffix}@example.test`,
      password: "test-password",
      name: "Regular member",
      role: "user",
      userType: "staff",
    });
    const [membership] = await db.insert(userMemberships).values({
      userId: editorUser.id,
      tierId: editorTier.id,
      roleId: editorRole.id,
    }).returning();
    const [regularMembership] = await db.insert(userMemberships).values({
      userId: regularUser.id,
      tierId: editorTier.id,
      roleId: memberRole.id,
    }).returning();

    const postOptions = [
      { postType: "news", status: "draft", visibility: "public" },
      { postType: "news", status: "published", visibility: "public" },
      { postType: "news", status: "published", visibility: "members" },
      { postType: "news", status: "published", visibility: "premium" },
      { postType: "news", status: "published", visibility: "internal" },
      { postType: "news", status: "archived", visibility: "public" },
      { postType: "event", status: "draft", visibility: "public" },
    ] as const;
    const seededPosts = await db.insert(posts).values(
      postOptions.map((options) => ({
        ...options,
        slug: `post-access-${suffix}-${options.postType}-${options.status}-${options.visibility}`,
        primaryLocale: "ko" as const,
        publishedAt: options.status === "published"
          ? new Date(Date.now() - 60_000)
          : new Date(Date.now() + 60_000),
      })),
    ).returning();

    try {
      const editorAccess = await storage.getPostAccessContext(editorUser.id, true);
      assert.equal(editorAccess.isAdmin, false);
      assert.equal(editorAccess.isEditor, true);
      assert.deepEqual([...editorAccess.managedPostTypes], ["news"]);

      const normalEditorAccess = await storage.getPostAccessContext(editorUser.id, false);
      assert.equal(normalEditorAccess.isAdmin, false);
      assert.equal(normalEditorAccess.isEditor, false);

      const regularAccess = await storage.getPostAccessContext(regularUser.id, true);
      assert.equal(regularAccess.isAdmin, false);
      assert.equal(regularAccess.isEditor, false);
      assert.equal(
        await storage.getPostWithTranslations(seededPosts[0].id, undefined, regularAccess),
        undefined,
      );

      const editorNews = await storage.getPosts({
        postType: "news",
        search: suffix,
        access: editorAccess,
      });
      assert.deepEqual(
        editorNews.posts.map(({ id }) => id).sort(),
        seededPosts.slice(0, 3).map(({ id }) => id).sort(),
      );
      assert.equal(
        (await storage.getPosts({ postType: "event", search: suffix, access: editorAccess })).total,
        0,
      );
      assert.ok(
        await storage.getPostWithTranslations(seededPosts[2].id, undefined, editorAccess),
      );
      assert.equal(
        await storage.getPostWithTranslations(seededPosts[3].id, undefined, editorAccess),
        undefined,
      );
      assert.equal(
        await storage.getPostWithTranslations(seededPosts[4].id, undefined, editorAccess),
        undefined,
      );
      assert.ok(
        await storage.getPostWithTranslations(seededPosts[0].id, undefined, editorAccess),
      );

      const adminAccess = await storage.getPostAccessContext(adminUser.id, true);
      assert.equal(adminAccess.isAdmin, true);
      assert.equal(
        (await storage.getPosts({ postType: "news", search: suffix, access: adminAccess })).total,
        6,
      );
      assert.equal(
        (await storage.getPosts({ postType: "event", search: suffix, access: adminAccess })).total,
        1,
      );
      assert.ok(
        await storage.getPostWithTranslations(seededPosts[3].id, undefined, adminAccess),
      );
    } finally {
      await db.delete(userMemberships).where(inArray(
        userMemberships.id,
        [membership.id, regularMembership.id],
      ));
      await db.delete(posts).where(inArray(posts.id, seededPosts.map(({ id }) => id)));
      await db.delete(users).where(inArray(users.id, [
        editorUser.id,
        adminUser.id,
        regularUser.id,
      ]));
      await db.delete(rolePermissions).where(eq(rolePermissions.roleId, editorRole.id));
      await db.delete(roles).where(eq(roles.id, editorRole.id));
    }
  },
);

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

    const admin = await storage.createUser({
      email: `member-admin-${suffix}@example.test`,
      password: "test-password",
      name: "Member Admin",
      role: "admin",
      userType: "staff",
    });
    const user = await storage.createUserForRegistration({
      email: `authorization-sync-${suffix}@example.test`,
      password: "test-password",
      name: "Authorization Sync Test",
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

    const admin = await storage.createUser({
      email: `member-admin-${suffix}@example.test`,
      password: "test-password",
      name: "Member Admin",
      role: "admin",
      userType: "staff",
    });
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
          slug: `pagination-${index}-${randomUUID()}`,
          primaryLocale: "ko" as const,
          publishedAt: new Date(),
        })),
      )
      .returning();
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
          membershipStatus: "active",
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
      const request = async (
        path: string,
        options: { token?: string; method?: string; body?: unknown } = {},
      ) => {
        const response = await fetch(`${baseUrl}${path}`, {
          method: options.method,
          headers: {
            ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
            ...(options.body ? { "Content-Type": "application/json" } : {}),
          },
          body: options.body ? JSON.stringify(options.body) : undefined,
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

      const adminList = await request("/api/organization-members?isActive=false", {
        token: adminToken,
      });
      assert.equal(adminList.status, 200);
      assert.deepEqual(
        adminList.body.map((member: any) => member.id),
        [activeMember.id, inactiveMember.id],
      );

      const adminInactiveDetail = await request(
        `/api/organization-members/${inactiveMember.id}`,
        { token: adminToken },
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
  "executive organization permissions scope operator management",
  { skip: !databaseAvailable },
  async () => {
    const { db, storage } = await getDatabase();
    const originalSessionSecret = process.env.SESSION_SECRET;
    if (!process.env.SESSION_SECRET) {
      process.env.SESSION_SECRET = `executive-permission-test-${randomUUID()}`;
    }
    const suffix = randomUUID();
    const [operator] = await Promise.all([
      storage.createUser({
        email: `executive-operator-${suffix}@example.test`,
        password: "test-password",
        name: "Executive Operator",
        role: "operator",
        userType: "staff",
      }),
      storage.createUser({
        email: `executive-no-permission-${suffix}@example.test`,
        password: "test-password",
        name: "Unprivileged Operator",
        role: "operator",
        userType: "staff",
      }),
      storage.createUser({
        email: `executive-member-${suffix}@example.test`,
        password: "test-password",
        name: "Regular Member",
        role: "user",
        userType: "staff",
      }),
    ]);
    const noPermissionOperator = await storage.getUserByEmail(`executive-no-permission-${suffix}@example.test`);
    const regularMember = await storage.getUserByEmail(`executive-member-${suffix}@example.test`);
    const [tier] = await db.insert(tiers).values({
      code: `executive-test-tier-${suffix}`,
      name: "Executive Permission Test Tier",
    }).returning();
    const [role] = await db.insert(roles).values({
      code: `executive-test-role-${suffix}`,
      name: "Executive Permission Test Role",
    }).returning();
    const permissionIds: string[] = [];
    for (const [key, action] of [
      ["organization.executives.read", "read"],
      ["organization.executives.create", "create"],
      ["organization.executives.update", "update"],
    ] as const) {
      await db.insert(permissions).values({
        key,
        resource: "organization.executives",
        action,
        description: "Executive organization permission regression test",
      }).onConflictDoNothing();
      const [permission] = await db
        .select({ id: permissions.id })
        .from(permissions)
        .where(eq(permissions.key, key))
        .limit(1);
      assert.ok(permission);
      permissionIds.push(permission.id);
    }
    const [membership] = await db.insert(userMemberships).values({
      userId: operator.id,
      tierId: tier.id,
      roleId: role.id,
      expiresAt: new Date(Date.now() + 60_000),
    }).returning();
    await db.insert(rolePermissions).values(
      permissionIds.map((permissionId) => ({
        roleId: role.id,
        permissionId,
      })),
    );

    const activeExecutive = {
      id: randomUUID(),
      name: "Active Executive",
      position: "President",
      category: "executives",
      isActive: true,
    };
    const inactiveExecutive = {
      id: randomUUID(),
      name: "Inactive Executive",
      position: "President",
      category: "executives",
      isActive: false,
    };
    const vicePresident = {
      id: randomUUID(),
      name: "Vice President",
      position: "Vice President",
      category: "vicepresidents",
      isActive: true,
    };
    const otherCategoryMember = {
      id: randomUUID(),
      name: "Secretariat Member",
      position: "Secretary",
      category: "secretariat",
      isActive: true,
    };
    const originalGetOrganizationMembers = storage.getOrganizationMembers;
    const originalGetOrganizationMember = storage.getOrganizationMember;
    const originalCreateOrganizationMember = storage.createOrganizationMember;
    const originalUpdateOrganizationMember = storage.updateOrganizationMember;
    storage.getOrganizationMembers = async (filters) => {
      if (filters?.category === "executives") {
        return filters?.isActive === true
          ? [activeExecutive as any]
          : [activeExecutive as any, inactiveExecutive as any];
      }
      if (!filters?.category) {
        return [activeExecutive as any, inactiveExecutive as any, vicePresident as any, otherCategoryMember as any];
      }
      return [otherCategoryMember as any];
    };
    storage.getOrganizationMember = async (id) => {
      if (id === activeExecutive.id) return activeExecutive as any;
      if (id === inactiveExecutive.id) return inactiveExecutive as any;
      if (id === vicePresident.id) return vicePresident as any;
      if (id === otherCategoryMember.id) return otherCategoryMember as any;
      return undefined;
    };
    storage.createOrganizationMember = async (member) => ({
      ...member,
      id: randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    storage.updateOrganizationMember = async (id, updates) => ({
      ...(id === activeExecutive.id
        ? activeExecutive
        : id === vicePresident.id
          ? vicePresident
          : otherCategoryMember),
      ...updates,
      id,
      updatedAt: new Date(),
    } as any);

    const [{ registerRoutes }] = await Promise.all([import("./routes")]);
    const app = express();
    app.use(express.json());
    const server = await registerRoutes(app);

    try {
      await new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, resolve);
      });
      const address = server.address();
      assert.ok(address && typeof address !== "string");
      const baseUrl = `http://127.0.0.1:${address.port}`;
      const operatorToken = jwt.sign({ id: operator.id }, process.env.SESSION_SECRET!);
      const noPermissionToken = jwt.sign({ id: noPermissionOperator!.id }, process.env.SESSION_SECRET!);
      const memberToken = jwt.sign({ id: regularMember!.id }, process.env.SESSION_SECRET!);
      const request = async (
        path: string,
        options: { token?: string; method?: string; body?: unknown } = {},
      ) => {
        const response = await fetch(`${baseUrl}${path}`, {
          method: options.method,
          headers: {
            ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
            ...(options.body ? { "Content-Type": "application/json" } : {}),
          },
          body: options.body ? JSON.stringify(options.body) : undefined,
        });
        return { status: response.status, body: await response.json() };
      };
      const memberData = {
        name: "New Executive",
        position: "Vice President",
        category: "executives",
        isActive: true,
      };

      const operatorList = await request("/api/organization-members?isActive=false", {
        token: operatorToken,
      });
      assert.equal(operatorList.status, 200);
      assert.deepEqual(
        operatorList.body.map((member: any) => member.id),
        [activeExecutive.id, inactiveExecutive.id, vicePresident.id],
      );

      assert.equal(
        (await request("/api/organization-members?isActive=false&category=secretariat", {
          token: operatorToken,
        })).status,
        403,
      );
      assert.equal(
        (await request("/api/organization-members", {
          token: noPermissionToken,
        })).status,
        200,
      );
      assert.equal(
        (await request("/api/organization-members?isActive=false", {
          token: noPermissionToken,
        })).status,
        403,
      );

      assert.equal(
        (await request("/api/organization-members", {
          token: memberToken,
          method: "POST",
          body: memberData,
        })).status,
        403,
      );
      const createdExecutive = await request("/api/organization-members", {
          token: operatorToken,
          method: "POST",
          body: memberData,
        });
      assert.equal(
        createdExecutive.status,
        201,
        JSON.stringify(createdExecutive.body),
      );
      assert.equal(
        (await request("/api/organization-members", {
          token: operatorToken,
          method: "POST",
          body: { ...memberData, category: "secretariat" },
        })).status,
        403,
      );
      assert.equal(
        (await request(`/api/organization-members/${activeExecutive.id}`, {
          token: operatorToken,
          method: "PUT",
          body: { name: "Updated Executive", category: "executives" },
        })).status,
        200,
      );
      assert.equal(
        (await request(`/api/organization-members/${vicePresident.id}`, {
          token: operatorToken,
          method: "PUT",
          body: { name: "Updated Vice President", category: "vicepresidents" },
        })).status,
        200,
      );
      assert.equal(
        (await request(`/api/organization-members/${activeExecutive.id}`, {
          token: operatorToken,
          method: "PUT",
          body: { category: "secretariat" },
        })).status,
        403,
      );
      assert.equal(
        (await request(`/api/organization-members/${otherCategoryMember.id}`, {
          token: operatorToken,
          method: "PUT",
          body: { name: "Should Be Rejected" },
        })).status,
        403,
      );
      assert.equal(
        (await request(`/api/organization-members/${activeExecutive.id}`, {
          token: operatorToken,
          method: "DELETE",
        })).status,
        403,
      );
    } finally {
      storage.getOrganizationMembers = originalGetOrganizationMembers;
      storage.getOrganizationMember = originalGetOrganizationMember;
      storage.createOrganizationMember = originalCreateOrganizationMember;
      storage.updateOrganizationMember = originalUpdateOrganizationMember;
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      await db.delete(userMemberships).where(eq(userMemberships.id, membership.id));
      await db.delete(users).where(inArray(users.id, [
        operator.id,
        noPermissionOperator!.id,
        regularMember!.id,
      ]));
      await db.delete(rolePermissions).where(eq(rolePermissions.roleId, role.id));
      await db.delete(roles).where(eq(roles.id, role.id));
      await db.delete(tiers).where(eq(tiers.id, tier.id));
      if (originalSessionSecret === undefined) {
        delete process.env.SESSION_SECRET;
      } else {
        process.env.SESSION_SECRET = originalSessionSecret;
      }
    }
  },
);

test(
  "member lifecycle and ownership boundaries are enforced by member routes",
  { skip: !databaseAvailable },
  async () => {
    const { db, storage } = await getDatabase();
    const originalSessionSecret = process.env.SESSION_SECRET;
    if (!process.env.SESSION_SECRET) {
      process.env.SESSION_SECRET = `member-lifecycle-test-${randomUUID()}`;
    }
    const suffix = randomUUID();
    const createdMemberIds: string[] = [];

    const owner = await storage.createUser({
      email: `member-owner-${suffix}@example.test`,
      password: "test-password",
      name: "Member Owner",
      userType: "company",
    });
    const otherOwner = await storage.createUser({
      email: `member-other-${suffix}@example.test`,
      password: "test-password",
      name: "Other Member Owner",
      userType: "company",
    });
    const [{ registerRoutes }] = await Promise.all([import("./routes")]);
    const admin = await storage.createUser({
      email: `member-admin-${suffix}@example.test`,
      password: "test-password",
      name: "Member Lifecycle Admin",
      role: "admin",
      userType: "staff",
    });

    const createMember = async (options: {
      ownerId?: string;
      status?: "pending" | "active" | "inactive";
      isPublic?: boolean;
      level?: "regular" | "premium" | "sponsor";
    }) => {
      const [member] = await db.insert(members).values({
        userId: options.ownerId,
        companyName: `Lifecycle Company ${randomUUID()}`,
        industry: "Testing",
        country: "Korea",
        city: "Seoul",
        address: "Test address",
        contactPerson: "Test contact",
        contactEmail: `contact-${randomUUID()}@example.test`,
        membershipStatus: options.status || "active",
        membershipLevel: options.level || "regular",
        isPublic: options.isPublic ?? true,
      }).returning();
      createdMemberIds.push(member.id);
      return member;
    };

    const publicMember = await createMember({ ownerId: owner.id });
    const privateMember = await createMember({ isPublic: false });
    const pendingMember = await createMember({ status: "pending", isPublic: true });

    const app = express();
    app.use(express.json());
    const server = await registerRoutes(app);
    try {
      await new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, resolve);
      });
      const address = server.address();
      assert.ok(address && typeof address !== "string");
      const baseUrl = `http://127.0.0.1:${address.port}`;
      const request = async (
        path: string,
        options: { token?: string; method?: string; body?: unknown } = {},
      ) => {
        const response = await fetch(`${baseUrl}${path}`, {
          method: options.method,
          headers: {
            ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
            ...(options.body ? { "Content-Type": "application/json" } : {}),
          },
          body: options.body ? JSON.stringify(options.body) : undefined,
        });
        return { status: response.status, body: await response.json() };
      };

      const ownerToken = jwt.sign({ id: owner.id }, process.env.SESSION_SECRET!);
      const otherOwnerToken = jwt.sign({ id: otherOwner.id }, process.env.SESSION_SECRET!);
      const adminToken = jwt.sign({ id: admin.id }, process.env.SESSION_SECRET!);
      const newProfile = {
        companyName: "Self Registered Company",
        industry: "Testing",
        country: "Korea",
        city: "Seoul",
        address: "Self registration address",
        contactPerson: "New Owner",
        contactEmail: `new-contact-${suffix}@example.test`,
      };

      const acceptedCreate = await request("/api/members", {
        token: otherOwnerToken,
        method: "POST",
        body: newProfile,
      });
      assert.equal(acceptedCreate.status, 201);
      assert.equal(acceptedCreate.body.userId, otherOwner.id);
      assert.equal(acceptedCreate.body.membershipStatus, "pending");
      assert.equal(acceptedCreate.body.isPublic, false);
      createdMemberIds.push(acceptedCreate.body.id);

      const rejectedCreate = await request("/api/members", {
        token: otherOwnerToken,
        method: "POST",
        body: newProfile,
      });
      assert.equal(rejectedCreate.status, 400);

      const publicList = await request("/api/members?search=Lifecycle%20Company");
      assert.equal(publicList.status, 200);
      assert.ok(publicList.body.members.some((member: any) => member.id === publicMember.id));
      assert.equal(
        publicList.body.members.some((member: any) => member.id === privateMember.id),
        false,
      );

      const publicDetail = await request(`/api/members/${publicMember.id}`);
      assert.equal(publicDetail.status, 200);
      const privateDetail = await request(`/api/members/${privateMember.id}`);
      assert.equal(privateDetail.status, 404);
      const pendingDetail = await request(`/api/members/${pendingMember.id}`);
      assert.equal(pendingDetail.status, 404);

      const ownerUpdate = await request(`/api/members/${publicMember.id}`, {
        token: ownerToken,
        method: "PUT",
        body: { companyName: "Updated Company" },
      });
      assert.equal(ownerUpdate.status, 200);
      assert.equal(ownerUpdate.body.companyName, "Updated Company");

      const takeover = await request(`/api/members/${privateMember.id}`, {
        token: otherOwnerToken,
        method: "PUT",
        body: { companyName: "Taken Over Company" },
      });
      assert.equal(takeover.status, 403);

      const ownerAdminUpdate = await request(`/api/admin/members/${publicMember.id}`, {
        token: ownerToken,
        method: "PUT",
        body: { membershipStatus: "inactive" },
      });
      assert.equal(ownerAdminUpdate.status, 403);

      const adminUpdate = await request(`/api/admin/members/${pendingMember.id}`, {
        token: adminToken,
        method: "PUT",
        body: {
          membershipStatus: "active",
          membershipLevel: "premium",
          isPublic: true,
        },
      });
      assert.equal(adminUpdate.status, 200);
      assert.equal(adminUpdate.body.membershipStatus, "active");
      assert.equal(adminUpdate.body.membershipLevel, "premium");

      const nowPublic = await request(`/api/members/${pendingMember.id}`);
      assert.equal(nowPublic.status, 200);

      const adminList = await request("/api/admin/members", { token: adminToken });
      assert.equal(adminList.status, 200);
      assert.ok(adminList.body.members.some((member: any) => member.id === pendingMember.id));
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => error ? reject(error) : resolve()),
      );
      await db.delete(members).where(inArray(members.id, createdMemberIds));
      await db.delete(users).where(inArray(users.id, [owner.id, otherOwner.id, admin.id]));
      if (originalSessionSecret === undefined) {
        delete process.env.SESSION_SECRET;
      } else {
        process.env.SESSION_SECRET = originalSessionSecret;
      }
    }
  },
);
