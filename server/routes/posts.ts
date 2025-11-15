import { Router, type Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { insertPostSchema, insertPostTranslationSchema, insertPostMetaSchema, insertEventRegistrationSchema } from "@shared/schema";
import { z } from "zod";
import { authenticateToken } from "../routes";
import "../types";

const router = Router();

// Middleware to require admin access
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}

// Validation schemas
const postQuerySchema = z.object({
  postType: z.enum(['news', 'event', 'resource']).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  visibility: z.enum(['public', 'members', 'staff']).optional(),
  tags: z.string().optional(), // Comma-separated tags
  authorId: z.string().uuid().optional(),
  locale: z.enum(['ko', 'en', 'zh']).optional(),
  search: z.string().optional(), // Search term for title/content/excerpt/slug
  upcoming: z.enum(['true', 'false']).optional(), // Filter for upcoming events (eventDate > now)
  limit: z.coerce.number().positive().max(100).optional().default(20),
  offset: z.coerce.number().nonnegative().optional().default(0),
});

const postIdSchema = z.object({
  id: z.string().uuid(),
});

// GET /api/posts - List posts with filters
router.get("/", async (req: Request, res: Response) => {
  try {
    const query = postQuerySchema.parse(req.query);
    
    // Parse tags from comma-separated string
    const tags = query.tags ? query.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined;
    
    // Parse upcoming filter for events
    const upcoming = query.upcoming === 'true' ? true : undefined;
    
    const posts = await storage.getPosts({
      postType: query.postType,
      status: query.status,
      visibility: query.visibility,
      tags,
      authorId: query.authorId,
      search: query.search,
      upcoming,
      limit: query.limit,
      offset: query.offset,
    });
    
    res.json(posts);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid query parameters", errors: error.errors });
    }
    console.error("[Posts API] Error fetching posts:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/posts/:id - Get single post by ID with translations
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = postIdSchema.parse(req.params);
    const locale = req.query.locale as 'ko' | 'en' | 'zh' | undefined;
    
    const post = await storage.getPostWithTranslations(id, locale);
    
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    
    res.json(post);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid post ID", errors: error.errors });
    }
    console.error("[Posts API] Error fetching post:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST /api/posts/:id/register - Register for an event
router.post("/:id/register", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = postIdSchema.parse(req.params);
    
    // Check if post exists and is an event (use getPostWithTranslations for consistency)
    const post = await storage.getPostWithTranslations(id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    
    if (post.postType !== 'event') {
      return res.status(400).json({ message: "Post is not an event" });
    }
    
    // Check for existing registration
    const existingRegistration = await storage.getEventRegistration(id, req.user.id);
    
    if (existingRegistration) {
      // If cancelled, reactivate it
      if (existingRegistration.status === 'cancelled') {
        const reactivated = await storage.updateEventRegistration(existingRegistration.id, {
          status: 'registered',
          registeredAt: new Date(),
        });
        return res.status(200).json(reactivated);
      }
      // Otherwise, already registered
      return res.status(400).json({ message: "Already registered for this event" });
    }
    
    // Create new registration
    const registrationData = insertEventRegistrationSchema.parse({
      ...req.body,
      eventId: id,
      userId: req.user.id,
    });
    
    const registration = await storage.createEventRegistration(registrationData);
    res.status(201).json(registration);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid registration data", errors: error.errors });
    }
    console.error("[Posts API] Error registering for event:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/posts/:id/registrations - Get all registrations for an event (Admin only)
router.get("/:id/registrations", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = postIdSchema.parse(req.params);
    
    // Check if post exists and is an event
    const post = await storage.getPostWithTranslations(id);
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
    console.error("[Posts API] Error fetching registrations:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST /api/posts - Create new post
router.post("/", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const postData = insertPostSchema.parse(req.body);
    
    // Set author to current user if not provided
    const authorId = postData.authorId || req.user?.id;
    if (!authorId) {
      return res.status(400).json({ message: "Author ID is required" });
    }
    
    const post = await storage.createPost({
      ...postData,
      authorId,
    });
    
    res.status(201).json(post);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid post data", errors: error.errors });
    }
    console.error("[Posts API] Error creating post:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// PATCH /api/posts/:id - Update post
router.patch("/:id", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = postIdSchema.parse(req.params);
    
    // Check if post exists
    const existingPost = await storage.getPost(id);
    if (!existingPost) {
      return res.status(404).json({ message: "Post not found" });
    }
    
    // Validate update data (partial)
    const updateSchema = insertPostSchema.partial();
    const updateData = updateSchema.parse(req.body);
    
    const updatedPost = await storage.updatePost(id, updateData);
    
    res.json(updatedPost);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid update data", errors: error.errors });
    }
    console.error("[Posts API] Error updating post:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// DELETE /api/posts/:id - Delete post
router.delete("/:id", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = postIdSchema.parse(req.params);
    
    // Check if post exists
    const existingPost = await storage.getPost(id);
    if (!existingPost) {
      return res.status(404).json({ message: "Post not found" });
    }
    
    await storage.deletePost(id);
    
    res.status(204).send();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid post ID", errors: error.errors });
    }
    console.error("[Posts API] Error deleting post:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST /api/posts/:id/translations - Upsert translation
router.post("/:id/translations", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = postIdSchema.parse(req.params);
    
    // Check if post exists
    const existingPost = await storage.getPost(id);
    if (!existingPost) {
      return res.status(404).json({ message: "Post not found" });
    }
    
    const translationData = insertPostTranslationSchema.omit({ postId: true }).parse(req.body);
    
    console.log("[Posts API] Upserting translation for post:", id);
    console.log("[Posts API] Translation data:", translationData);
    
    const translation = await storage.upsertPostTranslation({
      postId: id,
      ...translationData,
    });
    
    console.log("[Posts API] Upserted translation result:", translation);
    
    res.json(translation);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid translation data", errors: error.errors });
    }
    console.error("[Posts API] Error upserting translation:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/posts/:id/meta - Get post meta
router.get("/:id/meta", async (req: Request, res: Response) => {
  try {
    const { id } = postIdSchema.parse(req.params);
    const key = req.query.key as string | undefined;
    
    if (key) {
      // Get specific meta value
      const value = await storage.getPostMeta(id, key);
      res.json({ key, value });
    } else {
      // Get all meta for post
      const meta = await storage.getPostMetaAll(id);
      res.json(meta);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid post ID", errors: error.errors });
    }
    console.error("[Posts API] Error fetching post meta:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST /api/posts/:id/meta - Set post meta
router.post("/:id/meta", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = postIdSchema.parse(req.params);
    
    // Check if post exists
    const existingPost = await storage.getPost(id);
    if (!existingPost) {
      return res.status(404).json({ message: "Post not found" });
    }
    
    const metaData = insertPostMetaSchema.omit({ id: true, postId: true }).parse(req.body);
    
    // Determine value from typed columns
    let value: any = metaData.value;
    if (metaData.valueText !== null && metaData.valueText !== undefined) {
      value = metaData.valueText;
    } else if (metaData.valueNumber !== null && metaData.valueNumber !== undefined) {
      value = metaData.valueNumber;
    } else if (metaData.valueBoolean !== null && metaData.valueBoolean !== undefined) {
      value = metaData.valueBoolean;
    } else if (metaData.valueTimestamp !== null && metaData.valueTimestamp !== undefined) {
      value = metaData.valueTimestamp;
    }
    
    await storage.setPostMeta(id, metaData.key, value);
    
    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid meta data", errors: error.errors });
    }
    console.error("[Posts API] Error setting post meta:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST /api/posts/:id/meta/increment - Increment numeric meta value
router.post("/:id/meta/increment", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = postIdSchema.parse(req.params);
    
    const incrementSchema = z.object({
      key: z.string(),
      amount: z.number().optional().default(1),
    });
    
    const { key, amount } = incrementSchema.parse(req.body);
    
    const newValue = await storage.incrementPostMetaNumber(id, key, amount);
    
    res.json({ success: true, key, value: newValue });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid increment data", errors: error.errors });
    }
    console.error("[Posts API] Error incrementing post meta:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
