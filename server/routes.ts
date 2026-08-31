import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { canReadPost, publicPostAccess } from "./postAccess";
import {
  insertUserSchema,
  insertMemberSchema,
  insertEventRegistrationSchema,
  insertInquirySchema,
  insertInquiryReplySchema,
  insertPartnerSchema,
  insertOrganizationMemberSchema,
  inquiryCategorySchema,
  inquiryStatusSchema,
  memberProfileSchema,
  memberAdminSchema,
  users,
  type User,
} from "@shared/schema";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { sql, eq } from "drizzle-orm";
import "./types";
import { ObjectStorageService, ObjectNotFoundError, objectStorageClient } from "./objectStorage";
import { getUserMembershipInfo, getUserPermissions, hasPermission, requirePermission, requireAnyPermission } from "./permissions";
import {
  AuthorizationStateError,
  DuplicateInquiryError,
  EventRegistrationError,
  storage,
  type AccountRole,
} from "./storage";
import { db } from "./db";
import postsRouter from "./routes/posts";
import { emailService } from "./email";
import { isExecutiveManagementCategory } from "@shared/organization";

const JWT_SECRET = process.env.SESSION_SECRET;
if (!JWT_SECRET) {
  throw new Error('SECURITY ERROR: SESSION_SECRET environment variable must be set');
}

const memberQuerySchema = z.object({
  country: z.string().trim().max(100).optional(),
  industry: z.string().trim().max(100).optional(),
  membershipLevel: z.string().trim().max(50).optional(),
  search: z.string().trim().max(100).optional(),
  admin: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

const inquiryQuerySchema = z.object({
  status: inquiryStatusSchema.optional(),
  category: inquiryCategorySchema.optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
}).strict();

const inquiryIdSchema = z.string().uuid();
const inquiryUpdateSchema = z.object({
  status: inquiryStatusSchema.optional(),
  category: inquiryCategorySchema.optional(),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one inquiry field is required" },
);
const inquiryReplyRequestSchema = z.object({
  message: z.string().trim().min(1, "Reply message is required").max(10_000),
  sendEmail: z.boolean().default(false),
}).strict();

// Public submissions and outbound replies have separate budgets. The global
// API limiter still protects all other endpoints, while these limits prevent
// one expensive operation from consuming the whole budget.
const inquiryCreateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: "Too many inquiries. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
const inquiryReplyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user?.id || ipKeyGenerator(req.ip || "unknown"),
  message: { message: "Too many inquiry replies. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const organizationMemberCategories = [
  'executives',
  'honorary',
  'vicepresidents',
  'directors',
  'advisors',
  'secretariat',
  'committees',
  'organizations',
] as const;
const executiveCategory = 'executives';
const executivePermissions = {
  read: 'organization.executives.read',
  create: 'organization.executives.create',
  update: 'organization.executives.update',
} as const;

const organizationMemberQuerySchema = z.object({
  category: z.enum(organizationMemberCategories).optional(),
  isActive: z.enum(['true', 'false']).optional(),
}).strict();

const organizationMemberIdSchema = z.string().uuid();

function toPublicMember(member: import("@shared/schema").Member) {
  const {
    userId,
    address,
    phone,
    contactPerson,
    contactEmail,
    contactPhone,
    membershipStatus,
    ...publicMember
  } = member;
  return publicMember;
}

// Auth middleware
export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  let tokenPayload: string | jwt.JwtPayload;
  try {
    tokenPayload = jwt.verify(token, JWT_SECRET!);
  } catch (error: any) {
    console.log('[AUTH] Token verification failed:', error.message);
    return res.sendStatus(403);
  }

  if (typeof tokenPayload === 'string' || typeof tokenPayload.id !== 'string') {
    return res.sendStatus(403);
  }

  try {
    // Never trust role or email claims from a long-lived token. Fetching the
    // current account on every protected request makes demotions and
    // deactivations effective immediately.
    const dbUser = await storage.getUser(tokenPayload.id);
    if (!dbUser || !dbUser.isActive) {
      return res.sendStatus(403);
    }

    req.user = { id: dbUser.id, email: dbUser.email, role: dbUser.role };
    next();
  } catch (error) {
    console.log('[AUTH] DB fetch error:', error);
    return res.sendStatus(403);
  }
}

// Public endpoints may use a valid token for member-only content, but an
// absent or invalid token should simply be treated as anonymous.
export function optionalAuthenticateToken(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return next();

  jwt.verify(token, JWT_SECRET!, async (err: any, user: any) => {
    if (err || !user?.id) return next();

    try {
      // Optional authentication still needs the current account state.
      // Otherwise a demoted or deactivated account could retain access to
      // member-only content through a stale token claim.
      const dbUser = await storage.getUser(user.id);
      if (dbUser?.isActive) {
        req.user = { id: dbUser.id, email: dbUser.email, role: dbUser.role };
      }
    } catch {
      // Fail closed for member content when the account cannot be loaded.
    }
    next();
  });
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}

function requireAdminOrPermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role === 'admin') {
      return next();
    }
    return requirePermission(permission)(req, res, next);
  };
}

function requireAdminOrOperatorPermission(permission: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role === 'admin') {
      return next();
    }
    if (req.user?.role !== 'operator') {
      return res.status(403).json({ message: 'Operator access required' });
    }
    const allowed = await hasPermission(req.user.id, permission);
    if (!allowed) {
      return res.status(403).json({
        message: 'Insufficient permissions',
        required: permission,
      });
    }
    next();
  };
}
export async function registerRoutes(app: Express): Promise<Server> {
  // Mount Posts API router
  app.use("/api/posts", postsRouter);
  
  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { userType: requestedUserType, companyData, ...baseUserData } = req.body;
      
      // Validate userType from request
      const userTypeSchema = z.enum(['staff', 'company']);
      const userType = userTypeSchema.parse(requestedUserType || 'staff');
      
      // Validate user data
      const userData = insertUserSchema.parse(baseUserData);
      const existingUser = await storage.getUserByEmail(userData.email);
      
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      let user: User;

      // If company user, create user with member profile atomically
      if (userType === 'company') {
        if (!companyData) {
          return res.status(400).json({ message: "Company information is required for company registration" });
        }
        
        // Validate company data
        const memberPayload = insertMemberSchema.parse({
          companyName: companyData.companyName,
          industry: companyData.business, // Map 'business' to 'industry' field
          country: 'Korea', // Default to Korea
          city: '', // Will be updated by admin
          address: '', // Will be updated by admin
          contactPerson: userData.name, // Use user's name as contact person
          contactEmail: companyData.contactEmail || userData.email, // Fallback to user email
          contactPhone: companyData.contactPhone,
          membershipStatus: 'pending', // Awaiting admin approval
          membershipLevel: 'regular',
          // A newly registered company is not publishable until an admin
          // approves it and explicitly makes it public.
          isPublic: false,
        });

        // Create user and member atomically
        const result = await storage.createUserWithMemberForRegistration(
          { ...userData, userType: 'company' },
          memberPayload
        );
        user = result.user;
      } else {
        // Staff user - just create user
        user = await storage.createUserForRegistration({ ...userData, userType: 'staff' });
      }
      
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET!, { expiresIn: '7d' });
      
      res.json({ user: { ...user, password: undefined }, token });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "회원가입 처리 중 오류가 발생했습니다." });
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

      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET!, { expiresIn: '7d' });
      res.json({ user: { ...user, password: undefined }, token });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get user's membership information
      const membership = await getUserMembershipInfo(req.user!.id);
      const permissions = await getUserPermissions(req.user!.id);
      
      res.json({ 
        ...user, 
        password: undefined,
        membership: membership || null,
        permissions: Array.from(permissions)
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Profile update schema
  const profileUpdateSchema = z.object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    weixin: z.string().optional(),
    currentPassword: z.string().optional(),
    newPassword: z.string().min(6).optional(),
  }).refine(
    (data) => {
      // If changing password, currentPassword is required
      if (data.newPassword && !data.currentPassword) {
        return false;
      }
      return true;
    },
    { message: "Current password is required to change password" }
  );

  app.patch("/api/auth/profile", authenticateToken, async (req, res) => {
    try {
      const updates = profileUpdateSchema.parse(req.body);
      const user = await storage.getUser(req.user!.id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify current password if changing password
      if (updates.newPassword && updates.currentPassword) {
        const validUser = await storage.validateUser(user.email, updates.currentPassword);
        if (!validUser) {
          return res.status(401).json({ message: "Current password is incorrect" });
        }
      }

      // Check email uniqueness if changing email
      if (updates.email && updates.email !== user.email) {
        const existingUser = await storage.getUserByEmail(updates.email);
        if (existingUser) {
          return res.status(409).json({ message: "Email already in use" });
        }
      }

      // Prepare update object
      const updateData: Partial<typeof user> = {};
      if (updates.name) updateData.name = updates.name;
      if (updates.email) updateData.email = updates.email;
      if (updates.weixin !== undefined) updateData.weixin = updates.weixin;
      if (updates.newPassword) {
        const bcrypt = await import('bcrypt');
        updateData.password = await bcrypt.hash(updates.newPassword, 10);
      }

      const updatedUser = await storage.updateUser(req.user!.id, updateData);
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update profile" });
      }

      res.json({ ...updatedUser, password: undefined });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/auth/registrations", authenticateToken, async (req, res) => {
    try {
      const registrations = await storage.getUserRegistrations(req.user!.id);
      res.json(registrations);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/auth/registrations/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Validate UUID format
      const uuidSchema = z.string().uuid();
      const validatedId = uuidSchema.parse(id);

      // The storage command locks the event and registration rows and repeats
      // ownership/state checks inside the transaction.
      const updatedRegistration = await storage.cancelEventRegistration(
        validatedId,
        req.user!.id,
      );
      res.json(updatedRegistration);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid registration ID" });
      }
      if (error instanceof EventRegistrationError) {
        const status = error.code === "REGISTRATION_NOT_FOUND" ? 404
          : error.code === "REGISTRATION_NOT_OWNER" ? 403
            : 409;
        return res.status(status).json({ message: error.message, code: error.code });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // User management routes (Admin only)
  app.get("/api/users", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const allUsers = await storage.getUsers();
      
      // Get membership info for each user
      const usersWithMembership = await Promise.all(
        allUsers.map(async (user) => {
          const membership = await getUserMembershipInfo(user.id);
          return {
            ...user,
            password: undefined,
            membership: membership || null,
          };
        })
      );
      
      res.json(usersWithMembership);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/users/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { role, userType, membershipTier, isActive, name, email } = req.body;
      const updateData: any = {};
      const accountRole: AccountRole | undefined = role === undefined
        ? undefined
        : z.enum(['admin', 'operator', 'user']).parse(role);
      
      if (accountRole) updateData.role = accountRole;
      if (userType) updateData.userType = userType;
      if (membershipTier) updateData.membershipTier = membershipTier;
      if (typeof isActive === 'boolean') updateData.isActive = isActive;
      if (name) updateData.name = name;
      if (email) {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return res.status(400).json({ message: "Invalid email format" });
        }
        updateData.email = email;
      }
      
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "No fields to update" });
      }
      
      const updatedUser = await storage.updateUserAuthorization(
        req.params.id,
        updateData,
        accountRole,
      );
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ ...updatedUser, password: undefined });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user role", errors: error.errors });
      }
      if (error instanceof AuthorizationStateError) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/users/:id/membership", authenticateToken, requireAdmin, async (req, res) => {
    try {
      // Validate request body with Zod
      const membershipUpdateSchema = z.object({
        tierId: z.string().uuid(),
        roleId: z.string().uuid(),
      });

      const { tierId, roleId } = membershipUpdateSchema.parse(req.body);
      const userId = req.params.id;
      
      // Validate userId is UUID
      const userIdSchema = z.string().uuid();
      userIdSchema.parse(userId);
      
      const updatedUser = await storage.updateUserMembership(userId, tierId, roleId);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get updated membership info
      const membership = await getUserMembershipInfo(userId);
      
      res.json({
        success: true,
        membership,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      if (error instanceof AuthorizationStateError) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Members routes
  app.get("/api/members", optionalAuthenticateToken, async (req, res) => {
    try {
      const { country, industry, membershipLevel, search, admin, page, limit } = memberQuerySchema.parse(req.query);
      const adminRequested = admin === "true";
      if (adminRequested && req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const offset = (page - 1) * limit;
      
      const result = await storage.getMembers({
        country,
        industry,
        membershipLevel,
        search,
        admin: adminRequested,
        limit,
        offset,
      });
      
      res.json({
        members: adminRequested
          ? result.members
          : result.members.map(toPublicMember),
        total: result.total,
        page,
        totalPages: Math.ceil(result.total / limit),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid member query", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/members/me", authenticateToken, async (req, res) => {
    try {
      const member = await storage.getMemberByUserId(req.user!.id);
      if (!member) {
        return res.status(404).json({ message: "Member profile not found" });
      }
      res.json(member);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/members/:id", optionalAuthenticateToken, async (req, res) => {
    try {
      const memberId = z.string().uuid().parse(req.params.id);
      const member = await storage.getMember(memberId);
      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }

      // This is the public directory detail endpoint. Owners can use /me for
      // their private profile; they must not make pending/inactive records
      // observable through a public UUID lookup.
      if (req.user?.role !== "admin"
        && (!member.isPublic || member.membershipStatus !== "active")) {
        return res.status(404).json({ message: "Member not found" });
      }

      res.json(req.user?.role === "admin" ? member : toPublicMember(member));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid member ID" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/members", authenticateToken, async (req, res) => {
    try {
      const profileData = memberProfileSchema.parse(req.body);
      const member = await storage.createMember({
        ...profileData,
        userId: req.user!.id,
        membershipStatus: "pending",
        membershipLevel: "regular",
        isPublic: false,
      });
      res.status(201).json(member);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid data" });
    }
  });

  app.put("/api/members/:id", authenticateToken, async (req, res) => {
    try {
      const memberId = z.string().uuid().parse(req.params.id);
      const member = await storage.getMember(memberId);
      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }
      
      // Admin lifecycle mutations use /api/admin/members/:id. Keeping this
      // route owner-only prevents a broad insert schema from becoming an
      // accidental authorization API.
      if (member.userId !== req.user!.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const updateData = memberProfileSchema.partial().parse(req.body);
      const updatedMember = await storage.updateMember(memberId, updateData);
      res.json(updatedMember);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid data" });
    }
  });

  app.get("/api/admin/members", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { country, industry, membershipLevel, search, page, limit } = memberQuerySchema
        .parse(req.query);
      const result = await storage.getMembers({
        country,
        industry,
        membershipLevel,
        search,
        admin: true,
        limit,
        offset: (page - 1) * limit,
      });
      res.json({
        members: result.members,
        total: result.total,
        page,
        totalPages: Math.ceil(result.total / limit),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid member query", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/members/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const memberId = z.string().uuid().parse(req.params.id);
      const member = await storage.getMember(memberId);
      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }
      res.json(member);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid member ID" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/admin/members/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const memberId = z.string().uuid().parse(req.params.id);
      const member = await storage.getMember(memberId);
      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }
      const updateData = memberAdminSchema.partial().parse(req.body);
      const updatedMember = await storage.updateMember(memberId, updateData);
      res.json(updatedMember);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid data" });
    }
  });

  app.delete("/api/members/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const member = await storage.getMember(req.params.id);
      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }
      
      await storage.deleteMember(req.params.id);
      res.json({ message: "Member deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // User registrations (used by Dashboard)
  app.get("/api/user/registrations", authenticateToken, async (req, res) => {
    try {
      const registrations = await storage.getUserRegistrations(req.user!.id);
      res.json(registrations);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Inquiries routes
  app.post("/api/inquiries", inquiryCreateLimiter, async (req, res) => {
    try {
      const inquiryData = insertInquirySchema.parse(req.body);
      const inquiry = await storage.createInquiry(inquiryData);
      res.status(201).json(inquiry);
    } catch (error) {
      if (error instanceof DuplicateInquiryError) {
        return res.status(429).json({ message: "A matching inquiry was submitted recently" });
      }
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0]?.message || "Invalid inquiry data" });
      }
      res.status(500).json({ message: "Unable to submit inquiry" });
    }
  });

  app.get("/api/inquiries", authenticateToken, requireAdminOrPermission("inquiry.read"), async (req, res) => {
    try {
      const { status, category, page, limit } = inquiryQuerySchema.parse(req.query);
      const offset = (page - 1) * limit;
      
      const result = await storage.getInquiries({
        status,
        category,
        limit,
        offset,
      });
      
      res.json({
        inquiries: result.inquiries,
        total: result.total,
        page,
        totalPages: Math.ceil(result.total / limit),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid inquiry query", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/inquiries/:id", authenticateToken, requireAdminOrPermission("inquiry.read"), async (req, res) => {
    try {
      const inquiryId = inquiryIdSchema.parse(req.params.id);
      const inquiry = await storage.getInquiryWithReplies(inquiryId);
      if (!inquiry) {
        return res.status(404).json({ message: "Inquiry not found" });
      }
      res.json(inquiry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid inquiry ID" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/inquiries/:id", authenticateToken, requireAdminOrPermission("inquiry.respond"), async (req, res) => {
    try {
      const inquiryId = inquiryIdSchema.parse(req.params.id);
      const updateData = inquiryUpdateSchema.parse(req.body);
      if (req.user?.role !== 'admin' && Object.keys(updateData).some((key) => key !== 'status')) {
        return res.status(403).json({
          message: 'Operators may only change inquiry status',
        });
      }
      const inquiry = await storage.updateInquiry(inquiryId, updateData);
      if (!inquiry) {
        return res.status(404).json({ message: "Inquiry not found" });
      }
      res.json(inquiry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0]?.message || "Invalid inquiry update" });
      }
      res.status(500).json({ message: "Unable to update inquiry" });
    }
  });

  app.delete("/api/inquiries/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const inquiryId = inquiryIdSchema.parse(req.params.id);
      const inquiry = await storage.getInquiry(inquiryId);
      if (!inquiry) {
        return res.status(404).json({ message: "Inquiry not found" });
      }
      
      await storage.deleteInquiry(inquiryId);
      res.json({ message: "Inquiry deleted successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid inquiry ID" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/inquiries/:id/reply", authenticateToken, requireAdminOrPermission("inquiry.respond"), inquiryReplyLimiter, async (req, res) => {
    try {
      const inquiryId = inquiryIdSchema.parse(req.params.id);
      const { message, sendEmail } = inquiryReplyRequestSchema.parse(req.body);

      const inquiry = await storage.getInquiry(inquiryId);
      if (!inquiry) {
        return res.status(404).json({ message: "Inquiry not found" });
      }

      const replyData = insertInquiryReplySchema.parse({
        inquiryId,
        message,
        respondedBy: req.user!.id,
      });

      const reply = await storage.createInquiryReply(replyData);

      let emailSent = false;
      if (sendEmail) {
        const emailContent = emailService.generateInquiryReplyEmail(
          inquiry.subject,
          inquiry.message,
          message,
          inquiry.name
        );

        emailSent = await emailService.sendEmail({
          to: inquiry.email,
          subject: `[한국 사천-충칭 총상회] ${inquiry.subject} - 답변`,
          html: emailContent.html,
          text: emailContent.text,
        });

        await storage.updateInquiryReplyEmailStatus(reply.id, emailSent);
      }

      const updatedInquiry = await storage.getInquiryWithReplies(inquiryId);
      res.status(201).json({ inquiry: updatedInquiry, emailSent });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0]?.message || "Invalid inquiry reply" });
      }
      // Do not serialize request data or provider errors into application logs.
      console.error('[API] Inquiry reply operation failed', {
        operation: "create_inquiry_reply",
        errorType: error instanceof Error ? error.name : "UnknownError",
      });
      res.status(500).json({ message: "Unable to create inquiry reply" });
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
      
      const updateData = insertPartnerSchema.partial().parse(req.body);
      const updatedPartner = await storage.updatePartner(req.params.id, updateData);
      res.json(updatedPartner);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
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

  // Organization Members routes
  app.get("/api/organization-members", optionalAuthenticateToken, async (req, res) => {
    try {
      const parsedQuery = organizationMemberQuerySchema.safeParse(req.query);
      if (!parsedQuery.success) {
        return res.status(400).json({ message: "Invalid organization member query" });
      }

      const { category, isActive } = parsedQuery.data;
      const isAdmin = req.user?.role === 'admin';
      const isExecutiveOperator = req.user?.role === 'operator'
        && await hasPermission(req.user.id, executivePermissions.read);
      if (isActive === 'false' && !isAdmin && !isExecutiveOperator) {
        return res.status(403).json({ message: "Administrative access required" });
      }
      if (isExecutiveOperator && category && !isExecutiveManagementCategory(category)) {
        return res.status(403).json({ message: "Operators may only manage executives" });
      }

      // The admin UI uses isActive=false to request the complete management
      // list. Public and non-management requests always remain active-only.
      const members = await storage.getOrganizationMembers({
        category: isExecutiveOperator ? category : category,
        isActive: (isAdmin || isExecutiveOperator) && isActive === 'false' ? undefined : true,
      });
      res.json(
        isExecutiveOperator && !category
          ? members.filter((member) => isExecutiveManagementCategory(member.category))
          : members,
      );
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/organization-members/:id", optionalAuthenticateToken, async (req, res) => {
    try {
      const parsedId = organizationMemberIdSchema.safeParse(req.params.id);
      if (!parsedId.success) {
        return res.status(400).json({ message: "Invalid organization member id" });
      }

      const member = await storage.getOrganizationMember(req.params.id);
      // Do not reveal whether an inactive record exists to public callers.
      const isExecutiveOperator = req.user?.role === 'operator'
        && await hasPermission(req.user.id, executivePermissions.read);
      if (!member) {
        return res.status(404).json({ message: "Organization member not found" });
      }
      if (isExecutiveOperator && !isExecutiveManagementCategory(member.category)) {
        return res.status(403).json({ message: "Operators may only manage executives" });
      }
      if (req.user?.role !== 'admin' && !isExecutiveOperator && !member.isActive) {
        return res.status(404).json({ message: "Organization member not found" });
      }
      res.json(member);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(
    "/api/organization-members",
    authenticateToken,
    requireAdminOrOperatorPermission(executivePermissions.create),
    async (req, res) => {
      try {
        const memberData = insertOrganizationMemberSchema.parse(req.body);
        if (req.user?.role !== 'admin' && memberData.category !== executiveCategory) {
          return res.status(403).json({ message: "Operators may only manage executives" });
        }
        const member = await storage.createOrganizationMember(memberData);
        res.status(201).json(member);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ message: error.errors[0].message });
        }
        res.status(400).json({ message: error instanceof Error ? error.message : "Invalid data" });
      }
    }
  );

  app.put(
    "/api/organization-members/:id",
    authenticateToken,
    requireAdminOrOperatorPermission(executivePermissions.update),
    async (req, res) => {
      try {
        const member = await storage.getOrganizationMember(req.params.id);
        if (!member) {
          return res.status(404).json({ message: "Organization member not found" });
        }

        const updateData = insertOrganizationMemberSchema.partial().parse(req.body);
        if (req.user?.role !== 'admin') {
          if (!isExecutiveManagementCategory(member.category)
            || (updateData.category && !isExecutiveManagementCategory(updateData.category))) {
            return res.status(403).json({ message: "Operators may only manage executives" });
          }
        }
        const updatedMember = await storage.updateOrganizationMember(req.params.id, updateData);
        res.json(updatedMember);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ message: error.errors[0].message });
        }
        res.status(400).json({ message: error instanceof Error ? error.message : "Invalid data" });
      }
    }
  );

  app.delete("/api/organization-members/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const member = await storage.getOrganizationMember(req.params.id);
      if (!member) {
        return res.status(404).json({ message: "Organization member not found" });
      }
      
      await storage.deleteOrganizationMember(req.params.id);
      res.json({ message: "Organization member deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin routes
  app.get("/api/admin/dashboard", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const adminPostAccess = await storage.getPostAccessContext(req.user!.id, true);
      const [membersResult, eventsResult, newsResult, inquiriesResult] = await Promise.all([
        storage.getMembers({ admin: true, limit: 1 }),
        storage.getPosts({ postType: 'event', limit: 1, access: adminPostAccess }),
        storage.getPosts({ postType: 'news', limit: 1, access: adminPostAccess }),
        storage.getInquiries({ limit: 1 }),
      ]);

      res.json({
        stats: {
          totalMembers: membersResult.total,
          totalEvents: eventsResult.total || 0,
          totalNews: newsResult.total || 0,
          totalInquiries: inquiriesResult.total,
        },
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Object Storage routes (Reference: blueprint:javascript_object_storage)
  // Endpoint for getting upload URL for managed content
  app.post(
    "/api/objects/upload",
    authenticateToken,
    requireAnyPermission("news.create", "event.create", "resource.upload"),
    async (req, res) => {
    try {
      const { contentType } = req.body || {};
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL(contentType);
      
      // Extract objectPath from uploadURL (format: /replit-objstore-xxx/.private/uploads/uuid)
      const url = new URL(uploadURL);
      const pathname = url.pathname;
      const privateDir = objectStorageService.getPrivateObjectDir();
      let objectPath = "/objects/uploads/unknown";
      
      if (pathname.includes(privateDir)) {
        const idx = pathname.indexOf(privateDir);
        const relativePath = pathname.substring(idx + privateDir.length);
        objectPath = `/objects${relativePath}`;
      }
      
      res.json({ uploadURL, objectPath });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Internal server error" });
    }
    },
  );

  // Endpoint for setting ACL after upload for managed content
  app.put(
    "/api/images",
    authenticateToken,
    requireAnyPermission("news.create", "event.create", "resource.upload"),
    async (req, res) => {
    const aclPayloadSchema = z.object({
      imageURL: z.string().min(1),
      visibility: z.enum(["public", "private"]).default("private"),
    });

    const parsedPayload = aclPayloadSchema.safeParse(req.body);
    if (!parsedPayload.success) {
      return res.status(400).json({ error: "imageURL and a valid visibility are required" });
    }

    const userId = req.user?.id || '';

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        parsedPayload.data.imageURL,
        {
          owner: userId,
          visibility: parsedPayload.data.visibility,
        },
      );

      // Extract just the file ID from the object path
      // objectPath format: /replit-objstore-xxx/.private/uploads/file-id
      // We want: /objects/uploads/file-id
      const privateDir = objectStorageService.getPrivateObjectDir();
      let filePath = objectPath;
      
      if (objectPath.startsWith(privateDir)) {
        filePath = objectPath.substring(privateDir.length);
        if (filePath.startsWith('/')) {
          filePath = filePath.substring(1);
        }
      }
      
      const fullPath = `/objects/${filePath}`;

      res.status(200).json({
        objectPath: fullPath,
      });
    } catch (error) {
      console.error("Error setting image ACL:", error);
      res.status(500).json({ error: "Internal server error" });
    }
    },
  );

  // Endpoint for serving uploaded objects. Every object must have an ACL;
  // resource objects also inherit the post's published visibility policy.
  app.get("/objects/:objectPath(*)", optionalAuthenticateToken, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      const aclPolicy = await objectStorageService.getObjectEntityAclPolicy(objectFile);
      if (!aclPolicy) {
        return res.sendStatus(403);
      }

      const objectAclAllowed = req.user?.role === "admin" ||
        await objectStorageService.canAccessObjectEntity({
          userId: req.user?.id,
          objectFile,
        });
      const linkedPost = await storage.getPostByObjectPath(req.path);

      let allowed = objectAclAllowed;
      if (linkedPost) {
        // An authenticated caller may need editor access to the resource
        // object; the storage context still derives administrator status and
        // post types from the current account and ACL.
        const postAccess = await storage.getPostAccessContext(
          req.user?.id,
          Boolean(req.user?.id),
        );
        const postAllowed = canReadPost(linkedPost, postAccess);
        const postIsPublic = canReadPost(linkedPost, publicPostAccess);

        // A private resource object is granted through the post policy, but
        // public resources still require an explicitly public object ACL.
        allowed = postAllowed && (!postIsPublic || aclPolicy.visibility === "public");
      }

      if (!allowed) {
        return res.sendStatus(403);
      }

      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
