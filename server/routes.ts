import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertMemberSchema, insertEventSchema, insertEventRegistrationSchema, insertNewsSchema, insertResourceSchema, insertInquirySchema, insertPartnerSchema } from "@shared/schema";
import jwt from "jsonwebtoken";
import { z } from "zod";
import "./types";

const JWT_SECRET = process.env.SESSION_SECRET || "your-secret-key";

// Auth middleware
function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, JWT_SECRET, async (err: any, user: any) => {
    if (err) {
      console.log('[AUTH] Token verification failed:', err.message);
      return res.sendStatus(403);
    }
    
    // If token doesn't have role (old token), fetch from database
    if (!user.role) {
      console.log('[AUTH] Token missing role, fetching from DB for user:', user.id);
      try {
        const dbUser = await storage.getUser(user.id);
        if (!dbUser) {
          console.log('[AUTH] User not found in DB:', user.id);
          return res.sendStatus(403);
        }
        console.log('[AUTH] Fetched role from DB:', dbUser.role);
        req.user = { id: dbUser.id, email: dbUser.email, role: dbUser.role };
      } catch (error) {
        console.log('[AUTH] DB fetch error:', error);
        return res.sendStatus(403);
      }
    } else {
      console.log('[AUTH] Token has role:', user.role);
      req.user = user;
    }
    
    next();
  });
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByEmail(userData.email);
      
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Check if this is the first user - make them admin automatically
      const userCount = await storage.getUserCount();
      const role = userCount === 0 ? 'admin' : 'member';

      const user = await storage.createUser({
        ...userData,
        role
      });
      
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
      
      res.json({ user: { ...user, password: undefined }, token });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid data" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password required" });
      }

      const user = await storage.validateUser(email, password);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
      res.json({ user: { ...user, password: undefined }, token });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ ...user, password: undefined });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Members routes
  app.get("/api/members", async (req, res) => {
    try {
      const { country, industry, membershipLevel, search, page = "1", limit = "12" } = req.query;
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
      
      const result = await storage.getMembers({
        country: country as string,
        industry: industry as string,
        membershipLevel: membershipLevel as string,
        search: search as string,
        limit: parseInt(limit as string),
        offset,
      });
      
      res.json({
        members: result.members,
        total: result.total,
        page: parseInt(page as string),
        totalPages: Math.ceil(result.total / parseInt(limit as string)),
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/members/:id", async (req, res) => {
    try {
      const member = await storage.getMember(req.params.id);
      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }
      res.json(member);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/members", authenticateToken, async (req, res) => {
    try {
      const memberData = insertMemberSchema.parse({ ...req.body, userId: req.user.id });
      const member = await storage.createMember(memberData);
      res.status(201).json(member);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid data" });
    }
  });

  app.put("/api/members/:id", authenticateToken, async (req, res) => {
    try {
      const member = await storage.getMember(req.params.id);
      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }
      
      // Check if user owns this member record or is admin
      if (member.userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const updatedMember = await storage.updateMember(req.params.id, req.body);
      res.json(updatedMember);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid data" });
    }
  });

  // Events routes
  app.get("/api/events", async (req, res) => {
    try {
      const { category, upcoming, page = "1", limit = "10" } = req.query;
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
      
      const result = await storage.getEvents({
        category: category as string,
        upcoming: upcoming === "true",
        published: true,
        limit: parseInt(limit as string),
        offset,
      });
      
      res.json({
        events: result.events,
        total: result.total,
        page: parseInt(page as string),
        totalPages: Math.ceil(result.total / parseInt(limit as string)),
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/events/:id", async (req, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event || !event.isPublic) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/events", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const eventData = insertEventSchema.parse({ ...req.body, createdBy: req.user.id });
      const event = await storage.createEvent(eventData);
      res.status(201).json(event);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid data" });
    }
  });

  app.put("/api/events/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Convert date strings to Date objects
      const updateData = { ...req.body };
      if (updateData.eventDate && typeof updateData.eventDate === 'string') {
        updateData.eventDate = new Date(updateData.eventDate);
      }
      if (updateData.endDate && typeof updateData.endDate === 'string') {
        updateData.endDate = new Date(updateData.endDate);
      }
      if (updateData.registrationDeadline && typeof updateData.registrationDeadline === 'string') {
        updateData.registrationDeadline = new Date(updateData.registrationDeadline);
      }
      
      const updatedEvent = await storage.updateEvent(req.params.id, updateData);
      res.json(updatedEvent);
    } catch (error) {
      console.error('[UPDATE EVENT ERROR]:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid data" });
    }
  });

  app.delete("/api/events/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      await storage.deleteEvent(req.params.id);
      res.json({ message: "Event deleted successfully" });
    } catch (error) {
      console.error('[DELETE EVENT ERROR]:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Internal server error" });
    }
  });

  // Event registrations
  app.post("/api/events/:id/register", authenticateToken, async (req, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      const existingRegistration = await storage.getEventRegistration(req.params.id, req.user.id);
      if (existingRegistration) {
        return res.status(400).json({ message: "Already registered for this event" });
      }

      const registrationData = insertEventRegistrationSchema.parse({
        ...req.body,
        eventId: req.params.id,
        userId: req.user.id,
      });
      
      const registration = await storage.createEventRegistration(registrationData);
      res.status(201).json(registration);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid data" });
    }
  });

  app.get("/api/user/registrations", authenticateToken, async (req, res) => {
    try {
      const registrations = await storage.getUserRegistrations(req.user.id);
      res.json(registrations);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // News routes
  app.get("/api/news", async (req, res) => {
    try {
      const { category, page = "1", limit = "10" } = req.query;
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
      
      const result = await storage.getNews({
        category: category as string,
        published: true,
        limit: parseInt(limit as string),
        offset,
      });
      
      res.json({
        articles: result.articles,
        total: result.total,
        page: parseInt(page as string),
        totalPages: Math.ceil(result.total / parseInt(limit as string)),
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/news/:id", async (req, res) => {
    try {
      const article = await storage.getNewsArticle(req.params.id);
      if (!article || !article.isPublished) {
        return res.status(404).json({ message: "Article not found" });
      }
      
      // Increment view count
      await storage.incrementNewsViews(req.params.id);
      
      res.json(article);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/news", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const articleData = insertNewsSchema.parse({ ...req.body, authorId: req.user.id });
      const article = await storage.createNews(articleData);
      res.status(201).json(article);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid data" });
    }
  });

  app.put("/api/news/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const article = await storage.getNewsArticle(req.params.id);
      if (!article) {
        return res.status(404).json({ message: "Article not found" });
      }
      
      // Convert date strings to Date objects
      const updateData = { ...req.body };
      if (updateData.publishedAt && typeof updateData.publishedAt === 'string') {
        updateData.publishedAt = new Date(updateData.publishedAt);
      }
      
      const updatedArticle = await storage.updateNews(req.params.id, updateData);
      res.json(updatedArticle);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid data" });
    }
  });

  app.delete("/api/news/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const article = await storage.getNewsArticle(req.params.id);
      if (!article) {
        return res.status(404).json({ message: "Article not found" });
      }
      
      await storage.deleteNews(req.params.id);
      res.json({ message: "Article deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Resources routes
  app.get("/api/resources", async (req, res) => {
    try {
      const { category, page = "1", limit = "20" } = req.query;
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
      
      // Determine access level based on user authentication
      const accessLevels = ["public"];
      if (req.headers.authorization) {
        try {
          const token = req.headers.authorization.split(' ')[1];
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          accessLevels.push("members");
          if (decoded.role === 'admin') {
            accessLevels.push("premium");
          }
        } catch (error) {
          // Invalid token, continue with public only
        }
      }
      
      const result = await storage.getResources({
        category: category as string,
        active: true,
        limit: parseInt(limit as string),
        offset,
      });
      
      // Filter by access level
      const filteredResources = result.resources.filter(resource => 
        accessLevels.includes(resource.accessLevel)
      );
      
      res.json({
        resources: filteredResources,
        total: filteredResources.length,
        page: parseInt(page as string),
        totalPages: Math.ceil(filteredResources.length / parseInt(limit as string)),
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/resources/:id/download", async (req, res) => {
    try {
      const resource = await storage.getResource(req.params.id);
      if (!resource || !resource.isActive) {
        return res.status(404).json({ message: "Resource not found" });
      }
      
      // Check access level
      if (resource.accessLevel !== "public") {
        if (!req.headers.authorization) {
          return res.status(401).json({ message: "Authentication required" });
        }
        
        try {
          const token = req.headers.authorization.split(' ')[1];
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          
          if (resource.accessLevel === "premium" && decoded.role !== 'admin') {
            return res.status(403).json({ message: "Premium access required" });
          }
        } catch (error) {
          return res.status(401).json({ message: "Invalid token" });
        }
      }
      
      // Increment download count
      await storage.incrementResourceDownloads(req.params.id);
      
      res.json({ downloadUrl: resource.fileUrl });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/resources", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const resourceData = insertResourceSchema.parse({ ...req.body, createdBy: req.user.id });
      const resource = await storage.createResource(resourceData);
      res.status(201).json(resource);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid data" });
    }
  });

  app.put("/api/resources/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const resource = await storage.getResource(req.params.id);
      if (!resource) {
        return res.status(404).json({ message: "Resource not found" });
      }
      
      const updatedResource = await storage.updateResource(req.params.id, req.body);
      res.json(updatedResource);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid data" });
    }
  });

  app.delete("/api/resources/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const resource = await storage.getResource(req.params.id);
      if (!resource) {
        return res.status(404).json({ message: "Resource not found" });
      }
      
      await storage.deleteResource(req.params.id);
      res.json({ message: "Resource deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Inquiries routes
  app.post("/api/inquiries", async (req, res) => {
    try {
      const inquiryData = insertInquirySchema.parse(req.body);
      const inquiry = await storage.createInquiry(inquiryData);
      res.status(201).json(inquiry);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid data" });
    }
  });

  app.get("/api/inquiries", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { status, category, page = "1", limit = "20" } = req.query;
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
      
      const result = await storage.getInquiries({
        status: status as string,
        category: category as string,
        limit: parseInt(limit as string),
        offset,
      });
      
      res.json({
        inquiries: result.inquiries,
        total: result.total,
        page: parseInt(page as string),
        totalPages: Math.ceil(result.total / parseInt(limit as string)),
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/inquiries/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const updateData = req.body;
      if (updateData.response) {
        updateData.respondedBy = req.user.id;
        updateData.respondedAt = new Date();
      }
      
      const inquiry = await storage.updateInquiry(req.params.id, updateData);
      res.json(inquiry);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid data" });
    }
  });

  // Partners routes
  app.get("/api/partners", async (req, res) => {
    try {
      const partners = await storage.getPartners(true);
      res.json(partners);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/partners", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const partnerData = insertPartnerSchema.parse(req.body);
      const partner = await storage.createPartner(partnerData);
      res.status(201).json(partner);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid data" });
    }
  });

  app.put("/api/partners/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const partner = await storage.getPartner(req.params.id);
      if (!partner) {
        return res.status(404).json({ message: "Partner not found" });
      }
      
      const updatedPartner = await storage.updatePartner(req.params.id, req.body);
      res.json(updatedPartner);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid data" });
    }
  });

  app.delete("/api/partners/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const partner = await storage.getPartner(req.params.id);
      if (!partner) {
        return res.status(404).json({ message: "Partner not found" });
      }
      
      await storage.deletePartner(req.params.id);
      res.json({ message: "Partner deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin routes
  app.get("/api/admin/dashboard", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const [membersResult, eventsResult, newsResult, inquiriesResult] = await Promise.all([
        storage.getMembers({ limit: 1 }),
        storage.getEvents({ limit: 1 }),
        storage.getNews({ limit: 1 }),
        storage.getInquiries({ limit: 1 }),
      ]);

      res.json({
        stats: {
          totalMembers: membersResult.total,
          totalEvents: eventsResult.total,
          totalNews: newsResult.total,
          totalInquiries: inquiriesResult.total,
        },
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
