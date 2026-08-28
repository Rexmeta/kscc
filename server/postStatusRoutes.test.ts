import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import express from "express";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
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