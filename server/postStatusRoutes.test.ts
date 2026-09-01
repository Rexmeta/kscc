import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import express from "express";
import jwt from "jsonwebtoken";
import { eq, inArray } from "drizzle-orm";
import {
  permissions,
  posts,
  rolePermissions,
  roles,
  tiers,
  userMemberships,
  users,
} from "@shared/schema";

const databaseAvailable = Boolean(process.env.DATABASE_URL);

test(
  "post status changes require publish permission and delete remains separately scoped",
  { skip: !databaseAvailable },
  async () => {
    const originalSessionSecret = process.env.SESSION_SECRET;
    if (!process.env.SESSION_SECRET) {
      process.env.SESSION_SECRET = `post-status-test-${randomUUID()}`;
    }

    const [{ registerRoutes }, { db }, { storage }] = await Promise.all([
      import("./routes"),
      import("./db"),
      import("./storage"),
    ]);

    const suffix = randomUUID();
    const [tier] = await db.insert(tiers).values({
      code: `STATUS_${suffix}`,
      name: "Post status test tier",
      annualFee: 0,
      benefits: [],
      order: 999,
    }).returning();
    const [publisherRole] = await db.insert(roles).values({
      code: `status-publisher-${suffix}`,
      name: "Status publisher",
    }).returning();
    const [nonPublisherRole] = await db.insert(roles).values({
      code: `status-reader-${suffix}`,
      name: "Status reader",
    }).returning();
    const [publishPermission] = await db
      .select()
      .from(permissions)
      .where(eq(permissions.key, "news.publish"))
      .limit(1);
    const [deletePermission] = await db
      .select()
      .from(permissions)
      .where(eq(permissions.key, "news.delete"))
      .limit(1);
    assert.ok(publishPermission, "ACL seed must include news.publish");
    assert.ok(deletePermission, "ACL seed must include news.delete");
    await db.insert(rolePermissions).values([
      {
        roleId: publisherRole.id,
        permissionId: publishPermission.id,
      },
      {
        roleId: publisherRole.id,
        permissionId: deletePermission.id,
      },
    ]);

    const admin = await storage.createUser({
      email: `status-admin-${suffix}@example.test`,
      password: "test-password",
      name: "Status Admin",
      role: "admin",
      userType: "staff",
    });
    const publisher = await storage.createUser({
      email: `status-publisher-${suffix}@example.test`,
      password: "test-password",
      name: "Status Publisher",
      role: "operator",
      userType: "staff",
    });
    const nonPublisher = await storage.createUser({
      email: `status-reader-${suffix}@example.test`,
      password: "test-password",
      name: "Status Reader",
      role: "operator",
      userType: "staff",
    });
    await db.insert(userMemberships).values([
      {
        userId: publisher.id,
        tierId: tier.id,
        roleId: publisherRole.id,
      },
      {
        userId: nonPublisher.id,
        tierId: tier.id,
        roleId: nonPublisherRole.id,
      },
    ]);
    const post = await storage.createPost({
      postType: "news",
      slug: `status-test-${suffix}`,
      primaryLocale: "ko",
      authorId: admin.id,
      status: "draft",
      visibility: "public",
      isFeatured: false,
      tags: [],
    });

    const app = express();
    app.use(express.json());
    const server = await registerRoutes(app);

    const tokenFor = (id: string) => jwt.sign({ id }, process.env.SESSION_SECRET!);
    const request = async (
      path: string,
      userId: string,
      method: "PATCH" | "DELETE",
      body?: unknown,
    ) => {
      const address = server.address();
      assert.ok(address && typeof address !== "string");
      return fetch(`http://127.0.0.1:${address.port}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${tokenFor(userId)}`,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    };

    try {
      await new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, resolve);
      });

      const publish = await request(
        `/api/posts/${post.id}/status`,
        publisher.id,
        "PATCH",
        { status: "published" },
      );
      assert.equal(publish.status, 200);
      const publishedPost = await publish.json();
      assert.equal(publishedPost.status, "published");
      assert.ok(publishedPost.publishedAt);

      const noOpPublish = await request(
        `/api/posts/${post.id}/status`,
        publisher.id,
        "PATCH",
        { status: "published" },
      );
      assert.equal(noOpPublish.status, 200);
      assert.equal((await noOpPublish.json()).publishedAt, publishedPost.publishedAt);

      const deniedUnpublish = await request(
        `/api/posts/${post.id}/status`,
        nonPublisher.id,
        "PATCH",
        { status: "draft" },
      );
      assert.equal(deniedUnpublish.status, 403);

      const unpublish = await request(
        `/api/posts/${post.id}/status`,
        publisher.id,
        "PATCH",
        { status: "draft" },
      );
      assert.equal(unpublish.status, 200);
      const unpublishedPost = await unpublish.json();
      assert.equal(unpublishedPost.status, "draft");
      assert.equal(unpublishedPost.publishedAt, null);

      const attemptedAuthorTransfer = await request(
        `/api/posts/${post.id}`,
        admin.id,
        "PATCH",
        { authorId: publisher.id },
      );
      assert.equal(attemptedAuthorTransfer.status, 400);
      assert.equal((await storage.getPost(post.id))?.authorId, admin.id);

      const attemptedCompleteAuthorTransfer = await request(
        `/api/posts/${post.id}`,
        admin.id,
        "PATCH",
        {
          post: { authorId: publisher.id },
          translation: { locale: "ko", title: "Should be rejected" },
          meta: [],
        },
      );
      assert.equal(attemptedCompleteAuthorTransfer.status, 400);
      assert.equal((await storage.getPost(post.id))?.authorId, admin.id);

      await storage.updatePost(post.id, { status: "archived" });
      const archivedPublish = await request(
        `/api/posts/${post.id}/status`,
        publisher.id,
        "PATCH",
        { status: "published" },
      );
      assert.equal(archivedPublish.status, 409);
      await storage.updatePost(post.id, { status: "draft" });

      const deniedDelete = await request(
        `/api/posts/${post.id}`,
        publisher.id,
        "DELETE",
      );
      assert.equal(deniedDelete.status, 403);

      const adminDelete = await request(
        `/api/posts/${post.id}`,
        admin.id,
        "DELETE",
      );
      assert.equal(adminDelete.status, 204);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await db.delete(posts).where(eq(posts.id, post.id));
      await db.delete(users).where(eq(users.id, publisher.id));
      await db.delete(users).where(eq(users.id, nonPublisher.id));
      await db.delete(users).where(eq(users.id, admin.id));
      await db.delete(rolePermissions).where(eq(rolePermissions.roleId, publisherRole.id));
      await db.delete(roles).where(eq(roles.id, publisherRole.id));
      await db.delete(roles).where(eq(roles.id, nonPublisherRole.id));
      await db.delete(tiers).where(eq(tiers.id, tier.id));
      if (originalSessionSecret === undefined) delete process.env.SESSION_SECRET;
      else process.env.SESSION_SECRET = originalSessionSecret;
    }
  },
);

test(
  "page ACLs let operators read and update translations without post lifecycle access",
  { skip: !databaseAvailable },
  async () => {
    const originalSessionSecret = process.env.SESSION_SECRET;
    if (!process.env.SESSION_SECRET) {
      process.env.SESSION_SECRET = `page-acl-test-${randomUUID()}`;
    }

    const [{ registerRoutes }, { db }, { storage }] = await Promise.all([
      import("./routes"),
      import("./db"),
      import("./storage"),
    ]);
    const suffix = randomUUID();
    const [tier] = await db.insert(tiers).values({
      code: `PAGE_${suffix}`,
      name: "Page ACL test tier",
      annualFee: 0,
      benefits: [],
      order: 999,
    }).returning();
    const [readerRole] = await db.insert(roles).values({
      code: `page-reader-${suffix}`,
      name: "Page reader",
    }).returning();
    const [editorRole] = await db.insert(roles).values({
      code: `page-editor-${suffix}`,
      name: "Page editor",
    }).returning();
    const [pageReadPermission] = await db
      .select()
      .from(permissions)
      .where(eq(permissions.key, "page.read"))
      .limit(1);
    const [pageUpdatePermission] = await db
      .select()
      .from(permissions)
      .where(eq(permissions.key, "page.update"))
      .limit(1);
    assert.ok(pageReadPermission, "ACL seed must include page.read");
    assert.ok(pageUpdatePermission, "ACL seed must include page.update");
    await db.insert(rolePermissions).values([
      { roleId: readerRole.id, permissionId: pageReadPermission.id },
      { roleId: editorRole.id, permissionId: pageReadPermission.id },
      { roleId: editorRole.id, permissionId: pageUpdatePermission.id },
    ]);

    const admin = await storage.createUser({
      email: `page-admin-${suffix}@example.test`,
      password: "test-password",
      name: "Page Admin",
      role: "admin",
      userType: "staff",
    });
    const reader = await storage.createUser({
      email: `page-reader-${suffix}@example.test`,
      password: "test-password",
      name: "Page Reader",
      role: "operator",
      userType: "staff",
    });
    const editor = await storage.createUser({
      email: `page-editor-${suffix}@example.test`,
      password: "test-password",
      name: "Page Editor",
      role: "operator",
      userType: "staff",
    });
    const member = await storage.createUser({
      email: `page-member-${suffix}@example.test`,
      password: "test-password",
      name: "Page Member",
      role: "user",
      userType: "staff",
    });
    await db.insert(userMemberships).values([
      { userId: reader.id, tierId: tier.id, roleId: readerRole.id },
      { userId: editor.id, tierId: tier.id, roleId: editorRole.id },
    ]);
    const page = await storage.createPost({
      postType: "page",
      slug: `page-acl-${suffix}`,
      primaryLocale: "ko",
      authorId: admin.id,
      status: "published",
      visibility: "public",
      isFeatured: false,
      tags: [],
      publishedAt: new Date(),
    });
    await storage.upsertPostTranslation({
      postId: page.id,
      locale: "ko",
      title: "Original page title",
      subtitle: null,
      excerpt: "Original excerpt",
      content: JSON.stringify({ section: "original" }),
    });

    const app = express();
    app.use(express.json());
    const server = await registerRoutes(app);
    const tokenFor = (id: string) => jwt.sign({ id }, process.env.SESSION_SECRET!);
    const request = async (
      path: string,
      userId: string,
      method = "GET",
      body?: unknown,
    ) => {
      const address = server.address();
      assert.ok(address && typeof address !== "string");
      return fetch(`http://127.0.0.1:${address.port}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${tokenFor(userId)}`,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    };

    try {
      await new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, resolve);
      });

      assert.equal(
        (await request(`/api/posts?postType=page&admin=true&search=${suffix}`, reader.id)).status,
        200,
      );
      assert.equal(
        (await request(`/api/posts/slug/${page.slug}?admin=true`, reader.id)).status,
        200,
      );
      assert.equal(
        (await request(`/api/posts/${page.id}/meta?admin=true`, reader.id)).status,
        200,
      );
      assert.equal(
        (await request(`/api/posts?postType=page&admin=true&search=${suffix}`, member.id)).status,
        403,
      );

      const deniedTranslation = await request(
        `/api/posts/${page.id}/translations`,
        reader.id,
        "POST",
        {
          locale: "ko",
          title: "Reader cannot update",
          subtitle: null,
          excerpt: null,
          content: "{}",
        },
      );
      assert.equal(deniedTranslation.status, 403);

      const updatedTranslation = await request(
        `/api/posts/${page.id}/translations`,
        editor.id,
        "POST",
        {
          locale: "en",
          title: "Updated English title",
          subtitle: null,
          excerpt: "Updated excerpt",
          content: JSON.stringify({ section: "updated" }),
        },
      );
      assert.equal(updatedTranslation.status, 200);
      const pageHistory = await request(
        `/api/posts/${page.id}/translation-history`,
        reader.id,
      );
      assert.equal(pageHistory.status, 200);
      const pageHistoryBody = await pageHistory.json();
      const englishChange = pageHistoryBody.history.find(
        (entry: { locale: string }) => entry.locale === "en",
      );
      assert.equal(englishChange.changedBy, editor.id);
      assert.equal(englishChange.changedByName, editor.name);
      assert.ok(englishChange.changedAt);
      assert.equal("content" in englishChange, false);

      const allPageHistory = await request("/api/posts/history", reader.id);
      assert.equal(allPageHistory.status, 200);
      assert.ok(
        (await allPageHistory.json()).history.some(
          (entry: { postId: string; locale: string }) =>
            entry.postId === page.id && entry.locale === "en",
        ),
      );
      const unchangedTranslation = await request(
        `/api/posts/${page.id}/translations`,
        editor.id,
        "POST",
        {
          locale: "en",
          title: "Updated English title",
          subtitle: null,
          excerpt: "Updated excerpt",
          content: JSON.stringify({ section: "updated" }),
        },
      );
      assert.equal(unchangedTranslation.status, 200);
      const historyAfterNoop = await request(
        `/api/posts/${page.id}/translation-history`,
        reader.id,
      );
      assert.equal(historyAfterNoop.status, 200);
      assert.equal(
        (await historyAfterNoop.json()).total,
        pageHistoryBody.total,
      );
      assert.equal(
        (await request(`/api/posts/${page.id}/translation-history`, member.id)).status,
        403,
      );
      assert.equal((await request("/api/posts/history", member.id)).status, 403);
      const publicPage = await request(`/api/posts/slug/${page.slug}?locale=en`, member.id);
      assert.equal(publicPage.status, 200);
      const publicTranslations = (await publicPage.json()).translations;
      assert.equal(
        publicTranslations.find((translation: { locale: string }) => translation.locale === "en").title,
        "Updated English title",
      );

      const deniedPublish = await request(
        `/api/posts/${page.id}/status`,
        editor.id,
        "PATCH",
        { status: "draft" },
      );
      assert.equal(deniedPublish.status, 403);
      const deniedDelete = await request(`/api/posts/${page.id}`, editor.id, "DELETE");
      assert.equal(deniedDelete.status, 403);
      const deniedCreate = await request(
        "/api/posts",
        editor.id,
        "POST",
        {
          postType: "page",
          slug: `new-page-${suffix}`,
          primaryLocale: "ko",
          status: "draft",
          visibility: "public",
          isFeatured: false,
          tags: [],
        },
      );
      assert.equal(deniedCreate.status, 403);

      const adminUpdate = await request(
        `/api/posts/${page.id}/translations`,
        admin.id,
        "POST",
        {
          locale: "zh",
          title: "管理员页面",
          subtitle: null,
          excerpt: null,
          content: "{}",
        },
      );
      assert.equal(adminUpdate.status, 200);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await db.delete(posts).where(eq(posts.id, page.id));
      await db.delete(users).where(inArray(users.id, [
        admin.id,
        reader.id,
        editor.id,
        member.id,
      ]));
      await db.delete(rolePermissions).where(inArray(rolePermissions.roleId, [
        readerRole.id,
        editorRole.id,
      ]));
      await db.delete(roles).where(inArray(roles.id, [readerRole.id, editorRole.id]));
      await db.delete(tiers).where(eq(tiers.id, tier.id));
      if (originalSessionSecret === undefined) delete process.env.SESSION_SECRET;
      else process.env.SESSION_SECRET = originalSessionSecret;
    }
  },
);