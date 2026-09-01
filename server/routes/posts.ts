import { Router, type Request, Response } from "express";
import { EventRegistrationError, storage } from "../storage";
import { insertPostSchema, insertPostTranslationSchema } from "@shared/schema";
import { ObjectStorageService, getResourceObjectAclVisibility } from "../objectStorage";
import { emitOperationalEvent, getCorrelationId } from "../telemetry";
import type { Post } from "@shared/schema";
import { z } from "zod";
import { authenticateToken, optionalAuthenticateToken } from "../routes";
import { hasPermission } from "../permissions";
import {
  getPostPermissionKey,
  isManagedPostType,
  type PostAction,
} from "../postPermissions";
import {
  InvalidPostScheduleError,
  getResourceAclSyncMarker,
} from "../postScheduling";
import {
  canExposeMetaKey,
  PostMetaValidationError,
} from "@shared/postMetaKeys";
import "../types";

const router = Router();

async function canManagePost(
  req: Request,
  postType: string,
  action: PostAction,
): Promise<boolean> {
  if (req.user?.role === "admin") return true;
  if (!req.user?.id || !isManagedPostType(postType)) return false;

  const permission = getPostPermissionKey(postType, action);
  return permission ? hasPermission(req.user.id, permission) : false;
}

async function requirePostPermission(
  req: Request,
  res: Response,
  postType: string,
  action: PostAction,
): Promise<boolean> {
  if (!req.user?.id) {
    res.status(401).json({ message: "Authentication required" });
    return false;
  }

  if (await canManagePost(req, postType, action)) return true;

  res.status(403).json({
    message: "Insufficient permissions",
    required: isManagedPostType(postType) ? getPostPermissionKey(postType, action) : undefined,
  });
  return false;
}

function requireAdmin(req: Request, res: Response, next: () => void) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

// Validation schemas
const postQuerySchema = z.object({
  postType: z.enum(['news', 'event', 'resource', 'page']).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  visibility: z.enum(['public', 'members', 'premium', 'internal']).optional(),
  tags: z.string().optional(), // Comma-separated tags
  authorId: z.string().uuid().optional(),
  locale: z.enum(['ko', 'en', 'zh']).optional(),
  search: z.string().trim().max(100).optional(), // Search term for title/content/excerpt/slug
  category: z.string().trim().max(100).optional(),
  upcoming: z.enum(['true', 'false']).optional(), // Filter for current and upcoming events
  compact: z.enum(['true', 'false']).optional(),
  admin: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).max(10000).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

const postIdSchema = z.object({
  id: z.string().uuid(),
});
const localeQuerySchema = z.enum(['ko', 'en', 'zh']).optional();
const translationHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
}).strict();

const postMetaPayloadSchema = z.object({
  key: z.string().trim().min(1).max(100),
  value: z.unknown().optional(),
  valueText: z.string().nullable().optional(),
  valueNumber: z.number().nullable().optional(),
  valueBoolean: z.boolean().nullable().optional(),
  valueTimestamp: z.coerce.date().nullable().optional(),
}).strict();

const eventRegistrationRequestSchema = z.object({
  attendeeName: z.string().trim().min(1).max(200),
  attendeeEmail: z.string().trim().email().max(320),
  attendeePhone: z.string().trim().max(50).optional(),
  companyName: z.string().trim().max(200).optional(),
}).strict();

async function syncResourceObjectAcl(
  post: Post,
  ownerId: string,
  correlationId?: string,
): Promise<boolean> {
  if (post.postType !== "resource") return false;

  try {
    const fileMeta = await storage.getPostMeta(post.id, "resource.fileUrl");
    const fileUrl = fileMeta?.valueText ||
      (typeof fileMeta?.value === "string" ? fileMeta.value : "");
    if (!fileUrl) return false;

    const objectStorageService = new ObjectStorageService();
    const now = new Date();
    const visibility = getResourceObjectAclVisibility(post, now);
    await objectStorageService.updateObjectEntityAclVisibility(
      fileUrl,
      visibility,
      ownerId,
    );
    await storage.markResourceAclSynchronized(
      post.id,
      getResourceAclSyncMarker(post, visibility),
    );
    return true;
  } catch (error) {
    emitOperationalEvent("storage.failure", "error", {
      correlationId,
      operation: "sync_acl",
      errorType: error instanceof Error ? error.name : "UnknownError",
      result: "failed",
    });
    throw error;
  }
}

// GET /api/posts - List posts with filters
router.get("/", optionalAuthenticateToken, async (req: Request, res: Response) => {
  try {
    const query = postQuerySchema.parse(req.query);
    const adminMode = req.query.admin === "true";
    if (adminMode) {
      if (!query.postType) {
        return res.status(400).json({ message: "postType is required for admin post lists" });
      }
      if (!await requirePostPermission(req, res, query.postType, "read")) return;
    }

    const access = await storage.getPostAccessContext(
      req.user?.id,
      adminMode || req.user?.role === "admin",
    );
    
    // Parse tags from comma-separated string
    const tags = query.tags ? query.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined;
    
    // Parse upcoming filter for events
    const upcoming = query.upcoming === 'true' ? true : undefined;
    
    const page = adminMode ? (query.page || 1) : 1;
    const offset = adminMode
      ? (page - 1) * query.limit
      : query.offset;
    const posts = await storage.getPosts({
      postType: query.postType,
      status: query.status,
      visibility: query.visibility,
      tags,
      authorId: query.authorId,
      locale: query.locale,
      search: query.search,
      category: query.category,
      upcoming,
      compact: query.compact === 'true',
      limit: query.limit,
      offset,
      access,
    });
    
    if (adminMode) {
      res.json({
        ...posts,
        page,
        totalPages: Math.ceil(posts.total / query.limit),
      });
      return;
    }
    res.json(posts);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid query parameters", errors: error.errors });
    }
    emitOperationalEvent("post.operation", "error", {
      correlationId: getCorrelationId(req),
      operation: "list",
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/posts/resource/categories - Category counts for visible resources
router.get("/resource/categories", optionalAuthenticateToken, async (req: Request, res: Response) => {
  try {
    const access = await storage.getPostAccessContext(
      req.user?.id,
      req.user?.role === "admin",
    );
    const categories = await storage.getResourceCategoryCounts(access);
    res.json({ categories });
  } catch (error) {
    emitOperationalEvent("post.operation", "error", {
      correlationId: getCorrelationId(req),
      operation: "resource_categories",
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/posts/slug/:slug - Get single post by slug with translations
router.get("/slug/:slug", optionalAuthenticateToken, async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const locale = localeQuerySchema.parse(req.query.locale);
    const adminMode = req.query.admin === "true";

    if (adminMode) {
      const adminPost = await storage.getPostBySlug(slug);
      if (!adminPost) {
        return res.status(404).json({ message: "Post not found" });
      }
      if (!await requirePostPermission(req, res, adminPost.postType, "read")) return;
    }

    const access = await storage.getPostAccessContext(
      req.user?.id,
      adminMode || req.user?.role === "admin",
    );
    const post = await storage.getPostBySlugWithTranslations(slug, locale, access);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.json(post);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid locale", errors: error.errors });
    }
    emitOperationalEvent("post.operation", "error", {
      correlationId: getCorrelationId(req),
      operation: "read_by_slug",
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/posts/history - List page translation changes for operators
router.get("/history", authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!await requirePostPermission(req, res, "page", "read")) return;
    const { page, limit } = translationHistoryQuerySchema.parse(req.query);
    const result = await storage.getPageTranslationHistory({
      limit,
      offset: (page - 1) * limit,
    });
    res.json({
      ...result,
      page,
      totalPages: Math.ceil(result.total / limit),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid translation history query", errors: error.errors });
    }
    emitOperationalEvent("post.operation", "error", {
      correlationId: getCorrelationId(req),
      operation: "translation_history_read",
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/posts/:id - Get single post by ID with translations
router.get("/:id", optionalAuthenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = postIdSchema.parse(req.params);
    const locale = localeQuerySchema.parse(req.query.locale);
    const adminMode = req.query.admin === "true";

    if (adminMode) {
      const adminPost = await storage.getPost(id);
      if (!adminPost) {
        return res.status(404).json({ message: "Post not found" });
      }
      if (!await requirePostPermission(req, res, adminPost.postType, "read")) return;
    }

    const access = await storage.getPostAccessContext(
      req.user?.id,
      adminMode || req.user?.role === "admin",
    );
    const post = await storage.getPostWithTranslations(id, locale, access);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.json(post);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid post ID", errors: error.errors });
    }
    emitOperationalEvent("post.operation", "error", {
      correlationId: getCorrelationId(req),
      operation: "read",
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST /api/posts/:id/register - Register for an event
router.post("/:id/register", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = postIdSchema.parse(req.params);
    const attendee = eventRegistrationRequestSchema.parse(req.body);
    const access = await storage.getPostAccessContext(
      req.user?.id,
      req.user?.role === "admin",
    );
    const post = await storage.getPostWithTranslations(id, undefined, access);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    
    if (post.postType !== 'event') {
      return res.status(400).json({ message: "Post is not an event" });
    }

    // The visibility read preserves the existing public/member boundary. The
    // command repeats mutable availability checks while holding the event lock.
    const user = await storage.getUser(req.user!.id);
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const existingRegistration = await storage.getEventRegistration(id, user.id);
    const registration = await storage.registerForEvent({
      eventId: id,
      userId: user.id,
      attendeeName: user.name,
      attendeeEmail: user.email,
      attendeePhone: attendee.attendeePhone,
      companyName: attendee.companyName,
    });
    res.status(existingRegistration?.status === "cancelled" ? 200 : 201).json(registration);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid registration data", errors: error.errors });
    }
    if (error instanceof EventRegistrationError) {
      const status = error.code === "EVENT_NOT_FOUND" ? 404
        : error.code === "NOT_AN_EVENT" ? 400
          : error.code === "REGISTRATION_DUPLICATE" ? 409
            : 409;
      return res.status(status).json({ message: error.message, code: error.code });
    }
    emitOperationalEvent("event.registration", "error", {
      correlationId: getCorrelationId(req),
      operation: "register",
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/posts/:id/registrations - Get all registrations for an event (Admin only)
router.get("/:id/registrations", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = postIdSchema.parse(req.params);
    if (!await requirePostPermission(req, res, "event", "attendeeManage")) return;
    
    // Check if post exists and is an event
    const access = await storage.getPostAccessContext(
      req.user?.id,
      req.user?.role === "admin",
    );
    const post = await storage.getPostWithTranslations(id, undefined, access);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    
    if (post.postType !== 'event') {
      return res.status(400).json({ message: "Post is not an event" });
    }
    
    // Get all registrations for this event
    const registrations = await storage.getEventRegistrations(id);
    res.json(registrations);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid post ID", errors: error.errors });
    }
    emitOperationalEvent("event.registration", "error", {
      correlationId: getCorrelationId(req),
      operation: "list",
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    res.status(500).json({ message: "Internal server error" });
  }
});

// Helper function to generate unique slug
function generateSlug(postType: string): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `${postType}-${timestamp}-${randomPart}`;
}

function getPostMetaValue(metaData: z.infer<typeof postMetaPayloadSchema>) {
  const values = [
    metaData.value,
    metaData.valueText,
    metaData.valueNumber,
    metaData.valueBoolean,
    metaData.valueTimestamp,
  ].filter((value) => value !== null && value !== undefined);
  if (values.length > 1) {
    throw new PostMetaValidationError("Metadata must contain exactly one value");
  }
  return values[0];
}

const postCreateDataSchema = insertPostSchema.omit({ authorId: true }).extend({
  publishedAt: z.coerce.date().nullable().optional(),
  scheduledAt: z.coerce.date().nullable().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
}).strict();

const completePostCreateSchema = z.object({
  post: postCreateDataSchema,
  translation: insertPostTranslationSchema.omit({ postId: true }),
  meta: z.array(postMetaPayloadSchema),
});

const completePostUpdateSchema = z.object({
  post: postCreateDataSchema.partial().omit({ postType: true }).strict(),
  translation: insertPostTranslationSchema.omit({ postId: true }),
  meta: z.array(postMetaPayloadSchema),
}).strict();

const postStatusUpdateSchema = z.object({
  status: z.enum(["draft", "published"]),
});

// POST /api/posts - Create a post with its initial translation and metadata
router.post("/", authenticateToken, async (req: Request, res: Response) => {
  let createdPostId: string | undefined;

  try {
    const completeCreate = req.body?.post
      ? completePostCreateSchema.parse(req.body)
      : undefined;
    const postData = completeCreate?.post ?? postCreateDataSchema.parse(req.body);
    if (!await requirePostPermission(req, res, postData.postType, "create")) return;
    if (postData.status === "published" &&
      !await requirePostPermission(req, res, postData.postType, "publish")) return;
    
    // Authorship is assigned by the authenticated actor and cannot be
    // selected by the request body.
    const authorId = req.user?.id;
    if (!authorId) {
      return res.status(400).json({ message: "Author ID is required" });
    }
    
    // Auto-generate slug if not provided or empty
    const slug = postData.slug && postData.slug.trim() !== '' 
      ? postData.slug 
      : generateSlug(postData.postType);
    
    const post = await storage.createPost({
      ...postData,
      slug,
      authorId,
    });
    createdPostId = post.id;

    if (completeCreate) {
      await storage.upsertPostTranslation({
        postId: post.id,
        ...completeCreate.translation,
      }, req.user!.id);
      for (const metaData of completeCreate.meta) {
        await storage.setPostMeta(post.id, metaData.key, getPostMetaValue(metaData));
      }
      await syncResourceObjectAcl(post, req.user!.id, getCorrelationId(req));
    }

    res.status(201).json(post);
  } catch (error) {
    if (error instanceof InvalidPostScheduleError) {
      return res.status(400).json({ message: error.message });
    }
    if (createdPostId) {
      await storage.deletePost(createdPostId).catch((cleanupError) => {
        emitOperationalEvent("storage.failure", "error", {
          correlationId: getCorrelationId(req),
          operation: "post_cleanup",
          errorType: cleanupError instanceof Error ? cleanupError.name : "UnknownError",
          result: "failed",
        });
      });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid post data", errors: error.errors });
    }
    if (error instanceof PostMetaValidationError) {
      return res.status(400).json({ message: error.message });
    }
    emitOperationalEvent("post.operation", "error", {
      correlationId: getCorrelationId(req),
      operation: "create",
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    res.status(500).json({ message: "Internal server error" });
  }
});

// PATCH /api/posts/:id/status - Update only the publication state
router.patch("/:id/status", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = postIdSchema.parse(req.params);
    const { status } = postStatusUpdateSchema.parse(req.body);
    const existingPost = await storage.getPost(id);
    if (!existingPost) {
      return res.status(404).json({ message: "Post not found" });
    }
    if (!await requirePostPermission(req, res, existingPost.postType, "publish")) return;
    if (existingPost.status === "archived") {
      return res.status(409).json({ message: "Archived posts cannot be published from the list" });
    }

    if (existingPost.status === status) {
      return res.json(existingPost);
    }

    const updatedPost = await storage.updatePost(id, {
      status,
      publishedAt: status === "published"
        ? existingPost.publishedAt ?? new Date()
        : null,
    });
    if (!updatedPost) {
      return res.status(404).json({ message: "Post not found" });
    }

    await syncResourceObjectAcl(updatedPost, req.user!.id, getCorrelationId(req));
    res.json(updatedPost);
  } catch (error) {
    if (error instanceof InvalidPostScheduleError) {
      return res.status(400).json({ message: error.message });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid post status", errors: error.errors });
    }
    emitOperationalEvent("post.operation", "error", {
      correlationId: getCorrelationId(req),
      operation: "status_update",
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    res.status(500).json({ message: "Internal server error" });
  }
});

// PATCH /api/posts/:id - Update post
router.patch("/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = postIdSchema.parse(req.params);
    
    // Check if post exists
    const existingPost = await storage.getPost(id);
    if (!existingPost) {
      return res.status(404).json({ message: "Post not found" });
    }
    if (!await requirePostPermission(req, res, existingPost.postType, "update")) return;
    
    const hasCompleteUpdateShape = req.body &&
      typeof req.body === "object" &&
      ("post" in req.body || "translation" in req.body || "meta" in req.body);
    if (hasCompleteUpdateShape) {
      const completeUpdate = completePostUpdateSchema.parse(req.body);
      const updateData = completeUpdate.post;
      const intendedStatus = updateData.status ?? existingPost.status;
      if (intendedStatus !== existingPost.status &&
        !await requirePostPermission(req, res, existingPost.postType, "publish")) return;
      if (intendedStatus !== existingPost.status) {
        updateData.publishedAt = intendedStatus === "published"
          ? updateData.publishedAt ?? existingPost.publishedAt ?? new Date()
          : null;
      }

      const updatedPost = await storage.updatePostComplete(
        id,
        updateData,
        {
          postId: id,
          ...completeUpdate.translation,
        },
        completeUpdate.meta.map((metaData) => ({
          key: metaData.key,
          value: getPostMetaValue(metaData),
        })),
        req.user!.id,
      );
      if (!updatedPost) {
        return res.status(404).json({ message: "Post not found" });
      }

      await syncResourceObjectAcl(updatedPost, req.user!.id, getCorrelationId(req));
      const access = await storage.getPostAccessContext(req.user?.id, true);
      const completePost = await storage.getPostWithTranslations(id, undefined, access);
      return res.json(completePost ?? updatedPost);
    }

    // Validate update data (partial)
    const updateSchema = postCreateDataSchema.partial().strict();
    const updateData = updateSchema.parse(req.body);
    if (updateData.status !== undefined &&
      updateData.status !== existingPost.status &&
      !await requirePostPermission(req, res, existingPost.postType, "publish")) return;
    if (updateData.status !== undefined && updateData.status !== existingPost.status) {
      updateData.publishedAt = updateData.status === "published"
        ? updateData.publishedAt ?? existingPost.publishedAt ?? new Date()
        : null;
    }
    
    const updatedPost = await storage.updatePost(id, updateData);
    if (updatedPost) {
      await syncResourceObjectAcl(updatedPost, req.user!.id, getCorrelationId(req));
    }
    
    res.json(updatedPost);
  } catch (error) {
    if (error instanceof InvalidPostScheduleError) {
      return res.status(400).json({ message: error.message });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid update data", errors: error.errors });
    }
    if (error instanceof PostMetaValidationError) {
      return res.status(400).json({ message: error.message });
    }
    emitOperationalEvent("post.operation", "error", {
      correlationId: getCorrelationId(req),
      operation: "update",
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    res.status(500).json({ message: "Internal server error" });
  }
});

// DELETE /api/posts/:id - Delete post
router.delete("/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = postIdSchema.parse(req.params);
    
    // Check if post exists
    const existingPost = await storage.getPost(id);
    if (!existingPost) {
      return res.status(404).json({ message: "Post not found" });
    }
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Only administrators can delete posts" });
    }
    
    await storage.deletePost(id);
    
    res.status(204).send();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid post ID", errors: error.errors });
    }
    emitOperationalEvent("post.operation", "error", {
      correlationId: getCorrelationId(req),
      operation: "delete",
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST /api/posts/:id/translations - Upsert translation
router.post("/:id/translations", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = postIdSchema.parse(req.params);
    
    // Check if post exists
    const existingPost = await storage.getPost(id);
    if (!existingPost) {
      return res.status(404).json({ message: "Post not found" });
    }
    if (!await requirePostPermission(req, res, existingPost.postType, "update")) return;
    
    const translationData = insertPostTranslationSchema.omit({ postId: true }).parse(req.body);

    const translation = await storage.upsertPostTranslation({
      postId: id,
      ...translationData,
    }, req.user!.id);

    res.json(translation);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid translation data", errors: error.errors });
    }
    emitOperationalEvent("post.operation", "error", {
      correlationId: getCorrelationId(req),
      operation: "translation_upsert",
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/posts/:id/translation-history - List changes for one page
router.get("/:id/translation-history", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = postIdSchema.parse(req.params);
    const existingPost = await storage.getPost(id);
    if (!existingPost) {
      return res.status(404).json({ message: "Post not found" });
    }
    if (existingPost.postType !== "page") {
      return res.status(404).json({ message: "Page not found" });
    }
    if (!await requirePostPermission(req, res, "page", "read")) return;
    const { page, limit } = translationHistoryQuerySchema.parse(req.query);
    const result = await storage.getPageTranslationHistory({
      postId: id,
      limit,
      offset: (page - 1) * limit,
    });
    res.json({
      ...result,
      page,
      totalPages: Math.ceil(result.total / limit),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid translation history request", errors: error.errors });
    }
    emitOperationalEvent("post.operation", "error", {
      correlationId: getCorrelationId(req),
      operation: "translation_history_read",
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/posts/:id/meta - Get post meta
router.get("/:id/meta", optionalAuthenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = postIdSchema.parse(req.params);
    const key = z.string().trim().min(1).max(100).optional().parse(req.query.key);
    const adminMode = req.query.admin === "true";
    if (adminMode) {
      const adminPost = await storage.getPost(id);
      if (!adminPost) {
        return res.status(404).json({ message: "Post not found" });
      }
      if (!await requirePostPermission(req, res, adminPost.postType, "read")) return;
    }
    const access = await storage.getPostAccessContext(
      req.user?.id,
      adminMode || req.user?.role === "admin",
    );
    const post = await storage.getPostWithTranslations(id, undefined, access);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    
    if (key) {
      const managementRead = access.isAdmin ||
        (access.isEditor && access.managedPostTypes.has(post.postType));
      if (!canExposeMetaKey(post.postType, key, managementRead)) {
        // Do not reveal whether a hidden or unknown key exists.
        return res.status(404).json({ message: "Metadata not found" });
      }
      // Get specific meta value
      const value = await storage.getPostMeta(id, key, access);
      res.json({ key, value });
    } else {
      // Get all meta for post
      const meta = await storage.getPostMetaAll(id, access);
      res.json(meta);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid post ID", errors: error.errors });
    }
    if (error instanceof PostMetaValidationError) {
      return res.status(400).json({ message: error.message });
    }
    emitOperationalEvent("post.operation", "error", {
      correlationId: getCorrelationId(req),
      operation: "meta_read",
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST /api/posts/:id/meta - Set post meta
router.post("/:id/meta", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = postIdSchema.parse(req.params);
    
    // Check if post exists
    const existingPost = await storage.getPost(id);
    if (!existingPost) {
      return res.status(404).json({ message: "Post not found" });
    }
    if (!await requirePostPermission(req, res, existingPost.postType, "update")) return;
    
    const metaData = postMetaPayloadSchema.parse(req.body);
    const value = getPostMetaValue(metaData);
    await storage.setPostMeta(id, metaData.key, value);
    const updatedPost = await storage.getPost(id);
    if (updatedPost) {
      await syncResourceObjectAcl(updatedPost, req.user!.id, getCorrelationId(req));
    }
    
    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid meta data", errors: error.errors });
    }
    if (error instanceof PostMetaValidationError) {
      return res.status(400).json({ message: error.message });
    }
    emitOperationalEvent("post.operation", "error", {
      correlationId: getCorrelationId(req),
      operation: "meta_update",
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST /api/posts/:id/meta/increment - Increment numeric meta value
router.post("/:id/meta/increment", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = postIdSchema.parse(req.params);
    
    const incrementSchema = z.object({
      key: z.string().trim().min(1).max(100),
      amount: z.number().int().finite().optional().default(1),
    }).strict();
    
    const { key, amount } = incrementSchema.parse(req.body);
    
    const newValue = await storage.incrementPostMetaNumber(id, key, amount);
    
    res.json({ success: true, key, value: newValue });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid increment data", errors: error.errors });
    }
    if (error instanceof PostMetaValidationError) {
      return res.status(400).json({ message: error.message });
    }
    emitOperationalEvent("post.operation", "error", {
      correlationId: getCorrelationId(req),
      operation: "meta_increment",
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
