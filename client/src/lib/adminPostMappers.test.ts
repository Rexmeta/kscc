import assert from "node:assert/strict";
import { test } from "node:test";
import { resourceSchema } from "@/components/admin/adminSchemas";
import { mapEventFormToPost, mapPostToResourceForm, mapResourceFormToPost } from "./adminPostMappers";
import { enforceCreatePublishPermission } from "./adminPermissions";

test("event creation without publish permission always produces a draft", () => {
  const mapped = mapEventFormToPost({
    title: "Operator event draft",
    description: "Draft created by an operator",
    content: "",
    eventDate: "2026-09-01T10:00",
    location: "Seoul",
    category: "networking",
    eventType: "offline",
    fee: 0,
    images: [],
    isPublic: true,
    isPublished: enforceCreatePublishPermission(false, true),
  }, "operator-id");

  assert.equal(mapped.post.status, "draft");
  assert.equal(mapped.post.publishedAt, null);
});

test("resource form accepts and maps every administrator visibility choice", () => {
  for (const visibility of ["public", "members", "premium"] as const) {
    const formData = resourceSchema.parse({
      title: "Resource",
      category: "reports",
      visibility,
      isPublished: true,
    });
    const mapped = mapResourceFormToPost(formData, "admin-id");

    assert.equal(mapped.post.postType, "resource");
    assert.equal(mapped.post.visibility, visibility);
    assert.deepEqual(mapped.post.tags, ["reports"]);
    assert.equal(mapped.meta[0]?.key, "resource.category");
    assert.equal(mapped.meta[0]?.valueText, "reports");
  }
});

test("resource mapper restores visibility and uploaded file from an existing post", () => {
  const formData = mapResourceFormToResourcePostForm({
    visibility: "premium",
    fileUrl: "/objects/uploads/resource-file",
  });

  assert.equal(formData.visibility, "premium");
  assert.equal(formData.fileUrl, "/objects/uploads/resource-file");
});

function mapResourceToResourcePostForm(input: { visibility: "public" | "members" | "premium"; fileUrl: string }) {
  return {
    id: "post-id",
    postType: "resource",
    status: "published",
    visibility: input.visibility,
    slug: "resource",
    primaryLocale: "ko",
    authorId: null,
    coverImage: null,
    listImage: null,
    isFeatured: false,
    tags: [],
    publishedAt: new Date(),
    scheduledAt: null,
    expiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    translations: [{
      id: "translation-id",
      postId: "post-id",
      locale: "ko",
      title: "Resource",
      subtitle: null,
      excerpt: "",
      content: "",
      seoTitle: null,
      seoDescription: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }],
    meta: [{
      id: "meta-id",
      postId: "post-id",
      key: "resource.category",
      valueText: "reports",
      valueNumber: null,
      valueBoolean: null,
      valueTimestamp: null,
      value: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }, {
      id: "file-meta-id",
      postId: "post-id",
      key: "resource.fileUrl",
      valueText: input.fileUrl,
      valueNumber: null,
      valueBoolean: null,
      valueTimestamp: null,
      value: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }],
  };
}

function mapResourceFormToResourcePostForm(input: { visibility: "public" | "members" | "premium"; fileUrl: string }) {
  return mapPostToResourceForm(mapResourceToResourcePostForm(input));
}