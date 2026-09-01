import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import { PassThrough } from "node:stream";
import express from "express";
import jwt from "jsonwebtoken";
import { and, eq, inArray } from "drizzle-orm";
import {
  eventRegistrations,
  insertInquiryReplySchema,
  insertInquirySchema,
  insertPartnerSchema,
  inquiries,
  members,
  organizationMembers,
  partners,
  permissions,
  postMeta,
  postTranslations,
  posts,
  rolePermissions,
  roles,
  surveySettings,
  surveySettingsHistory,
  surveySettingsSchema,
  tiers,
  userMemberships,
  users,
  updatePartnerSchema,
} from "@shared/schema";
import { getPostPermissionKey } from "./postPermissions";
import { canReadPost, publicPostAccess, type PostAccessContext } from "./postAccess";
import {
  InvalidPostScheduleError,
  getResourceAclSyncMarker,
  validatePostSchedule,
} from "./postScheduling";
import {
  getResourceObjectAclVisibility,
} from "./objectStorage";
import { ScheduledPublicationRunner } from "./scheduledPublications";
import {
  AuthorizationStateError,
  DuplicateInquiryError,
  EventRegistrationError,
  UserDeletionError,
} from "./storage";
import { EmailService } from "./email";
import { issueAuthToken } from "./auth";
import { sortOrganizationMembers } from "@shared/organization";
import { getSurveyStatus, isSurveyVisible } from "@shared/survey";
import {
  canAccessObject,
  ObjectPermission,
} from "./objectAcl";
import { canMutateObjectAcl, ObjectStorageService } from "./objectStorage";
import {
  canExposeMetaKey,
  getMetaValueType,
  isMetaKeyForPostType,
  validatePostMetaValue,
} from "@shared/postMetaKeys";

test("organization member ordering is deterministic for public and admin views", () => {
  const members = [
    { id: "b", name: "김민수", sortOrder: 10, isActive: true },
    { id: "a", name: "김민수", sortOrder: 10, isActive: false },
    { id: "c", name: "이서준", sortOrder: 10, isActive: true },
    { id: "d", name: "박지훈", sortOrder: 20, isActive: true },
  ];

  assert.deepEqual(
    sortOrganizationMembers(members).map((member) => member.id),
    ["a", "b", "c", "d"],
  );
  assert.deepEqual(
    sortOrganizationMembers(members.filter((member) => member.isActive)).map((member) => member.id),
    ["b", "c", "d"],
  );
});

const databaseAvailable = Boolean(process.env.DATABASE_URL);

test(
  "authentication lifecycle normalizes identities and revokes old credentials",
  { skip: !databaseAvailable },
  async () => {
    const { db, storage } = await getDatabase();
    const originalSessionSecret = process.env.SESSION_SECRET;
    if (!process.env.SESSION_SECRET) {
      process.env.SESSION_SECRET = `auth-lifecycle-test-${randomUUID()}`;
    }
    const suffix = randomUUID();
    const admin = await storage.createUser({
      email: `auth-admin-${suffix}@example.test`,
      password: "admin-password",
      name: "Auth Admin",
      role: "admin",
      userType: "staff",
    });
    const user = await storage.createUser({
      email: `auth-user-${suffix}@example.test`,
      password: "initial-password",
      name: "Auth User",
      userType: "staff",
    });
    const user2 = await storage.createUser({
      email: `auth-user-two-${suffix}@example.test`,
      password: "initial-password",
      name: "Auth User Two",
      userType: "staff",
    });

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
        const responseText = await response.text();
        let body: unknown = responseText;
        try {
          body = JSON.parse(responseText);
        } catch {
          // Empty responses, such as logout, are expected.
        }
        return { status: response.status, body };
      };

      const weakRegistration = await request("/api/auth/register", {
        method: "POST",
        body: {
          name: "Weak Password",
          email: `weak-${suffix}@example.test`,
          password: "short",
          userType: "staff",
        },
      });
      assert.equal(weakRegistration.status, 400);
      assert.equal(JSON.stringify(weakRegistration.body).includes("short"), false);

      const initialToken = issueAuthToken(user, process.env.SESSION_SECRET!);
      const profileEmail = `profile-${suffix}@example.test`;
      const profileEmailChange = await request("/api/auth/profile", {
        token: initialToken,
        method: "PATCH",
        body: { email: `  ${profileEmail.toUpperCase()}  ` },
      });
      assert.equal(profileEmailChange.status, 200);
      assert.equal((profileEmailChange.body as { email: string }).email, profileEmail);
      assert.equal((await request("/api/auth/me", { token: initialToken })).status, 403);

      const login = await request("/api/auth/login", {
        method: "POST",
        body: {
          email: `  ${profileEmail.toUpperCase()}  `,
          password: "initial-password",
        },
      });
      assert.equal(login.status, 200);
      assert.ok(login.body && typeof login.body === "object");
      const loginBody = login.body as { user: Record<string, unknown>; token: string };
      assert.equal(loginBody.user.email, profileEmail);
      assert.equal("password" in loginBody.user, false);
      const loginClaims = jwt.decode(loginBody.token) as Record<string, unknown>;
      assert.equal(loginClaims.id, user.id);
      assert.equal(typeof loginClaims.sv, "number");
      assert.equal("email" in loginClaims, false);
      assert.equal("role" in loginClaims, false);

      const duplicateRegistration = await request("/api/auth/register", {
        method: "POST",
        body: {
          name: "Duplicate Identity",
          email: ` ${profileEmail.toUpperCase()} `,
          password: "different-password",
          userType: "staff",
        },
      });
      assert.equal(duplicateRegistration.status, 400);
      assert.deepEqual(duplicateRegistration.body, { message: "User already exists" });

      const passwordChange = await request("/api/auth/profile", {
        token: loginBody.token,
        method: "PATCH",
        body: {
          currentPassword: "initial-password",
          newPassword: "replacement-password",
        },
      });
      assert.equal(passwordChange.status, 200);
      assert.equal((await request("/api/auth/me", { token: loginBody.token })).status, 403);

      const replacementLogin = await request("/api/auth/login", {
        method: "POST",
        body: { email: profileEmail, password: "replacement-password" },
      });
      assert.equal(replacementLogin.status, 200);
      const replacementToken = (replacementLogin.body as { token: string }).token;
      assert.equal((await request("/api/auth/logout", {
        token: replacementToken,
        method: "POST",
      })).status, 204);
      assert.equal((await request("/api/auth/me", { token: replacementToken })).status, 403);

      const adminToken = issueAuthToken(admin, process.env.SESSION_SECRET!);
      const userToken = issueAuthToken(user2, process.env.SESSION_SECRET!);
      const adminEmail = `admin-edited-${suffix}@example.test`;
      const adminEmailChange = await request(`/api/users/${user2.id}`, {
        token: adminToken,
        method: "PUT",
        body: { email: `  ${adminEmail.toUpperCase()}  ` },
      });
      assert.equal(adminEmailChange.status, 200);
      assert.equal((adminEmailChange.body as { email: string }).email, adminEmail);
      assert.equal((await request("/api/auth/me", { token: userToken })).status, 403);

      const refreshedAfterEmail = await storage.getUser(user2.id);
      assert.ok(refreshedAfterEmail);
      const userTokenAfterEmail = issueAuthToken(
        refreshedAfterEmail!,
        process.env.SESSION_SECRET!,
      );
      const roleChange = await request(`/api/users/${user2.id}`, {
        token: adminToken,
        method: "PUT",
        body: { role: "operator" },
      });
      assert.equal(roleChange.status, 200);
      assert.equal((await request("/api/auth/me", { token: userTokenAfterEmail })).status, 403);

      const refreshedUser2 = await storage.getUser(user2.id);
      assert.ok(refreshedUser2);
      const activeToken = issueAuthToken(refreshedUser2!, process.env.SESSION_SECRET!);
      const deactivation = await request(`/api/users/${user2.id}`, {
        token: adminToken,
        method: "PUT",
        body: { isActive: false },
      });
      assert.equal(deactivation.status, 200);
      assert.equal((await request("/api/auth/me", { token: activeToken })).status, 403);

      assert.equal(
        (await request(`/api/users/${admin.id}`, {
          token: adminToken,
          method: "PUT",
          body: { isActive: false },
        })).status,
        400,
      );
      assert.equal(
        (await request(`/api/users/${admin.id}`, {
          token: adminToken,
          method: "DELETE",
        })).status,
        400,
      );

      const deletion = await request(`/api/users/${user2.id}`, {
        token: adminToken,
        method: "DELETE",
      });
      assert.equal(deletion.status, 200);
      assert.equal(await storage.getUser(user2.id), undefined);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await db.delete(users).where(inArray(users.id, [admin.id, user.id, user2.id]));
      if (originalSessionSecret === undefined) delete process.env.SESSION_SECRET;
      else process.env.SESSION_SECRET = originalSessionSecret;
    }
  },
);

test("managed post actions map to their scoped ACL permissions", () => {
  assert.equal(getPostPermissionKey("news", "read"), "news.read");
  assert.equal(getPostPermissionKey("news", "publish"), "news.publish");
  assert.equal(getPostPermissionKey("event", "create"), "event.create");
  assert.equal(getPostPermissionKey("event", "attendeeManage"), "event.attendee.manage");
  assert.equal(getPostPermissionKey("resource", "create"), "resource.upload");
  assert.equal(getPostPermissionKey("resource", "delete"), "resource.delete");
  assert.equal(getPostPermissionKey("page", "read"), "page.read");
  assert.equal(getPostPermissionKey("page", "update"), "page.update");
  assert.equal(getPostPermissionKey("page", "create"), undefined);
  assert.equal(getPostPermissionKey("page", "delete"), undefined);
  assert.equal(getPostPermissionKey("page", "publish"), undefined);
  assert.equal(getPostPermissionKey("news", "attendeeManage"), undefined);
});

test("admin dashboard route is administrator-only and returns the bounded safe snapshot contract", async () => {
  const [{ registerRoutes }, { storage }] = await Promise.all([
    import("./routes"),
    import("./storage"),
  ]);
  const adminId = randomUUID();
  const memberId = randomUUID();
  const admin = {
    id: adminId,
    email: "dashboard-admin@example.test",
    password: "not-returned",
    name: "Dashboard Admin",
    role: "admin",
    userType: "staff",
    membershipTier: "free",
    isActive: true,
    sessionVersion: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;
  const member = {
    ...admin,
    id: memberId,
    email: "dashboard-member@example.test",
    name: "Dashboard Member",
    role: "user",
  } as any;
  const snapshot = {
    stats: {
      totalMembers: 9,
      totalEvents: 8,
      totalNews: 7,
      totalInquiries: 6,
      totalUsers: 12,
      activeUsers: 10,
      inactiveUsers: 2,
      activeMembers: 5,
      pendingMembers: 3,
      inactiveMembers: 1,
      unpublishedNews: 2,
      unpublishedEvents: 1,
      totalContent: 20,
      unpublishedContent: 4,
      upcomingEvents: 6,
      unresolvedInquiries: 4,
    },
    recentInquiries: Array.from({ length: 5 }, (_, index) => ({
      id: randomUUID(),
      subject: `Safe inquiry ${index}`,
      category: "membership",
      status: index === 0 ? "new" : "in_progress",
      createdAt: new Date(Date.UTC(2026, 7, 31, 12, 0, 5 - index)).toISOString(),
    })),
    upcomingEvents: Array.from({ length: 5 }, (_, index) => ({
      id: randomUUID(),
      title: `Upcoming event ${index}`,
      status: index === 0 ? "draft" : "published",
      eventDate: new Date(Date.UTC(2026, 8, 1 + index)).toISOString(),
      location: index === 0 ? null : "Seoul",
    })),
  };
  const originalMethods = {
    getUser: storage.getUser,
    getPostAccessContext: storage.getPostAccessContext,
    getAdminDashboardSnapshot: storage.getAdminDashboardSnapshot,
  };
  const access = {
    userId: adminId,
    isAdmin: true,
    isEditor: false,
    managedPostTypes: new Set(["news", "event", "resource"]),
    canReadMembers: true,
    canReadPremium: true,
  };
  let snapshotCalls = 0;

  storage.getUser = async (id) => id === adminId ? admin : id === memberId ? member : undefined;
  storage.getPostAccessContext = async () => access;
  storage.getAdminDashboardSnapshot = async (receivedAccess) => {
    assert.equal(receivedAccess, access);
    snapshotCalls += 1;
    return snapshot;
  };

  const app = express();
  app.use(express.json());
  const server = await registerRoutes(app);
  const adminToken = issueAuthToken(admin, process.env.SESSION_SECRET!);
  const memberToken = issueAuthToken(member, process.env.SESSION_SECRET!);

  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, resolve);
    });
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const request = async (token?: string) => {
      const response = await fetch(`${baseUrl}/api/admin/dashboard`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const text = await response.text();
      return {
        status: response.status,
        body: text.startsWith("{") ? JSON.parse(text) : text,
      };
    };

    assert.equal((await request()).status, 401);
    assert.equal((await request(memberToken)).status, 403);
    assert.equal(snapshotCalls, 0);

    const response = await request(adminToken);
    assert.equal(response.status, 200);
    assert.equal(snapshotCalls, 1);
    assert.deepEqual(response.body.stats, snapshot.stats);
    assert.equal(response.body.recentInquiries.length, 5);
    assert.equal(response.body.upcomingEvents.length, 5);
    assert.deepEqual(
      Object.keys(response.body.recentInquiries[0]).sort(),
      ["category", "createdAt", "id", "status", "subject"],
    );
    assert.deepEqual(
      Object.keys(response.body.upcomingEvents[0]).sort(),
      ["eventDate", "id", "location", "status", "title"],
    );
    assert.equal("message" in response.body.recentInquiries[0], false);
    assert.equal("email" in response.body.recentInquiries[0], false);
    assert.equal("phone" in response.body.recentInquiries[0], false);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    storage.getUser = originalMethods.getUser;
    storage.getPostAccessContext = originalMethods.getPostAccessContext;
    storage.getAdminDashboardSnapshot = originalMethods.getAdminDashboardSnapshot;
  }
});

test("managed object intents bind the caller and path, and private reads are not reusable", async () => {
  const originalSessionSecret = process.env.SESSION_SECRET;
  const originalPrivateObjectDir = process.env.PRIVATE_OBJECT_DIR;
  process.env.SESSION_SECRET = `object-intent-test-${randomUUID()}`;
  process.env.PRIVATE_OBJECT_DIR = "/test-bucket/.private";

  const service = new ObjectStorageService();
  const ownerId = randomUUID();
  const otherUserId = randomUUID();
  const objectPath = "/objects/uploads/object-intent-test";
  (service as any).createObjectUpload = async () => ({
    uploadURL: "https://upload.example.test/signed",
    objectPath,
  });

  try {
    const upload = await service.createObjectUploadIntent(ownerId);
    assert.equal(service.verifyObjectUploadIntent(upload.uploadIntent, ownerId, objectPath), true);
    assert.equal(service.verifyObjectUploadIntent(upload.uploadIntent, otherUserId, objectPath), false);
    assert.equal(
      service.verifyObjectUploadIntent(upload.uploadIntent, ownerId, "/objects/uploads/another-object"),
      false,
    );

    const expiredIntent = jwt.sign(
      {
        typ: "managed-object-upload",
        sub: ownerId,
        objectPath,
        purpose: "managed-content",
      },
      process.env.SESSION_SECRET,
      { expiresIn: -1 },
    );
    assert.equal(service.verifyObjectUploadIntent(expiredIntent, ownerId, objectPath), false);
    assert.equal(canMutateObjectAcl({
      ownerId,
      existingOwner: ownerId,
      hasValidUploadIntent: true,
      canEditLinkedPost: false,
    }), true);
    assert.equal(canMutateObjectAcl({
      ownerId: otherUserId,
      existingOwner: ownerId,
      hasValidUploadIntent: true,
      canEditLinkedPost: false,
    }), false);
    assert.equal(canMutateObjectAcl({
      ownerId: otherUserId,
      existingOwner: ownerId,
      hasValidUploadIntent: false,
      canEditLinkedPost: true,
    }), true);
    assert.equal(canMutateObjectAcl({
      ownerId: otherUserId,
      hasValidUploadIntent: false,
      canEditLinkedPost: true,
    }), false);

    assert.throws(
      () => service.normalizeObjectEntityPath("/objects/../claimed"),
      /Invalid managed object path/,
    );
    assert.throws(
      () => service.normalizeObjectEntityPath("/objects/uploads/%2E%2E/claimed"),
      /Invalid managed object path/,
    );
    assert.throws(
      () => service.normalizeObjectEntityPath("https://storage.googleapis.com/other-bucket/object"),
      /Invalid managed object path/,
    );

    const policyFor = (visibility: "public" | "private") => JSON.stringify({
      owner: ownerId,
      visibility,
    });
    const makeFile = (visibility: "public" | "private") => ({
      name: "test-bucket/.private/uploads/object-intent-test",
      exists: async () => [true],
      getMetadata: async () => [{
        size: "0",
        contentType: "text/plain",
        metadata: { "custom:aclPolicy": policyFor(visibility) },
      }],
      createReadStream: () => new PassThrough(),
    });

    const privateFile = makeFile("private") as any;
    assert.equal(await canAccessObject({
      userId: undefined,
      objectFile: privateFile,
      requestedPermission: ObjectPermission.READ,
    }), false);
    assert.equal(await canAccessObject({
      userId: ownerId,
      objectFile: privateFile,
      requestedPermission: ObjectPermission.READ,
    }), true);

    const privateResponse = new PassThrough() as any;
    privateResponse.headersSent = false;
    privateResponse.set = (headers: Record<string, string>) => {
      privateResponse.responseHeaders = headers;
    };
    await service.downloadObject(privateFile, privateResponse);
    assert.equal(privateResponse.responseHeaders["Cache-Control"], "private, no-store");
    assert.equal(privateResponse.responseHeaders["Vary"], "Authorization");
    assert.equal(privateResponse.responseHeaders["Pragma"], "no-cache");

    const publicFile = makeFile("public") as any;
    assert.equal(await canAccessObject({
      userId: undefined,
      objectFile: publicFile,
      requestedPermission: ObjectPermission.READ,
    }), true);
    const publicResponse = new PassThrough() as any;
    publicResponse.headersSent = false;
    publicResponse.set = (headers: Record<string, string>) => {
      publicResponse.responseHeaders = headers;
    };
    await service.downloadObject(publicFile, publicResponse);
    assert.equal(publicResponse.responseHeaders["Cache-Control"], "public, max-age=3600");
    assert.equal(publicResponse.responseHeaders["Vary"], undefined);
  } finally {
    if (originalSessionSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = originalSessionSecret;
    if (originalPrivateObjectDir === undefined) delete process.env.PRIVATE_OBJECT_DIR;
    else process.env.PRIVATE_OBJECT_DIR = originalPrivateObjectDir;
  }
});

test("survey settings validate external links and enforce member visibility", async (t) => {
  assert.throws(() => surveySettingsSchema.parse({
    title: "Survey",
    description: "Description",
    externalUrl: "http://forms.example.test/survey",
    isActive: true,
  }));
  assert.throws(() => surveySettingsSchema.parse({
    title: "",
    description: "",
    externalUrl: "",
    isActive: true,
  }));
  assert.throws(() => surveySettingsSchema.parse({
    title: "Scheduled survey",
    description: "Description",
    externalUrl: "https://forms.example.test/survey",
    isActive: true,
    startsAt: "2026-09-01T00:00:00.000Z",
    endsAt: null,
  }));
  assert.throws(() => surveySettingsSchema.parse({
    title: "Scheduled survey",
    description: "Description",
    externalUrl: "https://forms.example.test/survey",
    isActive: true,
    startsAt: "2026-09-02T00:00:00.000Z",
    endsAt: "2026-09-01T00:00:00.000Z",
  }));

  const boundaryStart = new Date("2026-09-01T00:00:00.000Z");
  const boundaryEnd = new Date("2026-09-02T00:00:00.000Z");
  const scheduledSettings = {
    isActive: true,
    startsAt: boundaryStart,
    endsAt: boundaryEnd,
  };
  assert.equal(getSurveyStatus({ ...scheduledSettings, isActive: false }, boundaryStart), "inactive");
  assert.equal(getSurveyStatus(scheduledSettings, new Date(boundaryStart.getTime() - 1)), "upcoming");
  assert.equal(isSurveyVisible(scheduledSettings, boundaryStart), true);
  assert.equal(isSurveyVisible(scheduledSettings, new Date(boundaryEnd.getTime() - 1)), true);
  assert.equal(getSurveyStatus(scheduledSettings, boundaryEnd), "ended");
  assert.equal(isSurveyVisible({ isActive: true, startsAt: null, endsAt: null }, boundaryEnd), true);

  if (!databaseAvailable) {
    t.skip("DATABASE_URL is not configured");
    return;
  }

  const { db, storage } = await getDatabase();
  const originalSessionSecret = process.env.SESSION_SECRET;
  if (!process.env.SESSION_SECRET) {
    process.env.SESSION_SECRET = `survey-settings-test-${randomUUID()}`;
  }
  const suffix = randomUUID();
  const originalSettings = await storage.getSurveySettings();
  const originalHistory = await db
    .select()
    .from(surveySettingsHistory)
    .where(eq(surveySettingsHistory.surveySettingsId, "default"));
  await db
    .delete(surveySettingsHistory)
    .where(eq(surveySettingsHistory.surveySettingsId, "default"));
  await db.delete(surveySettings).where(eq(surveySettings.id, "default"));
  let createdSurveyId: string | undefined;
  const admin = await storage.createUser({
    email: `survey-admin-${suffix}@example.test`,
    password: "test-password",
    name: "Survey Admin",
    role: "admin",
    userType: "staff",
  });
  const operator = await storage.createUser({
    email: `survey-operator-${suffix}@example.test`,
    password: "test-password",
    name: "Survey Operator",
    role: "operator",
    userType: "staff",
  });
  const member = await storage.createUser({
    email: `survey-member-${suffix}@example.test`,
    password: "test-password",
    name: "Survey Member",
    userType: "staff",
  });
  await storage.updateUserAuthorization(operator.id, {}, "operator");

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
      const responseText = await response.text();
      let body: unknown = responseText;
      try {
        body = JSON.parse(responseText);
      } catch {
        // Express uses plain text for its default 401 response.
      }
      return { status: response.status, body };
    };
    const adminToken = issueAuthToken(admin, process.env.SESSION_SECRET!);
    const operatorToken = issueAuthToken(operator, process.env.SESSION_SECRET!);
    const memberToken = issueAuthToken(member, process.env.SESSION_SECRET!);
    const activeSettings = {
      title: "회원 의견 조사",
      description: "협회 서비스 개선을 위한 설문입니다.",
      externalUrl: "https://forms.example.com/survey",
      displayOrder: 10,
      isActive: true,
    };

    assert.equal((await request("/api/survey")).status, 401);
    assert.equal((await request("/api/admin/survey", { token: memberToken })).status, 403);
    assert.equal((await request("/api/admin/survey", { token: operatorToken })).status, 200);

    const invalidUpdate = await request("/api/admin/survey", {
      token: operatorToken,
      method: "PUT",
      body: { ...activeSettings, externalUrl: "javascript:alert(1)" },
    });
    assert.equal(invalidUpdate.status, 400);

    const operatorUpdate = await request("/api/admin/survey", {
      token: operatorToken,
      method: "PUT",
      body: activeSettings,
    });
    assert.equal(operatorUpdate.status, 200);

    const memberSurvey = await request("/api/survey", { token: memberToken });
    assert.equal(memberSurvey.status, 200);
    assert.equal(Array.isArray(memberSurvey.body), true);
    assert.deepEqual(memberSurvey.body, [{
      id: "default",
      title: activeSettings.title,
      description: activeSettings.description,
      externalUrl: activeSettings.externalUrl,
      isActive: true,
    }]);
    assert.equal("updatedBy" in (memberSurvey.body[0] as Record<string, unknown>), false);

    const adminSurvey = await request("/api/admin/survey", { token: adminToken });
    assert.equal(adminSurvey.status, 200);
    assert.equal(adminSurvey.body.surveys.length, 1);
    assert.equal(adminSurvey.body.surveys[0].updatedBy, operator.id);
    assert.equal(adminSurvey.body.surveys[0].displayOrder, activeSettings.displayOrder);

    const secondSurvey = await request("/api/admin/survey", {
      token: adminToken,
      method: "POST",
      body: {
        title: "두 번째 설문",
        description: "추가 의견을 받습니다.",
        externalUrl: "https://forms.example.com/second",
        displayOrder: 1,
        isActive: true,
      },
    });
    assert.equal(secondSurvey.status, 201);
    const secondSurveyId = secondSurvey.body.id;
    createdSurveyId = secondSurveyId;
    assert.notEqual(secondSurveyId, "default");
    const orderedSurveys = await request("/api/survey", { token: memberToken });
    assert.deepEqual(orderedSurveys.body.map((survey: { id: string }) => survey.id), [secondSurveyId, "default"]);

    const futureStart = new Date(Date.now() + 60_000);
    const futureEnd = new Date(Date.now() + 120_000);
    const futureUpdate = await request("/api/admin/survey", {
      token: operatorToken,
      method: "PUT",
      body: {
        ...activeSettings,
        startsAt: futureStart.toISOString(),
        endsAt: futureEnd.toISOString(),
      },
    });
    assert.equal(futureUpdate.status, 200);
    assert.deepEqual((await request("/api/survey", { token: memberToken })).body, [orderedSurveys.body[0]]);

    const activeStart = new Date(Date.now() - 60_000);
    const activeEnd = new Date(Date.now() + 60_000);
    const scheduledUpdate = await request("/api/admin/survey", {
      token: adminToken,
      method: "PUT",
      body: {
        ...activeSettings,
        startsAt: activeStart.toISOString(),
        endsAt: activeEnd.toISOString(),
      },
    });
    assert.equal(scheduledUpdate.status, 200);
    const scheduledSurvey = await request("/api/survey", { token: memberToken });
    assert.equal(scheduledSurvey.status, 200);
    const scheduledDefault = scheduledSurvey.body.find((survey: { id: string }) => survey.id === "default");
    assert.equal(scheduledDefault.startsAt, activeStart.toISOString());
    assert.equal(scheduledDefault.endsAt, activeEnd.toISOString());
    assert.equal("updatedBy" in (scheduledDefault as Record<string, unknown>), false);

    const endedUpdate = await request("/api/admin/survey", {
      token: adminToken,
      method: "PUT",
      body: {
        ...activeSettings,
        startsAt: new Date(Date.now() - 120_000).toISOString(),
        endsAt: new Date(Date.now() - 60_000).toISOString(),
      },
    });
    assert.equal(endedUpdate.status, 200);
    assert.deepEqual((await request("/api/survey", { token: memberToken })).body, [orderedSurveys.body[0]]);

    const periodlessUpdate = await request("/api/admin/survey", {
      token: operatorToken,
      method: "PUT",
      body: { ...activeSettings, startsAt: null, endsAt: null },
    });
    assert.equal(periodlessUpdate.status, 200);
    const periodlessSurveys = (await request("/api/survey", { token: memberToken })).body;
    assert.equal(periodlessSurveys.length, 2);
    assert.deepEqual(
      periodlessSurveys.find((survey: { id: string }) => survey.id === "default"),
      {
        id: "default",
        title: activeSettings.title,
        description: activeSettings.description,
        externalUrl: activeSettings.externalUrl,
        isActive: true,
      },
    );

    const historyBeforeNoop = await request("/api/admin/survey/history?limit=2&page=1", {
      token: operatorToken,
    });
    assert.equal(historyBeforeNoop.status, 200);
    assert.equal(historyBeforeNoop.body.history.length, 2);
    assert.ok(historyBeforeNoop.body.total >= 5);
    assert.ok(historyBeforeNoop.body.history[0].version > historyBeforeNoop.body.history[1].version);
    assert.equal(historyBeforeNoop.body.history[0].changedBy, operator.id);
    assert.equal(historyBeforeNoop.body.history[0].changedByName, operator.name);
    assert.equal(
      (await request("/api/admin/survey/history", { token: memberToken })).status,
      403,
    );
    assert.equal(
      (await request("/api/admin/survey/history?limit=51", { token: adminToken })).status,
      400,
    );

    const noopUpdate = await request("/api/admin/survey", {
      token: adminToken,
      method: "PUT",
      body: { ...activeSettings, startsAt: null, endsAt: null },
    });
    assert.equal(noopUpdate.status, 200);
    const historyAfterNoop = await request("/api/admin/survey/history?limit=50&page=1", {
      token: adminToken,
    });
    assert.equal(historyAfterNoop.body.total, historyBeforeNoop.body.total);
    assert.equal(
      historyAfterNoop.body.history.at(-1).title,
      activeSettings.title,
    );

    const secondHistory = await request(
      `/api/admin/survey/history?surveyId=${secondSurveyId}&limit=50&page=1`,
      { token: adminToken },
    );
    assert.equal(secondHistory.status, 200);
    assert.equal(secondHistory.body.total, 1);
    assert.equal(secondHistory.body.history[0].title, "두 번째 설문");

    const deactivatedSecond = await request(`/api/admin/survey/${secondSurveyId}`, {
      token: operatorToken,
      method: "DELETE",
    });
    assert.equal(deactivatedSecond.status, 200);
    const remainingSurvey = await request("/api/survey", { token: memberToken });
    assert.equal(remainingSurvey.body.length, 1);
    assert.equal(remainingSurvey.body[0].id, "default");
    const adminAfterDeactivate = await request("/api/admin/survey?page=1&limit=50", { token: adminToken });
    assert.equal(adminAfterDeactivate.body.surveys.find((survey: { id: string }) => survey.id === secondSurveyId).isActive, false);

    const snapshotVersion = historyBeforeNoop.body.snapshotVersion;
    const newVersion = await request("/api/admin/survey", {
      token: adminToken,
      method: "PUT",
      body: {
        ...activeSettings,
        title: "새 버전 설문",
        startsAt: null,
        endsAt: null,
      },
    });
    assert.equal(newVersion.status, 200);
    const stableSecondPage = await request(
      `/api/admin/survey/history?limit=2&page=2&snapshotVersion=${snapshotVersion}`,
      { token: adminToken },
    );
    assert.equal(stableSecondPage.status, 200);
    assert.equal(stableSecondPage.body.total, historyBeforeNoop.body.total);
    assert.equal(
      stableSecondPage.body.history.some((entry: { version: number }) => entry.version > snapshotVersion),
      false,
    );

    await db.delete(users).where(eq(users.id, operator.id));
    const preservedActorHistory = await request("/api/admin/survey/history?limit=50&page=1", {
      token: adminToken,
    });
    const operatorEntry = preservedActorHistory.body.history.find(
      (entry: { changedByName: string }) => entry.changedByName === operator.name,
    );
    assert.ok(operatorEntry);
    assert.equal(operatorEntry.changedBy, null);
    assert.equal(operatorEntry.changedByName, operator.name);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => error ? reject(error) : resolve()),
    );
    if (createdSurveyId) {
      await db.delete(surveySettingsHistory)
        .where(eq(surveySettingsHistory.surveySettingsId, createdSurveyId));
      await db.delete(surveySettings).where(eq(surveySettings.id, createdSurveyId));
    }
    await db
      .delete(surveySettingsHistory)
      .where(eq(surveySettingsHistory.surveySettingsId, "default"));
    await db.delete(surveySettings).where(eq(surveySettings.id, "default"));
    if (originalSettings) {
      await db.insert(surveySettings).values(originalSettings);
      if (originalHistory.length > 0) {
        await db.insert(surveySettingsHistory).values(originalHistory);
      }
    }
    await db.delete(users).where(inArray(users.id, [admin.id, operator.id, member.id]));
    if (originalSessionSecret === undefined) {
      delete process.env.SESSION_SECRET;
    } else {
      process.env.SESSION_SECRET = originalSessionSecret;
    }
  }
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

test("partner contracts trim text, bound values, and allow only HTTP(S) URLs", () => {
  const parsed = insertPartnerSchema.parse({
    name: "  Partner Name  ",
    nameEn: "  Partner Name EN  ",
    nameZh: "   ",
    logo: "  https://cdn.example.test/logo.svg  ",
    website: "https://partner.example.test",
    description: "  A partner description  ",
    category: "partner",
    order: 4,
    isActive: true,
  });

  assert.equal(parsed.name, "Partner Name");
  assert.equal(parsed.nameEn, "Partner Name EN");
  assert.equal(parsed.nameZh, null);
  assert.equal(parsed.logo, "https://cdn.example.test/logo.svg");
  assert.equal(parsed.description, "A partner description");

  for (const unsafeUrl of ["javascript:alert(1)", "data:text/html,unsafe", "ftp://partner.example.test/logo"]) {
    assert.throws(() => insertPartnerSchema.parse({
      name: "Partner",
      logo: unsafeUrl,
      category: "partner",
    }));
  }
  assert.throws(() => insertPartnerSchema.parse({
    name: " ",
    logo: "https://cdn.example.test/logo.svg",
    category: "partner",
  }));
  assert.throws(() => insertPartnerSchema.parse({
    name: "Partner",
    logo: "https://cdn.example.test/logo.svg",
    category: "partner",
    description: "x".repeat(2_001),
  }));
  assert.throws(() => insertPartnerSchema.parse({
    name: "Partner",
    logo: "https://cdn.example.test/logo.svg",
    category: "partner",
    order: 10_001,
  }));
  assert.throws(() => updatePartnerSchema.parse({}));
  assert.throws(() => updatePartnerSchema.parse({ website: "javascript:alert(1)" }));
});

test(
  "partner routes enforce admin CRUD and keep inactive partners private",
  { skip: !databaseAvailable },
  async () => {
    const originalSessionSecret = process.env.SESSION_SECRET;
    if (!process.env.SESSION_SECRET) {
      process.env.SESSION_SECRET = `partner-route-test-${randomUUID()}`;
    }
    const [{ registerRoutes }, { storage }] = await Promise.all([
      import("./routes"),
      import("./storage"),
    ]);
    const { db } = await import("./db");
    const adminId = randomUUID();
    const memberId = randomUUID();
    const operatorEmail = `partner-operator-${randomUUID()}@example.test`;
    const partnerId = randomUUID();
    const createdId = randomUUID();
    const now = new Date();
    let partner = {
      id: partnerId,
      name: "Existing Partner",
      nameEn: null,
      nameZh: null,
      logo: "https://cdn.example.test/existing.svg",
      website: "https://existing.example.test",
      description: "Existing description",
      descriptionEn: null,
      descriptionZh: null,
      category: "partner",
      isActive: true,
      order: 1,
      createdAt: now,
    };
    const createdPartner = {
      ...partner,
      id: createdId,
      name: "Created Partner",
      logo: "https://cdn.example.test/created.svg",
    };
    const unsafeLegacyPartner = {
      ...partner,
      id: randomUUID(),
      name: "Unsafe Legacy Partner",
      logo: "javascript:alert(1)",
      website: "data:text/html,unsafe",
    };
    let deleted = false;
    const operator = await storage.createUser({
      email: operatorEmail,
      password: "test-password",
      name: "Partner Operator",
      role: "operator",
      userType: "staff",
    });
    const [operatorTier] = await db
      .select()
      .from(tiers)
      .where(eq(tiers.code, "MEMBER"))
      .limit(1);
    const [operatorRole] = await db
      .select()
      .from(roles)
      .where(eq(roles.code, "operator"))
      .limit(1);
    assert.ok(operatorTier, "ACL seed must include the MEMBER tier");
    assert.ok(operatorRole, "ACL seed must include the operator role");
    await db.insert(userMemberships).values({
      userId: operator.id,
      tierId: operatorTier.id,
      roleId: operatorRole.id,
    });
    const originalMethods = {
      getUser: storage.getUser,
      getPartners: storage.getPartners,
      getPartner: storage.getPartner,
      createPartner: storage.createPartner,
      updatePartner: storage.updatePartner,
      deletePartner: storage.deletePartner,
    };
    storage.getUser = async (id) => {
      if (id === adminId) {
        return {
          id: adminId,
          email: "partner-admin@example.test",
          password: "not-returned",
          name: "Partner Admin",
          role: "admin",
          userType: "staff",
          membershipTier: "free",
          isActive: true,
        } as any;
      }
      if (id === memberId) {
        return {
          id: memberId,
          email: "partner-member@example.test",
          password: "not-returned",
          name: "Partner Member",
          role: "user",
          userType: "staff",
          membershipTier: "free",
          isActive: true,
        } as any;
      }
      if (id === operator.id) {
        return {
          ...operator,
          password: "not-returned",
          isActive: true,
        } as any;
      }
      return undefined;
    };
    storage.getPartners = async (filters) => {
      const visiblePartners = deleted
        ? []
        : filters?.active === true
          ? (partner.isActive ? [partner, unsafeLegacyPartner] : [unsafeLegacyPartner])
          : [partner];
      return {
        partners: visiblePartners,
        total: visiblePartners.length,
      };
    };
    storage.getPartner = async (id) => !deleted && id === partner.id ? partner : undefined;
    storage.createPartner = async () => createdPartner;
    storage.updatePartner = async (_id, updates) => {
      partner = { ...partner, ...updates };
      return partner;
    };
    storage.deletePartner = async (id) => {
      if (id === partner.id) {
        deleted = true;
      }
    };

    const app = express();
    app.use(express.json());
    const server = await registerRoutes(app);
    const adminToken = jwt.sign({ id: adminId }, process.env.SESSION_SECRET!);
    const memberToken = jwt.sign({ id: memberId }, process.env.SESSION_SECRET!);
    const operatorToken = jwt.sign({ id: operator.id }, process.env.SESSION_SECRET!);

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
        const text = await response.text();
        let body: unknown = text;
        try {
          body = JSON.parse(text);
        } catch {
          // Keep plain text responses available for assertions when needed.
        }
        return { status: response.status, body };
      };
      const validPayload = {
        name: "Created Partner",
        logo: "https://cdn.example.test/created.svg",
        website: "https://created.example.test",
        category: "partner",
        description: "Created description",
        isActive: true,
        order: 2,
      };

      assert.equal((await request("/api/partners")).status, 200);
      const publicPartners = await request("/api/partners");
      assert.equal(publicPartners.status, 200);
      assert.equal((publicPartners.body as any).partners.length, 1);
      assert.equal((publicPartners.body as any).partners[0].id, partner.id);
      assert.equal((await request("/api/partners", { token: memberToken })).body.partners.length, 1);
      assert.equal((await request("/api/partners/not-an-uuid", {
        token: adminToken,
        method: "PUT",
        body: { name: "Invalid ID" },
      })).status, 400);
      assert.equal((await request("/api/partners/not-an-uuid", {
        token: adminToken,
        method: "DELETE",
      })).status, 400);
      assert.equal((await request("/api/partners", {
        token: memberToken,
        method: "POST",
        body: validPayload,
      })).status, 403);
      const operatorList = await request("/api/partners?admin=true", { token: operatorToken });
      assert.equal(operatorList.status, 200);
      assert.equal((operatorList.body as any).partners[0].id, partner.id);
      const operatorCreate = await request("/api/partners", {
        token: operatorToken,
        method: "POST",
        body: validPayload,
      });
      assert.equal(operatorCreate.status, 201);
      const operatorUpdate = await request(`/api/partners/${partnerId}`, {
        token: operatorToken,
        method: "PUT",
        body: { name: "Updated by Operator" },
      });
      assert.equal(operatorUpdate.status, 200);
      assert.equal((operatorUpdate.body as any).name, "Updated by Operator");
      assert.equal((await request("/api/partners", {
        token: adminToken,
        method: "POST",
        body: { ...validPayload, logo: "javascript:alert(1)" },
      })).status, 400);
      assert.equal((await request("/api/partners", {
        token: adminToken,
        method: "POST",
        body: validPayload,
      })).status, 201);

      const update = await request(`/api/partners/${partnerId}`, {
        token: adminToken,
        method: "PUT",
        body: { name: "Updated Partner", isActive: false },
      });
      assert.equal(update.status, 200);
      assert.equal((update.body as any).name, "Updated Partner");
      assert.equal((update.body as any).isActive, false);
      assert.equal((await request(`/api/partners/${partnerId}`, {
        token: adminToken,
        method: "PUT",
        body: { website: "data:text/html,unsafe" },
      })).status, 400);
      assert.deepEqual((await request("/api/partners")).body.partners, []);
      assert.equal(
        (await request("/api/partners?admin=true", { token: adminToken })).body.partners[0].isActive,
        false,
      );

      assert.equal((await request(`/api/partners/${partnerId}`, {
        token: adminToken,
        method: "DELETE",
      })).status, 200);
      assert.equal((await request(`/api/partners/${partnerId}`, {
        token: adminToken,
        method: "DELETE",
      })).status, 404);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      storage.getUser = originalMethods.getUser;
      storage.getPartners = originalMethods.getPartners;
      storage.getPartner = originalMethods.getPartner;
      storage.createPartner = originalMethods.createPartner;
      storage.updatePartner = originalMethods.updatePartner;
      storage.deletePartner = originalMethods.deletePartner;
      await db.delete(userMemberships).where(eq(userMemberships.userId, operator.id));
      await db.delete(users).where(eq(users.id, operator.id));
      if (originalSessionSecret === undefined) delete process.env.SESSION_SECRET;
      else process.env.SESSION_SECRET = originalSessionSecret;
    }
  },
);

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
        () => storage.deleteUserAccount(responder.id),
        (error: unknown) =>
          error instanceof UserDeletionError
          && error.code === "HAS_INQUIRY_HISTORY",
      );

      await assert.rejects(
        () => storage.createInquiry(inquiryInput),
        (error: unknown) => error instanceof DuplicateInquiryError,
      );
    } finally {
      await db.delete(inquiries).where(eq(inquiries.id, inquiry.id));
      await db.delete(users).where(inArray(users.id, [admin.id, responder.id]));
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

test("scheduled publications respect clock boundaries, restart retries, and idempotency", async () => {
  const scheduledAt = new Date("2026-08-31T12:00:00.000Z");
  const before = new Date(scheduledAt.getTime() - 1);
  const resource = {
    id: randomUUID(),
    postType: "resource",
    status: "draft",
    visibility: "public",
    slug: "scheduled-resource",
    primaryLocale: "ko",
    authorId: randomUUID(),
    publishedAt: null,
    scheduledAt,
    expiresAt: null,
    createdAt: before,
    updatedAt: before,
  } as any;
  const fileMeta = {
    id: randomUUID(),
    postId: resource.id,
    key: "resource.fileUrl",
    value: null,
    valueText: "/objects/scheduled-resource",
    valueNumber: null,
    valueBoolean: null,
    valueTimestamp: null,
    createdAt: before,
    updatedAt: before,
  } as any;
  let claimCount = 0;
  let aclAttempts = 0;
  let aclFailuresRemaining = 1;
  let marker: string | undefined;
  const fakeStorage = {
    claimDueScheduledPosts: async (now: Date, _limit: number) => {
      if (now < scheduledAt || claimCount > 0) return [];
      claimCount += 1;
      resource.status = "published";
      resource.publishedAt = scheduledAt;
      resource.updatedAt = now;
      return [resource];
    },
    getResourcePostsNeedingAcl: async (_now: Date, _limit: number) =>
      resource.status === "published" ? [resource] : [],
    getPostMeta: async (_postId: string, key: string) =>
      key === "resource.fileUrl"
        ? fileMeta
        : marker
          ? { ...fileMeta, key, valueText: marker }
          : undefined,
    markResourceAclSynchronized: async (_postId: string, nextMarker: string) => {
      marker = nextMarker;
    },
  };
  const events: string[] = [];
  const objectStorage = {
    updateObjectEntityAclVisibility: async () => {
      aclAttempts += 1;
      if (aclFailuresRemaining > 0) {
        aclFailuresRemaining -= 1;
        throw new Error("temporary object storage failure");
      }
      return "/objects/scheduled-resource";
    },
  };
  const options = {
    storage: fakeStorage,
    logger: (event: string) => events.push(event),
    objectStorageFactory: () => objectStorage,
  };

  const beforeRun = await new ScheduledPublicationRunner(options).runOnce(before);
  assert.deepEqual(beforeRun, { published: 0, aclSynchronized: 0, failures: 0 });
  assert.equal(resource.status, "draft");

  const firstDueRun = await new ScheduledPublicationRunner(options).runOnce(scheduledAt);
  assert.equal(firstDueRun.published, 1);
  assert.equal(firstDueRun.aclSynchronized, 0);
  assert.equal(firstDueRun.failures, 1);
  assert.equal(resource.publishedAt, scheduledAt);

  // A restarted worker cannot claim the already-published row, but it retries
  // the ACL operation whose durable marker was not written.
  const restartedRun = await new ScheduledPublicationRunner(options).runOnce(
    new Date(scheduledAt.getTime() + 1),
  );
  assert.deepEqual(restartedRun, { published: 0, aclSynchronized: 1, failures: 0 });
  assert.equal(claimCount, 1);
  assert.equal(aclAttempts, 2);

  const idempotentRun = await new ScheduledPublicationRunner(options).runOnce(
    new Date(scheduledAt.getTime() + 2),
  );
  assert.deepEqual(idempotentRun, { published: 0, aclSynchronized: 0, failures: 0 });
  assert.equal(aclAttempts, 2);
  assert.ok(events.includes("posts_published"));
  assert.ok(events.includes("resource_acl_sync_failed"));
});

test("scheduled post rules reject conflicting states and resource ACLs follow time windows", () => {
  const scheduledAt = new Date("2026-08-31T12:00:00.000Z");
  assert.throws(
    () => validatePostSchedule({
      status: "published",
      publishedAt: null,
      scheduledAt,
      expiresAt: null,
    }),
    (error: unknown) => error instanceof InvalidPostScheduleError,
  );
  assert.throws(
    () => validatePostSchedule({
      status: "draft",
      publishedAt: null,
      scheduledAt,
      expiresAt: scheduledAt,
    }),
    (error: unknown) => error instanceof InvalidPostScheduleError,
  );
  assert.doesNotThrow(() => validatePostSchedule({
    status: "draft",
    publishedAt: null,
    scheduledAt: new Date(scheduledAt.getTime() - 60_000),
    expiresAt: null,
  }));

  const expiresAt = new Date(scheduledAt.getTime() + 60_000);
  const post = {
    status: "published",
    visibility: "public",
    publishedAt: scheduledAt,
    expiresAt,
  } as any;
  assert.equal(
    getResourceObjectAclVisibility(post, new Date(scheduledAt.getTime() - 1)),
    "private",
  );
  assert.equal(getResourceObjectAclVisibility(post, scheduledAt), "public");
  assert.equal(
    getResourceObjectAclVisibility(post, expiresAt),
    "private",
  );
});

test("post metadata contracts keep public and management fields separate", () => {
  assert.equal(isMetaKeyForPostType("news", "news.category"), true);
  assert.equal(isMetaKeyForPostType("event", "news.category"), false);
  assert.equal(getMetaValueType("event.eventDate"), "timestamp");
  assert.equal(getMetaValueType("event.fee"), "number");

  assert.equal(canExposeMetaKey("news", "news.images", false), true);
  assert.equal(canExposeMetaKey("news", "news.viewCount", false), false);
  assert.equal(canExposeMetaKey("news", "internal.workflow", false), false);
  assert.equal(canExposeMetaKey("news", "news.viewCount", true), true);

  assert.doesNotThrow(() =>
    validatePostMetaValue("event", "event.capacity", 100),
  );
  assert.doesNotThrow(() =>
    validatePostMetaValue("event", "event.eventDate", new Date()),
  );
  assert.throws(() =>
    validatePostMetaValue("event", "event.capacity", "100"),
  );
  assert.throws(() =>
    validatePostMetaValue("event", "event.eventDate", "2026-09-01"),
  );
  assert.throws(() =>
    validatePostMetaValue("news", "event.fee", 100),
  );
});

test(
  "post metadata responses are filtered for public, member, editor, and administrator access",
  { skip: !databaseAvailable },
  async () => {
    const { db, storage } = await getDatabase();
    const originalSessionSecret = process.env.SESSION_SECRET;
    if (!process.env.SESSION_SECRET) {
      process.env.SESSION_SECRET = `post-meta-test-${randomUUID()}`;
    }
    const suffix = randomUUID();
    const admin = await storage.createUser({
      email: `post-meta-admin-${suffix}@example.test`,
      password: "test-password",
      name: "Post Metadata Admin",
      role: "admin",
      userType: "staff",
    });
    const member = await storage.createUser({
      email: `post-meta-member-${suffix}@example.test`,
      password: "test-password",
      name: "Post Metadata Member",
      userType: "staff",
    });
    const post = await storage.createPost({
      postType: "news",
      status: "published",
      visibility: "public",
      slug: `post-meta-${suffix}`,
      primaryLocale: "ko",
      authorId: admin.id,
      publishedAt: new Date(Date.now() - 60_000),
    });

    await db.insert(postMeta).values([
      {
        postId: post.id,
        key: "news.category",
        valueText: "notice",
      },
      {
        postId: post.id,
        key: "news.viewCount",
        valueNumber: 17,
      },
      {
        postId: post.id,
        key: "internal.workflow",
        valueText: "review",
      },
    ]);

    const editorAccess: PostAccessContext = {
      userId: member.id,
      isAdmin: false,
      isEditor: true,
      managedPostTypes: new Set(["news"]),
      canReadMembers: false,
      canReadPremium: false,
    };
    const adminAccess: PostAccessContext = {
      ...editorAccess,
      userId: admin.id,
      isAdmin: true,
      isEditor: false,
    };
    const createdPostIds: string[] = [];

    const publicPost = await storage.getPostWithTranslations(post.id, undefined, publicPostAccess);
    const memberPost = await storage.getPostWithTranslations(
      post.id,
      undefined,
      { ...publicPostAccess, userId: member.id },
    );
    const editorPost = await storage.getPostWithTranslations(post.id, undefined, editorAccess);
    const adminPost = await storage.getPostWithTranslations(post.id, undefined, adminAccess);
    assert.deepEqual(publicPost?.meta.map(({ key }) => key), ["news.category"]);
    assert.deepEqual(memberPost?.meta.map(({ key }) => key), ["news.category"]);
    assert.deepEqual(editorPost?.meta.map(({ key }) => key).sort(), [
      "internal.workflow",
      "news.category",
      "news.viewCount",
    ]);
    assert.deepEqual(adminPost?.meta.map(({ key }) => key).sort(), [
      "internal.workflow",
      "news.category",
      "news.viewCount",
    ]);

    const publicList = await storage.getPosts({
      postType: "news",
      status: "published",
      search: post.slug,
      compact: true,
      access: publicPostAccess,
    });
    assert.deepEqual(publicList.posts[0]?.meta.map(({ key }) => key), ["news.category"]);

    const [{ registerRoutes }] = await Promise.all([import("./routes")]);
    const app = express();
    app.use(express.json());
    const server = await registerRoutes(app);
    const tokenFor = (id: string) => jwt.sign({ id }, process.env.SESSION_SECRET!);
    const request = (
      path: string,
      token: string,
      options: { method?: string; body?: unknown } = {},
    ) =>
      fetch(`http://127.0.0.1:${(server.address() as any).port}${path}`, {
        method: options.method,
        headers: { Authorization: `Bearer ${token}` },
        ...(options.body !== undefined
          ? {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(options.body),
            }
          : {}),
      });

    try {
      await new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, resolve);
      });
      const publicMeta = await request(`/api/posts/${post.id}/meta`, tokenFor(member.id));
      assert.equal(publicMeta.status, 200);
      assert.deepEqual((await publicMeta.json()).map(({ key }: { key: string }) => key), ["news.category"]);

      const hiddenKey = await request(
        `/api/posts/${post.id}/meta?key=news.viewCount`,
        tokenFor(member.id),
      );
      assert.equal(hiddenKey.status, 404);

      const adminMeta = await request(
        `/api/posts/${post.id}/meta?admin=true`,
        tokenFor(admin.id),
      );
      assert.equal(adminMeta.status, 200);
      assert.deepEqual((await adminMeta.json()).map(({ key }: { key: string }) => key).sort(), [
        "internal.workflow",
        "news.category",
        "news.viewCount",
      ]);

      const rejectedAuthorCreate = await request("/api/posts", tokenFor(admin.id), {
        method: "POST",
        body: {
          postType: "news",
          slug: `rejected-author-${suffix}`,
          primaryLocale: "ko",
          status: "draft",
          visibility: "public",
          authorId: member.id,
        },
      });
      assert.equal(rejectedAuthorCreate.status, 400);

      const actorOwnedCreate = await request("/api/posts", tokenFor(admin.id), {
        method: "POST",
        body: {
          postType: "news",
          slug: `actor-owned-${suffix}`,
          primaryLocale: "ko",
          status: "draft",
          visibility: "public",
        },
      });
      assert.equal(actorOwnedCreate.status, 201);
      const actorOwnedPost = await actorOwnedCreate.json();
      createdPostIds.push(actorOwnedPost.id);
      assert.equal(actorOwnedPost.authorId, admin.id);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await db.delete(posts).where(inArray(posts.id, createdPostIds));
      await db.delete(posts).where(eq(posts.id, post.id));
      await db.delete(users).where(inArray(users.id, [admin.id, member.id]));
      if (originalSessionSecret === undefined) delete process.env.SESSION_SECRET;
      else process.env.SESSION_SECRET = originalSessionSecret;
    }
  },
);

test(
  "database scheduled claims are bounded, idempotent, and reconcile resource ACL markers",
  { skip: !databaseAvailable },
  async () => {
    const { db, storage } = await getDatabase();
    const now = new Date("2026-08-31T12:00:00.000Z");
    const suffix = randomUUID();
    const [futurePost, duePost, expiredPost, invalidPost, resourcePost, manualPost] = await db
      .insert(posts)
      .values([
        {
          postType: "news",
          status: "draft",
          visibility: "public",
          slug: `schedule-future-${suffix}`,
          primaryLocale: "ko",
          scheduledAt: new Date(now.getTime() + 60_000),
        },
        {
          postType: "news",
          status: "draft",
          visibility: "public",
          slug: `schedule-due-${suffix}`,
          primaryLocale: "ko",
          scheduledAt: now,
        },
        {
          postType: "news",
          status: "draft",
          visibility: "public",
          slug: `schedule-expired-${suffix}`,
          primaryLocale: "ko",
          scheduledAt: new Date(now.getTime() - 60_000),
          expiresAt: new Date(now.getTime() - 1),
        },
        {
          postType: "news",
          status: "draft",
          visibility: "public",
          slug: `schedule-invalid-${suffix}`,
          primaryLocale: "ko",
          scheduledAt: new Date(now.getTime() - 60_000),
          expiresAt: new Date(now.getTime() - 60_000),
        },
        {
          postType: "resource",
          status: "draft",
          visibility: "public",
          slug: `schedule-resource-${suffix}`,
          primaryLocale: "ko",
          scheduledAt: now,
          expiresAt: new Date(now.getTime() + 60_000),
        },
        {
          postType: "news",
          status: "draft",
          visibility: "public",
          slug: `schedule-manual-${suffix}`,
          primaryLocale: "ko",
          scheduledAt: new Date(now.getTime() + 120_000),
        },
      ])
      .returning();
    await db.insert(postMeta).values({
      postId: resourcePost.id,
      key: "resource.fileUrl",
      valueText: `/objects/scheduled-${suffix}`,
    });

    try {
      assert.deepEqual(
        (await storage.claimDueScheduledPosts(new Date(now.getTime() - 1), 10))
          .map(({ id }) => id),
        [],
      );
      const claimed = await storage.claimDueScheduledPosts(now, 10);
      assert.deepEqual(
        claimed.map(({ id }) => id).sort(),
        [duePost.id, resourcePost.id].sort(),
      );
      assert.equal(claimed.find(({ id }) => id === resourcePost.id)?.publishedAt?.getTime(), now.getTime());
      assert.deepEqual(
        (await storage.claimDueScheduledPosts(new Date(now.getTime() + 1), 10))
          .map(({ id }) => id),
        [],
      );

      const aclCandidates = await storage.getResourcePostsNeedingAcl(now, 10);
      assert.deepEqual(aclCandidates.map(({ id }) => id), [resourcePost.id]);
      const marker = getResourceAclSyncMarker(
        resourcePostFromClaim(claimed, resourcePost),
        getResourceObjectAclVisibility(resourcePostFromClaim(claimed, resourcePost), now),
      );
      await storage.markResourceAclSynchronized(resourcePost.id, marker);
      assert.deepEqual(
        (await storage.getResourcePostsNeedingAcl(now, 10)).map(({ id }) => id),
        [],
      );
      assert.deepEqual(
        (await storage.getResourcePostsNeedingAcl(
          new Date(now.getTime() + 60_000),
          10,
        )).map(({ id }) => id),
        [resourcePost.id],
      );
      assert.equal((await storage.getPost(futurePost.id))?.status, "draft");
      assert.equal((await storage.getPost(expiredPost.id))?.status, "draft");
      assert.equal((await storage.getPost(invalidPost.id))?.status, "draft");

      const manuallyPublished = await storage.updatePost(manualPost.id, {
        status: "published",
        publishedAt: now,
      });
      assert.equal(manuallyPublished?.scheduledAt, null);
      const manuallyRescheduled = await storage.updatePost(manualPost.id, {
        status: "draft",
        publishedAt: null,
        scheduledAt: new Date(now.getTime() + 120_000),
      });
      assert.equal(manuallyRescheduled?.status, "draft");
      assert.equal(manuallyRescheduled?.scheduledAt?.getTime(), now.getTime() + 120_000);
    } finally {
      await db.delete(posts).where(inArray(posts.id, [
        futurePost.id,
        duePost.id,
        expiredPost.id,
        invalidPost.id,
        resourcePost.id,
        manualPost.id,
      ]));
    }
  },
);

function resourcePostFromClaim(claimed: any[], fallback: any) {
  return claimed.find(({ id }) => id === fallback.id) || fallback;
}

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
      await db.delete(users).where(inArray(users.id, [admin.id, user.id]));
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
      await db.delete(users).where(inArray(users.id, [admin.id, user.id]));
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
  "collection page sizes stay bounded for invalid and oversized limits",
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
    const seededUsers = await db
      .insert(users)
      .values(
        Array.from({ length: 51 }, (_, index) => ({
          email: `collection-pagination-${randomUUID()}-${index}@example.test`,
          password: "test-password",
          name: `Pagination User ${index}`,
        })),
      )
      .returning({ id: users.id });
    const seededPartners = await db
      .insert(partners)
      .values(
        Array.from({ length: 51 }, (_, index) => ({
          name: `Pagination Partner ${index}`,
          logo: `https://example.test/logo-${index}.png`,
          category: "partner",
          isActive: true,
          order: index,
        })),
      )
      .returning({ id: partners.id });
    const seededOrganizationMembers = await db
      .insert(organizationMembers)
      .values(
        Array.from({ length: 51 }, (_, index) => ({
          name: `Pagination Organization Member ${index}`,
          position: "Member",
          category: "secretariat",
          isActive: true,
          sortOrder: index,
        })),
      )
      .returning({ id: organizationMembers.id });

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
      const userResults = await Promise.all([
        storage.getUsers({ limit: 10_000 }),
        storage.getUsers({ limit: -10 }),
        storage.getUsers({ limit: Number.NaN }),
      ]);
      const partnerResults = await Promise.all([
        storage.getPartners({ limit: 10_000 }),
        storage.getPartners({ limit: -10 }),
        storage.getPartners({ limit: Number.NaN }),
      ]);
      const organizationResults = await Promise.all([
        storage.getOrganizationMembers({ limit: 10_000 }),
        storage.getOrganizationMembers({ limit: -10 }),
        storage.getOrganizationMembers({ limit: Number.NaN }),
      ]);
      assert.equal(userResults[0].users.length, 50);
      assert.equal(userResults[1].users.length, 1);
      assert.equal(userResults[2].users.length, 50);
      assert.equal(partnerResults[0].partners.length, 50);
      assert.equal(partnerResults[1].partners.length, 1);
      assert.equal(partnerResults[2].partners.length, 50);
      assert.equal(organizationResults[0].members.length, 50);
      assert.equal(organizationResults[1].members.length, 1);
      assert.equal(organizationResults[2].members.length, 50);
      assert.equal(postResults[0].posts.length, 100);
      assert.equal(postResults[1].posts.length, 1);
      assert.equal(postResults[2].posts.length, 50);
    } finally {
      await db.delete(organizationMembers).where(
        inArray(organizationMembers.id, seededOrganizationMembers.map(({ id }) => id)),
      );
      await db.delete(partners).where(
        inArray(partners.id, seededPartners.map(({ id }) => id)),
      );
      await db.delete(users).where(inArray(users.id, seededUsers.map(({ id }) => id)));
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
    storage.getOrganizationMembers = async (filters) => {
      const result = filters?.isActive === true
        ? [activeMember as any]
        : [activeMember as any, inactiveMember as any];
      return { members: result, total: result.length };
    };
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
      assert.deepEqual(publicList.body.members.map((member: any) => member.id), [activeMember.id]);
      assert.equal(publicList.body.total, 1);
      assert.equal(publicList.body.page, 1);
      assert.equal(publicList.body.totalPages, 1);

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
        adminList.body.members.map((member: any) => member.id),
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
    const originalReorderOrganizationMembers = storage.reorderOrganizationMembers;
    storage.getOrganizationMembers = async (filters) => {
      if (filters?.category === "executives") {
        const members = filters?.isActive === true
          ? [activeExecutive as any]
          : [activeExecutive as any, inactiveExecutive as any];
        return { members, total: members.length };
      }
      if (!filters?.category) {
        const members = filters?.categories
          ? [activeExecutive as any, inactiveExecutive as any, vicePresident as any]
          : [activeExecutive as any, inactiveExecutive as any, vicePresident as any, otherCategoryMember as any];
        return { members, total: members.length };
      }
      return { members: [otherCategoryMember as any], total: 1 };
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
    storage.reorderOrganizationMembers = async (category, memberIds) => {
      assert.equal(category, "executives");
      assert.deepEqual(memberIds, [inactiveExecutive.id, activeExecutive.id]);
      return [inactiveExecutive, activeExecutive] as any;
    };

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
        operatorList.body.members.map((member: any) => member.id),
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
          body: { name: "Updated Executive", category: "honorary" },
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
      const reordered = await request("/api/organization-members/reorder", {
        token: operatorToken,
        method: "PUT",
        body: {
          category: "executives",
          memberIds: [inactiveExecutive.id, activeExecutive.id],
        },
      });
      assert.equal(reordered.status, 200);
      assert.deepEqual(
        reordered.body.map((member: any) => member.id),
        [inactiveExecutive.id, activeExecutive.id],
      );
      assert.equal(
        (await request("/api/organization-members/reorder", {
          token: operatorToken,
          method: "PUT",
          body: {
            category: "secretariat",
            memberIds: [otherCategoryMember.id],
          },
        })).status,
        403,
      );
      assert.equal(
        (await request("/api/organization-members/reorder", {
          token: memberToken,
          method: "PUT",
          body: {
            category: "executives",
            memberIds: [inactiveExecutive.id, activeExecutive.id],
          },
        })).status,
        403,
      );
    } finally {
      storage.getOrganizationMembers = originalGetOrganizationMembers;
      storage.getOrganizationMember = originalGetOrganizationMember;
      storage.createOrganizationMember = originalCreateOrganizationMember;
      storage.updateOrganizationMember = originalUpdateOrganizationMember;
      storage.reorderOrganizationMembers = originalReorderOrganizationMembers;
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
    const operator = await storage.createUser({
      email: `member-operator-${suffix}@example.test`,
      password: "test-password",
      name: "Member Lifecycle Operator",
      role: "operator",
      userType: "staff",
    });
    await storage.updateUserAuthorization(operator.id, {}, "operator");

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
      const operatorToken = jwt.sign({ id: operator.id }, process.env.SESSION_SECRET!);
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

      const operatorCreate = await request("/api/admin/members", {
        token: operatorToken,
        method: "POST",
        body: {
          ...newProfile,
          companyName: "Operator Created Company",
          contactEmail: `operator-created-${suffix}@example.test`,
          membershipLevel: "regular",
          membershipStatus: "active",
          isPublic: true,
        },
      });
      assert.equal(operatorCreate.status, 201);
      assert.equal(operatorCreate.body.userId, null);
      assert.equal(operatorCreate.body.membershipStatus, "active");
      createdMemberIds.push(operatorCreate.body.id);

      const rejectedAdminCreate = await request("/api/admin/members", {
        token: ownerToken,
        method: "POST",
        body: {
          ...newProfile,
          companyName: "Unauthorized Admin Company",
          contactEmail: `unauthorized-admin-${suffix}@example.test`,
          membershipLevel: "regular",
          membershipStatus: "active",
          isPublic: true,
        },
      });
      assert.equal(rejectedAdminCreate.status, 403);

      const operatorList = await request("/api/admin/members", { token: operatorToken });
      assert.equal(operatorList.status, 200);
      assert.ok(operatorList.body.members.some((member: any) => member.id === pendingMember.id));
      assert.ok(operatorList.body.members.some((member: any) => member.id === operatorCreate.body.id));

      const operatorUpdate = await request(`/api/admin/members/${pendingMember.id}`, {
        token: operatorToken,
        method: "PUT",
        body: { membershipStatus: "inactive" },
      });
      assert.equal(operatorUpdate.status, 200);
      assert.equal(operatorUpdate.body.membershipStatus, "inactive");

      const operatorDeleteTarget = await createMember({});
      const operatorDelete = await request(`/api/members/${operatorDeleteTarget.id}`, {
        token: operatorToken,
        method: "DELETE",
      });
      assert.equal(operatorDelete.status, 200);

      const nowPublic = await request(`/api/members/${pendingMember.id}`);
      assert.equal(nowPublic.status, 404);

      const adminList = await request("/api/admin/members", { token: adminToken });
      assert.equal(adminList.status, 200);
      assert.ok(adminList.body.members.some((member: any) => member.id === pendingMember.id));
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => error ? reject(error) : resolve()),
      );
      await db.delete(members).where(inArray(members.id, createdMemberIds));
      await db.delete(users).where(inArray(users.id, [owner.id, otherOwner.id, admin.id, operator.id]));
      if (originalSessionSecret === undefined) {
        delete process.env.SESSION_SECRET;
      } else {
        process.env.SESSION_SECRET = originalSessionSecret;
      }
    }
  },
);
