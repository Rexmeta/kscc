import { 
  users, members, eventRegistrations, inquiries, inquiryReplies, partners,
  posts, postTranslations, postMeta, organizationMembers,
  tiers, roles, userMemberships, surveySettings, surveySettingsHistory,
  type User, type InsertUser, type Member, type InsertMember,
  type EventRegistration, type InsertEventRegistration,
  type Inquiry, type InsertInquiry, type InquiryReply, type InsertInquiryReply,
  type InquiryWithReplies,
  type SafeUser,
  type Partner, type InsertPartner, type UserRegistrationWithEvent,
  type Post, type InsertPost, type PostTranslation, type InsertPostTranslation,
  type PostMeta, type InsertPostMeta, type PostWithTranslations,
  type OrganizationMember, type InsertOrganizationMember,
   type SurveySettings, type SurveySettingsInput, type SurveySettingsHistory,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, or, like, gte, lte, gt, isNull, isNotNull, count, sql, inArray, ne } from "drizzle-orm";
import bcrypt from "bcrypt";
import {
  canReadPost,
  canManagePostType,
  publicPostAccess,
  type PostAccessContext,
} from "./postAccess";
import { getPostPermissionKey, postPermissionKeys } from "./postPermissions";
import { hasPermission } from "./permissions";
import { normalizeEmail } from "./auth";
import {
  InvalidPostScheduleError,
  RESOURCE_ACL_SYNC_META_KEY,
  validatePostSchedule,
} from "./postScheduling";
import {
  canExposeMetaKey,
  isMetaKeyForPostType,
  PostMetaValidationError,
  validatePostMetaValue,
} from "@shared/postMetaKeys";
import type { AdminDashboardSnapshot } from "@shared/adminDashboard";
const DEFAULT_PAGE_SIZE = 50;
const MAX_MEMBER_PAGE_SIZE = 50;
const MAX_POST_PAGE_SIZE = 100;
const MAX_ADMIN_COLLECTION_PAGE_SIZE = 50;

export type EventRegistrationErrorCode =
  | "EVENT_NOT_FOUND"
  | "NOT_AN_EVENT"
  | "EVENT_NOT_PUBLISHED"
  | "EVENT_NOT_STARTED"
  | "EVENT_EXPIRED"
  | "EVENT_CLOSED"
  | "EVENT_CAPACITY_REACHED"
  | "EVENT_CONFIGURATION_INVALID"
  | "REGISTRATION_DUPLICATE"
  | "REGISTRATION_NOT_FOUND"
  | "REGISTRATION_NOT_OWNER"
  | "REGISTRATION_ALREADY_CANCELLED"
  | "REGISTRATION_ATTENDED";

export type AccountRole = "admin" | "operator" | "user";

export type SurveySettingsHistoryEntry = SurveySettingsHistory;
export class DuplicateInquiryError extends Error {
  constructor() {
    super("A matching inquiry was submitted recently");
    this.name = "DuplicateInquiryError";
  }
}

export type UserDeletionErrorCode = "LAST_ACTIVE_ADMIN" | "HAS_INQUIRY_HISTORY";

export class UserDeletionError extends Error {
  constructor(
    public readonly code: UserDeletionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "UserDeletionError";
  }
}

function getPostMetaValueColumns(value: any): Pick<
  PostMeta,
  "value" | "valueText" | "valueNumber" | "valueBoolean" | "valueTimestamp"
> {
  const isDate = value instanceof Date;
  return {
    value: value !== null && typeof value === "object" && !isDate ? value : null,
    valueText: typeof value === "string" ? value : null,
    valueNumber: typeof value === "number" ? value : null,
    valueBoolean: typeof value === "boolean" ? value : null,
    valueTimestamp: isDate ? value : null,
  };
}

function getStoredPostMetaValue(meta: PostMeta): unknown {
  const values = [
    meta.value,
    meta.valueText,
    meta.valueNumber,
    meta.valueBoolean,
    meta.valueTimestamp,
  ].filter((value) => value !== null && value !== undefined);
  return values.length === 1 ? values[0] : undefined;
}
function boundedPageSize(limit: number | undefined, max: number): number {
  if (limit === undefined || !Number.isFinite(limit)) {
    return Math.min(DEFAULT_PAGE_SIZE, max);
  }

  return Math.min(Math.max(Math.trunc(limit), 1), max);
}

function boundedOffset(offset: number | undefined): number {
  if (offset === undefined || !Number.isFinite(offset)) {
    return 0;
  }

  return Math.max(Math.trunc(offset), 0);
}

function getEventMetaValue(meta: PostMeta[], keys: string[]): unknown {
  const item = meta.find(({ key }) => keys.includes(key));
  if (!item) return undefined;
  if (item.valueText !== null) return item.valueText;
  if (item.valueNumber !== null) return item.valueNumber;
  if (item.valueBoolean !== null) return item.valueBoolean;
  if (item.valueTimestamp !== null) return item.valueTimestamp;
  return item.value ?? undefined;
}

function preparePostUpdate(currentPost: Post, updates: Partial<Post>): Partial<Post> {
  const updateData = { ...updates };
  const hasExplicitSchedule = Object.prototype.hasOwnProperty.call(updates, "scheduledAt");
  const statusChanged = updates.status !== undefined && updates.status !== currentPost.status;

  // An explicit manual publish, unpublish, or archive supersedes a prior
  // schedule. A caller can intentionally replace it in the same update by
  // supplying scheduledAt together with status=draft.
  if (!hasExplicitSchedule &&
    (updates.status === "published" || statusChanged)) {
    updateData.scheduledAt = null;
  }

  return updateData;
}
export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;

  getUserByEmail(email: string): Promise<User | undefined>;

  getUserCount(): Promise<number>;

  getAdminDashboardSnapshot(
    access: PostAccessContext,
    now?: Date,
  ): Promise<AdminDashboardSnapshot>;

  getUsers(filters?: {
    limit?: number;
    offset?: number;

  }): Promise<{ users: User[]; total: number }>;

  createUser(user: InsertUser & { role?: string; userType?: string }): Promise<User>;

  createUserWithMember(userData: InsertUser & { role?: string; userType?: string }, memberData: Omit<InsertMember, 'userId'>): Promise<{ user: User; member: Member }>;

  createUserForRegistration(userData: InsertUser & { userType?: string }): Promise<User>;

  createUserWithMemberForRegistration(userData: InsertUser & { userType?: string }, memberData: Omit<InsertMember, 'userId'>): Promise<{ user: User; member: Member }>;

  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;

  updateUserAuthorization(
    id: string,
    updates: Partial<User>,
    accountRole?: AccountRole,

  ): Promise<User | undefined>;

  revokeUserSessions(id: string): Promise<boolean>;

  deleteUserAccount(id: string): Promise<boolean>;

  updateUserMembership(id: string, tierId: string, roleId: string): Promise<User | undefined>;

  bootstrapAdmin(email: string, password?: string): Promise<User>;

  validateUser(email: string, password: string): Promise<User | undefined>;

  // Members

  getMember(id: string): Promise<Member | undefined>;

  getMemberByUserId(userId: string): Promise<Member | undefined>;

  getMembers(filters?: {
    country?: string;
    industry?: string;
    membershipLevel?: string;
    search?: string;
    admin?: boolean;
    limit?: number;
    offset?: number;

  }): Promise<{ members: Member[]; total: number }>;

  createMember(member: InsertMember): Promise<Member>;

  updateMember(id: string, updates: Partial<Member>): Promise<Member | undefined>;

  // Event Registrations

  getEventRegistration(eventId: string, userId: string): Promise<EventRegistration | undefined>;

  getEventRegistrationById(id: string): Promise<EventRegistration | undefined>;

  getEventRegistrations(eventId: string): Promise<EventRegistration[]>;

  getUserRegistrations(userId: string): Promise<UserRegistrationWithEvent[]>;

  createEventRegistration(registration: InsertEventRegistration): Promise<EventRegistration | undefined>;

  registerForEvent(registration: InsertEventRegistration): Promise<EventRegistration>;

  cancelEventRegistration(id: string, userId: string): Promise<EventRegistration>;

  updateEventRegistration(id: string, updates: Partial<EventRegistration>): Promise<EventRegistration | undefined>;

  // Inquiries

  getInquiry(id: string): Promise<Inquiry | undefined>;

  getInquiryWithReplies(id: string): Promise<InquiryWithReplies | undefined>;

  getInquiries(filters?: {
    status?: string;
    category?: string;
    limit?: number;
    offset?: number;

  }): Promise<{ inquiries: Inquiry[]; total: number }>;

  createInquiry(inquiry: InsertInquiry): Promise<Inquiry>;

  updateInquiry(id: string, updates: Partial<Inquiry>): Promise<Inquiry | undefined>;
  
  // Inquiry Replies

  getInquiryReplies(inquiryId: string): Promise<InquiryReply[]>;

  createInquiryReply(reply: InsertInquiryReply): Promise<InquiryReply>;

  updateInquiryReplyEmailStatus(id: string, sent: boolean): Promise<void>;

  // Partners

  getPartner(id: string): Promise<Partner | undefined>;

  getPartners(filters?: {
    active?: boolean;
    limit?: number;
    offset?: number;

  }): Promise<{ partners: Partner[]; total: number }>;

  createPartner(partner: InsertPartner): Promise<Partner>;

  updatePartner(id: string, updates: Partial<Partner>): Promise<Partner | undefined>;

  deletePartner(id: string): Promise<void>;

  // Survey settings

  getSurveySettings(): Promise<SurveySettings | undefined>;

  upsertSurveySettings(settings: SurveySettingsInput, updatedBy: string): Promise<SurveySettings>;
  getSurveySettingsHistory(filters?: {
    limit?: number;
    offset?: number;
    snapshotVersion?: number;
  }): Promise<{ history: SurveySettingsHistoryEntry[]; total: number; snapshotVersion: number }>;

  // Unified Posts System
  /**
   * Build a post access context from current account and ACL state.
   * managementRequested only enables the editor path; it never makes a caller
   * an administrator.
   */

  getPostAccessContext(userId?: string, managementRequested?: boolean): Promise<PostAccessContext>;
  // Posts

  getPost(id: string): Promise<Post | undefined>;

  getPostBySlug(slug: string): Promise<Post | undefined>;

  getPostByObjectPath(objectPath: string): Promise<Post | undefined>;

  claimDueScheduledPosts(now: Date, limit: number): Promise<Post[]>;

  getResourcePostsNeedingAcl(now: Date, limit: number): Promise<Post[]>;

  getPostBySlugWithTranslations(slug: string, locale?: string, access?: PostAccessContext): Promise<PostWithTranslations | undefined>;

  getPostWithTranslations(id: string, locale?: string, access?: PostAccessContext): Promise<PostWithTranslations | undefined>;

  getPosts(filters?: {
    postType?: string;
    status?: string;
    visibility?: string;
    authorId?: string;
    isFeatured?: boolean;
    tags?: string[];
    search?: string;
    publishedAfter?: Date;
    publishedBefore?: Date;
    upcoming?: boolean;
    locale?: string;
    compact?: boolean;
    limit?: number;
    offset?: number;
    access?: PostAccessContext;

  }): Promise<{ posts: PostWithTranslations[]; total: number }>;

  getResourceCategoryCounts(access?: PostAccessContext): Promise<Record<string, number>>;

  createPost(post: InsertPost): Promise<Post>;

  updatePost(
    id: string,
    updates: Partial<Omit<Post, "authorId">> & { authorId?: never },
  ): Promise<Post | undefined>;

  updatePostComplete(
    id: string,
    updates: Partial<Omit<Post, "authorId">> & { authorId?: never },
    translation: InsertPostTranslation,
    metadata: Array<{ key: string; value?: any }>,

  ): Promise<Post | undefined>;

  deletePost(id: string): Promise<void>;

  // Post Translations

  getPostTranslation(postId: string, locale: string): Promise<PostTranslation | undefined>;

  getPostTranslations(postId: string): Promise<PostTranslation[]>;

  createPostTranslation(translation: InsertPostTranslation): Promise<PostTranslation>;

  updatePostTranslation(id: string, updates: Partial<PostTranslation>): Promise<PostTranslation | undefined>;

  upsertPostTranslation(translation: InsertPostTranslation): Promise<PostTranslation>;

  // Post Meta

  getPostMeta(postId: string, key: string, access?: PostAccessContext): Promise<PostMeta | undefined>;

  getPostMetaAll(postId: string, access?: PostAccessContext): Promise<PostMeta[]>;

  setPostMeta(postId: string, key: string, value: any): Promise<PostMeta>;

  deletePostMeta(postId: string, key: string): Promise<void>;

  incrementPostMetaNumber(postId: string, key: string, amount?: number): Promise<number>;

  markResourceAclSynchronized(postId: string, marker: string): Promise<void>;

  // Organization Members

  getOrganizationMember(id: string): Promise<OrganizationMember | undefined>;

  getOrganizationMembers(filters?: {
    category?: string;
    categories?: readonly string[];
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ members: OrganizationMember[]; total: number }>;

  createOrganizationMember(member: InsertOrganizationMember): Promise<OrganizationMember>;

  updateOrganizationMember(id: string, updates: Partial<OrganizationMember>): Promise<OrganizationMember | undefined>;

  reorderOrganizationMembers(category: string, memberIds: string[]): Promise<OrganizationMember[]>;

  deleteOrganizationMember(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, normalizeEmail(email)));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser & { role?: string; userType?: string }): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        email: normalizeEmail(insertUser.email),
        password: hashedPassword,
      })
      .returning();
    return user;
  }

  async createUserWithMember(
    userData: InsertUser & { role?: string; userType?: string },
    memberData: Omit<InsertMember, 'userId'>
  ): Promise<{ user: User; member: Member }> {
    return await db.transaction(async (tx) => {
      // Create user
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const [user] = await tx
        .insert(users)
        .values({
          ...userData,
          email: normalizeEmail(userData.email),
          password: hashedPassword,
          userType: 'company', // Force company type
        })
        .returning();

      // Create member profile
      const [member] = await tx
        .insert(members)
        .values({
          ...memberData,
          userId: user.id,
        })
        .returning();

      return { user, member };
    });
  }

  async createUserForRegistration(
    userData: InsertUser & { userType?: string },
  ): Promise<User> {
    return await db.transaction(async (tx) => {
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      const [user] = await tx
        .insert(users)
        .values({
          ...userData,
          email: normalizeEmail(userData.email),
          // Public registration never grants an administrative account. Admin
          // provisioning is an explicit, deployment-controlled operation.
          role: "user",
          password: hashedPassword,
        })
        .returning();
      return user;
    });
  }

  async createUserWithMemberForRegistration(
    userData: InsertUser & { userType?: string },
    memberData: Omit<InsertMember, 'userId'>,
  ): Promise<{ user: User; member: Member }> {
    return await db.transaction(async (tx) => {
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      const [user] = await tx
        .insert(users)
        .values({
          ...userData,
          email: normalizeEmail(userData.email),
          // Company registration is also a normal, non-privileged signup.
          role: "user",
          password: hashedPassword,
          userType: 'company',
        })
        .returning();

      const [member] = await tx
        .insert(members)
        .values({
          ...memberData,
          userId: user.id,
        })
        .returning();

      return { user, member };
    });
  }

  /**
   * Update account fields and, when authorization state changes, synchronize
   * the account role with exactly one effective ACL membership atomically.
   */
  async updateUserAuthorization(
    id: string,
    updates: Partial<User>,
    accountRole?: AccountRole,
  ): Promise<User | undefined> {
    return await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`user-authorization:${id}`}))`);
      const [currentUser] = await tx.select().from(users).where(eq(users.id, id));
      if (!currentUser) return undefined;

      const finalRole = accountRole
        || (currentUser.role === "member" ? "user" : currentUser.role as AccountRole);
      // Authorization synchronization may be requested even when the
      // effective role/state is unchanged. Only an actual security change
      // revokes existing credentials.
      const authorizationChanged = accountRole !== undefined || updates.isActive !== undefined;
      const roleChanged = accountRole !== undefined && finalRole !== currentUser.role;
      const activeStateChanged = updates.isActive !== undefined
        && updates.isActive !== currentUser.isActive;
      const emailChanged = updates.email !== undefined
        && normalizeEmail(updates.email) !== normalizeEmail(currentUser.email);
      const securityChanged = roleChanged
        || activeStateChanged
        || emailChanged
        || updates.password !== undefined;
      if (authorizationChanged && !ACCOUNT_ROLE_TO_ACL_ROLE[finalRole]) {
        throw new AuthorizationStateError(`Unsupported account role: ${finalRole}`);
      }

      let targetRoleId: string | undefined;
      let targetTierId: string | undefined;
      if (authorizationChanged) {
        const aclRoleCode = ACCOUNT_ROLE_TO_ACL_ROLE[finalRole];
        const [targetRole] = await tx
          .select({ id: roles.id })
          .from(roles)
          .where(and(eq(roles.code, aclRoleCode), eq(roles.isActive, true)))
          .limit(1);

        // Preserve the most recent active tier when possible. An inactive or
        // expired assignment is only used as a tier preference here; it never
        // grants permissions by itself.
        const [currentMembership] = await tx
          .select({ tierId: userMemberships.tierId })
          .from(userMemberships)
          .innerJoin(roles, eq(userMemberships.roleId, roles.id))
          .innerJoin(tiers, eq(userMemberships.tierId, tiers.id))
          .where(and(
            eq(userMemberships.userId, id),
            eq(roles.isActive, true),
            eq(tiers.isActive, true),
          ))
          .orderBy(
            desc(userMemberships.isActive),
            desc(userMemberships.createdAt),
          )
          .limit(1);

        let fallbackTierId = currentMembership?.tierId || undefined;
        if (!fallbackTierId) {
          const fallbackTierCode = finalRole === "user" ? "MEMBER" : "ADMIN";
          const [fallbackTier] = await tx
            .select({ id: tiers.id })
            .from(tiers)
            .where(and(eq(tiers.code, fallbackTierCode), eq(tiers.isActive, true)))
            .limit(1);
          fallbackTierId = fallbackTier?.id;
        }

        if (!targetRole || !fallbackTierId) {
          throw new AuthorizationStateError(
            `ACL role or tier is not configured for ${finalRole}`,
          );
        }
        targetRoleId = targetRole.id;
        targetTierId = fallbackTierId;
      }

      const safeUpdates = {
        ...updates,
        ...(updates.email !== undefined ? { email: normalizeEmail(updates.email) } : {}),
      };
      const [updatedUser] = await tx
        .update(users)
        .set({
          ...safeUpdates,
          ...(authorizationChanged ? { role: finalRole } : {}),
          ...(securityChanged ? { sessionVersion: sql`${users.sessionVersion} + 1` } : {}),
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning();

      if (!authorizationChanged) return updatedUser;

      await tx
        .update(userMemberships)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(and(
          eq(userMemberships.userId, id),
          eq(userMemberships.isActive, true),
        ));

      // A deactivated account must not retain an effective membership. It is
      // re-established on reactivation using its synchronized role.
      if (updatedUser.isActive) {
        await tx.insert(userMemberships).values({
          userId: id,
          tierId: targetTierId!,
          roleId: targetRoleId!,
          isActive: true,
          startedAt: new Date(),
          notes: "Synchronized from account authorization",
        });
      }

      return updatedUser;
    });
  }

  /**
   * Change a membership and derive the account role from its ACL role in the
   * same transaction. Referenced records are validated before old access is
   * deactivated.
   */
  async updateUserMembership(id: string, tierId: string, roleId: string): Promise<User | undefined> {
    return await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`user-authorization:${id}`}))`);
      const [user] = await tx.select().from(users).where(eq(users.id, id));
      if (!user) return undefined;

      const [targetRole] = await tx
        .select({ id: roles.id, code: roles.code })
        .from(roles)
        .where(and(eq(roles.id, roleId), eq(roles.isActive, true)))
        .limit(1);
      const [targetTier] = await tx
        .select({ id: tiers.id })
        .from(tiers)
        .where(and(eq(tiers.id, tierId), eq(tiers.isActive, true)))
        .limit(1);

      if (!targetRole || !targetTier || !(targetRole.code in ACL_ROLE_TO_ACCOUNT_ROLE)) {
        throw new AuthorizationStateError("Referenced ACL role or tier is not active");
      }

      const accountRole = ACL_ROLE_TO_ACCOUNT_ROLE[targetRole.code as AclRoleCode];
      await tx
        .update(userMemberships)
        .set({ isActive: false, updatedAt: new Date() })
        .where(and(
          eq(userMemberships.userId, id),
          eq(userMemberships.isActive, true),
        ));

      await tx.insert(userMemberships).values({
        userId: id,
        tierId: targetTier.id,
        roleId: targetRole.id,
        isActive: user.isActive,
        startedAt: new Date(),
        notes: "Synchronized from membership authorization",
      });

      const [updatedUser] = await tx
        .update(users)
        .set({
          role: accountRole,
          sessionVersion: sql`${users.sessionVersion} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning();

      return updatedUser;
    });
  }

  /**
   * Explicit administrator provisioning for deployment/operations use only.
   * This is deliberately not exposed as an HTTP endpoint.
   */
  async bootstrapAdmin(email: string, password?: string): Promise<User> {
    return await db.transaction(async (tx) => {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        throw new AuthorizationStateError("A valid administrator email is required");
      }
      const [adminRole] = await tx
        .select({ id: roles.id })
        .from(roles)
        .where(and(eq(roles.code, "admin"), eq(roles.isActive, true)))
        .limit(1);
      const [adminTier] = await tx
        .select({ id: tiers.id })
        .from(tiers)
        .where(and(eq(tiers.code, "ADMIN"), eq(tiers.isActive, true)))
        .limit(1);

      if (!adminRole || !adminTier) {
        throw new AuthorizationStateError(
          "ACL seed data is missing; seed roles and tiers before bootstrapping an administrator",
        );
      }

      const [existingUser] = await tx
        .select()
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);

      if (existingUser) {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`user-authorization:${existingUser.id}`}))`);
      }

      let user: User;
      if (existingUser) {
        [user] = await tx
          .update(users)
          .set({
            role: "admin",
            isActive: true,
            sessionVersion: sql`${users.sessionVersion} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingUser.id))
          .returning();
      } else {
        if (!password) {
          throw new AuthorizationStateError(
            "A password is required when bootstrapping a new administrator",
          );
        }
        [user] = await tx
          .insert(users)
          .values({
            email: normalizedEmail,
            password: await bcrypt.hash(password, 10),
            name: "Administrator",
            role: "admin",
            userType: "staff",
            isActive: true,
          })
          .returning();
      }

      await tx
        .update(userMemberships)
        .set({ isActive: false, updatedAt: new Date() })
        .where(and(
          eq(userMemberships.userId, user.id),
          eq(userMemberships.isActive, true),
        ));
      await tx.insert(userMemberships).values({
        userId: user.id,
        tierId: adminTier.id,
        roleId: adminRole.id,
        isActive: true,
        startedAt: new Date(),
        notes: "Explicit administrator bootstrap",
      });

      return user;
    });
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    if (updates.role !== undefined || updates.isActive !== undefined) {
      const { role, ...otherUpdates } = updates;
      const normalizedRole = role === "member" ? "user" : role;
      if (
        normalizedRole !== undefined
        && normalizedRole !== "admin"
        && normalizedRole !== "operator"
        && normalizedRole !== "user"
      ) {
        throw new AuthorizationStateError(`Unsupported account role: ${role}`);
      }
      return this.updateUserAuthorization(
        id,
        otherUpdates,
        normalizedRole as AccountRole | undefined,
      );
    }

    const securityChanged = updates.email !== undefined || updates.password !== undefined;
    const safeUpdates = {
      ...updates,
      ...(updates.email !== undefined ? { email: normalizeEmail(updates.email) } : {}),
      ...(securityChanged ? { sessionVersion: sql`${users.sessionVersion} + 1` } : {}),
    };
    const [user] = await db
      .update(users)
      .set({ ...safeUpdates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async validateUser(email: string, password: string): Promise<User | undefined> {
    const user = await this.getUserByEmail(normalizeEmail(email));
    if (!user || !user.isActive) return undefined;
    
    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : undefined;
  }

  async revokeUserSessions(id: string): Promise<boolean> {
    const result = await db
      .update(users)
      .set({
        sessionVersion: sql`${users.sessionVersion} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning({ id: users.id });
    return result.length > 0;
  }

  async deleteUserAccount(id: string): Promise<boolean> {
    return db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('user-account-deletion'))`);
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`user-authorization:${id}`}))`);

      const [user] = await tx.select().from(users).where(eq(users.id, id));
      if (!user) return false;

      if (user.role === "admin" && user.isActive) {
        const [otherActiveAdmin] = await tx
          .select({ id: users.id })
          .from(users)
          .where(and(
            eq(users.role, "admin"),
            eq(users.isActive, true),
            ne(users.id, id),
          ))
          .limit(1);
        if (!otherActiveAdmin) {
          throw new UserDeletionError(
            "LAST_ACTIVE_ADMIN",
            "The last active administrator cannot be deleted",
          );
        }
      }

      const [inquiryHistory] = await tx
        .select({ count: count() })
        .from(inquiryReplies)
        .where(eq(inquiryReplies.respondedBy, id));
      if ((inquiryHistory?.count || 0) > 0) {
        throw new UserDeletionError(
          "HAS_INQUIRY_HISTORY",
          "Accounts with inquiry reply history must be deactivated instead",
        );
      }

      // Permanent account deletion also removes personal registrations and a
      // linked member profile. Authorship is preserved with a null author via
      // the posts foreign key, while memberships cascade from the user row.
      await tx.delete(eventRegistrations).where(eq(eventRegistrations.userId, id));
      await tx.delete(members).where(eq(members.userId, id));
      await tx.delete(users).where(eq(users.id, id));
      return true;
    });
  }

  async getUserCount(): Promise<number> {
    const [result] = await db.select({ count: count() }).from(users);
    return result?.count || 0;
  }

  async getAdminDashboardSnapshot(
    access: PostAccessContext,
    now = new Date(),
  ): Promise<AdminDashboardSnapshot> {
    const [
      userStatusCounts,
      memberStatusCounts,
      inquiryStatusCounts,
      newsResult,
      newsDraftResult,
      eventResult,
      eventDraftResult,
      resourceResult,
      resourceDraftResult,
      pageResult,
      pageDraftResult,
      recentInquiries,
      eventPosts,
    ] = await Promise.all([
      db
        .select({ status: users.isActive, count: count() })
        .from(users)
        .groupBy(users.isActive),
      db
        .select({ status: members.membershipStatus, count: count() })
        .from(members)
        .groupBy(members.membershipStatus),
      db
        .select({ status: inquiries.status, count: count() })
        .from(inquiries)
        .groupBy(inquiries.status),
      // Post totals deliberately use the existing access-aware helper so
      // dashboard counts cannot drift from administrator post visibility.
      this.getPosts({ postType: "news", limit: 1, access }),
      this.getPosts({ postType: "news", status: "draft", limit: 1, access }),
      this.getPosts({ postType: "event", limit: 1, access }),
      this.getPosts({ postType: "event", status: "draft", limit: 1, access }),
      this.getPosts({ postType: "resource", limit: 1, access }),
      this.getPosts({ postType: "resource", status: "draft", limit: 1, access }),
      this.getPosts({ postType: "page", limit: 1, access }),
      this.getPosts({ postType: "page", status: "draft", limit: 1, access }),
      db
        .select({
          id: inquiries.id,
          subject: inquiries.subject,
          category: inquiries.category,
          status: inquiries.status,
          createdAt: inquiries.createdAt,
        })
        .from(inquiries)
        .orderBy(desc(inquiries.createdAt), desc(inquiries.id))
        .limit(5),
      this.getPosts({
        postType: "event",
        upcoming: true,
        compact: true,
        limit: MAX_POST_PAGE_SIZE,
        access,
      }),
    ]);

    const getGroupedCount = <T extends string | boolean>(
      rows: Array<{ status: T; count: number }>,
      status: T,
    ) => Number(rows.find((row) => row.status === status)?.count ?? 0);
    const totalUsers = userStatusCounts.reduce((total, row) => total + Number(row.count), 0);
    const activeUsers = getGroupedCount(userStatusCounts, true);
    const inactiveUsers = getGroupedCount(userStatusCounts, false);
    const totalMembers = memberStatusCounts.reduce((total, row) => total + Number(row.count), 0);
    const activeMembers = getGroupedCount(memberStatusCounts, "active");
    const pendingMembers = getGroupedCount(memberStatusCounts, "pending");
    const inactiveMembers = getGroupedCount(memberStatusCounts, "inactive");
    const totalInquiries = inquiryStatusCounts.reduce((total, row) => total + Number(row.count), 0);
    const unresolvedInquiries = inquiryStatusCounts
      .filter(({ status }) => status !== "resolved")
      .reduce((total, row) => total + Number(row.count), 0);
    const totalNews = Number(newsResult.total);
    const totalEvents = Number(eventResult.total);
    const totalContent = totalNews + totalEvents +
      Number(resourceResult.total) + Number(pageResult.total);
    const unpublishedNews = Number(newsDraftResult.total);
    const unpublishedEvents = Number(eventDraftResult.total);
    const unpublishedContent = unpublishedNews + unpublishedEvents +
      Number(resourceDraftResult.total) + Number(pageDraftResult.total);

    const getEventMeta = (post: PostWithTranslations, key: string): unknown => {
      const meta = post.meta.find((item) => item.key === key);
      return meta ? getStoredPostMetaValue(meta) : undefined;
    };
    const getTitle = (post: PostWithTranslations): string => {
      const translation = post.translations.find(
        (item) => item.locale === post.primaryLocale,
      ) || post.translations[0];
      return translation?.title || post.slug;
    };
    const upcomingEventRows = eventPosts.posts
      .map((post) => {
        const eventDate = getEventMeta(post, "event.eventDate") ??
          getEventMeta(post, "event.date");
        if (!(eventDate instanceof Date) && typeof eventDate !== "string") return null;
        const parsedDate = new Date(eventDate);
        if (Number.isNaN(parsedDate.getTime()) || parsedDate < now) return null;
        const location = getEventMeta(post, "event.location");
        return {
          id: post.id,
          title: getTitle(post),
          status: post.status,
          eventDate: parsedDate.toISOString(),
          location: typeof location === "string" ? location : null,
        };
      })
      .filter((event): event is NonNullable<typeof event> => event !== null)
      .sort((a, b) => a.eventDate.localeCompare(b.eventDate) || a.id.localeCompare(b.id))
      .slice(0, 5);

    return {
      stats: {
        totalMembers,
        totalEvents,
        totalNews,
        totalInquiries,
        totalUsers,
        activeUsers,
        inactiveUsers,
        activeMembers,
        pendingMembers,
        inactiveMembers,
        unpublishedNews,
        unpublishedEvents,
        totalContent,
        unpublishedContent,
        upcomingEvents: Number(eventPosts.total),
        unresolvedInquiries,
      },
      recentInquiries: recentInquiries.map((inquiry) => ({
        ...inquiry,
        createdAt: inquiry.createdAt.toISOString(),
      })),
      upcomingEvents: upcomingEventRows,
    };
  }

  async getUsers(filters?: {
    limit?: number;
    offset?: number;
  }): Promise<{ users: User[]; total: number }> {
    const limit = boundedPageSize(filters?.limit, MAX_ADMIN_COLLECTION_PAGE_SIZE);
    const offset = boundedOffset(filters?.offset);
    const [[totalResult], usersResult] = await Promise.all([
      db.select({ count: count() }).from(users),
      db
        .select()
        .from(users)
        .orderBy(desc(users.createdAt), desc(users.id))
        .limit(limit)
        .offset(offset),
    ]);

    return {
      users: usersResult,
      total: totalResult?.count || 0,
    };
  }

  // Members
  async getMember(id: string): Promise<Member | undefined> {
    const [member] = await db.select().from(members).where(eq(members.id, id));
    return member || undefined;
  }

  async getMemberByUserId(userId: string): Promise<Member | undefined> {
    const [member] = await db.select().from(members).where(eq(members.userId, userId));
    return member || undefined;
  }

  async getMembers(filters?: {
    country?: string;
    industry?: string;
    membershipLevel?: string;
    search?: string;
    admin?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ members: Member[]; total: number }> {
    let query = db.select().from(members);
    let countQuery = db.select({ count: count() }).from(members);
    const limit = boundedPageSize(filters?.limit, MAX_MEMBER_PAGE_SIZE);
    const offset = boundedOffset(filters?.offset);

    // Public reads must never rely on the caller filtering lifecycle state.
    // The admin flag is only exposed by authenticated admin routes.
    const conditions = filters?.admin
      ? []
      : [eq(members.isPublic, true), eq(members.membershipStatus, "active")];

    if (filters?.country) {
      conditions.push(eq(members.country, filters.country));
    }
    if (filters?.industry) {
      conditions.push(eq(members.industry, filters.industry));
    }
    if (filters?.membershipLevel) {
      conditions.push(eq(members.membershipLevel, filters.membershipLevel));
    }
    if (filters?.search) {
      const searchCondition = or(
        like(members.companyName, `%${filters.search}%`),
        like(members.description, `%${filters.search}%`)
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    if (conditions.length > 0) {
      const whereCondition = and(...conditions);
      if (whereCondition) {
        // @ts-expect-error - Drizzle ORM type inference issue, works at runtime
        query = query.where(whereCondition);
        // @ts-expect-error - Drizzle ORM type inference issue, works at runtime
        countQuery = countQuery.where(whereCondition);
      }
    }

    const [[totalResult], membersResult] = await Promise.all([
      countQuery,
      query
        .orderBy(desc(members.createdAt))
        .limit(limit)
        .offset(offset),
    ]);

    return {
      members: membersResult,
      total: totalResult?.count || 0,
    };
  }

  async createMember(member: InsertMember): Promise<Member> {
    const [newMember] = await db
      .insert(members)
      .values(member)
      .returning();
    return newMember;
  }

  async updateMember(id: string, updates: Partial<Member>): Promise<Member | undefined> {
    const [member] = await db
      .update(members)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(members.id, id))
      .returning();
    return member || undefined;
  }

  async deleteMember(id: string): Promise<void> {
    await db.delete(members).where(eq(members.id, id));
  }

  // Event Registrations
  async getEventRegistration(eventId: string, userId: string): Promise<EventRegistration | undefined> {
    const [registration] = await db
      .select()
      .from(eventRegistrations)
      .where(and(
        eq(eventRegistrations.eventId, eventId),
        eq(eventRegistrations.userId, userId)
      ));
    return registration || undefined;
  }

  async getEventRegistrationById(id: string): Promise<EventRegistration | undefined> {
    const [registration] = await db
      .select()
      .from(eventRegistrations)
      .where(eq(eventRegistrations.id, id));
    return registration || undefined;
  }

  async getEventRegistrations(eventId: string): Promise<EventRegistration[]> {
    const registrations = await db
      .select({
        registration: eventRegistrations,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(eventRegistrations)
      .leftJoin(users, eq(eventRegistrations.userId, users.id))
      .where(eq(eventRegistrations.eventId, eventId))
      .orderBy(desc(eventRegistrations.createdAt));

    return registrations.map(({ registration, user }) => ({
      ...registration,
      user,
    })) as any;
  }

  async getUserRegistrations(userId: string): Promise<UserRegistrationWithEvent[]> {
    // Get all registrations for this user
    const registrations = await db
      .select()
      .from(eventRegistrations)
      .where(eq(eventRegistrations.userId, userId))
      .orderBy(desc(eventRegistrations.createdAt));

    // Fetch all related event data in three bounded queries instead of one
    // post/meta/translation query per registration.
    const eventIds = registrations.map(r => r.eventId).filter(Boolean) as string[];
    
    if (eventIds.length === 0) {
      return registrations.map(registration => ({
        ...registration,
        event: null,
      }));
    }

    const [eventPosts, translations, meta] = await Promise.all([
      db.select().from(posts).where(inArray(posts.id, eventIds)),
      db.select().from(postTranslations).where(inArray(postTranslations.postId, eventIds)),
      db.select().from(postMeta).where(inArray(postMeta.postId, eventIds)),
    ]);

    const translationsByPost = new Map<string, PostTranslation[]>();
    for (const translation of translations) {
      const existing = translationsByPost.get(translation.postId) || [];
      translationsByPost.set(translation.postId, [...existing, translation]);
    }
    const metaByPost = new Map<string, PostMeta[]>();
    for (const item of meta) {
      const existing = metaByPost.get(item.postId) || [];
      metaByPost.set(item.postId, [...existing, item]);
    }
    const eventsMap = new Map(eventPosts.map(event => [
      event.id,
      {
        ...event,
        translations: translationsByPost.get(event.id) || [],
        meta: metaByPost.get(event.id) || [],
      },
    ]));

    // Merge registrations with their event data
    return registrations.map(registration => ({
      ...registration,
      event: registration.eventId ? (eventsMap.get(registration.eventId) || null) : null,
    }));
  }

  async createEventRegistration(registration: InsertEventRegistration): Promise<EventRegistration | undefined> {
    const [newRegistration] = await db
      .insert(eventRegistrations)
      .values(registration)
      .onConflictDoNothing({
        target: [eventRegistrations.eventId, eventRegistrations.userId],
      })
      .returning();
    return newRegistration || undefined;
  }

  async registerForEvent(registration: InsertEventRegistration): Promise<EventRegistration> {
    if (!registration.eventId || !registration.userId) {
      throw new EventRegistrationError("EVENT_NOT_FOUND", "Event and user are required");
    }
    const eventId = registration.eventId;
    const userId = registration.userId;

    return db.transaction(async (tx) => {
      // Serialize all registration and cancellation decisions for this event.
      // The lock is held until the transaction commits, so a capacity check and
      // the subsequent insert/reactivation are one atomic decision.
      await tx.execute(sql`SELECT ${posts.id} FROM ${posts} WHERE ${posts.id} = ${eventId} FOR UPDATE`);

      const [event] = await tx
        .select()
        .from(posts)
        .where(eq(posts.id, eventId));
      if (!event) {
        throw new EventRegistrationError("EVENT_NOT_FOUND", "Event not found");
      }

      const meta = await tx
        .select()
        .from(postMeta)
        .where(eq(postMeta.postId, eventId));
      const now = new Date();

      const [existingRegistration] = await tx
        .select()
        .from(eventRegistrations)
        .where(and(
          eq(eventRegistrations.eventId, eventId),
          eq(eventRegistrations.userId, userId),
        ));

      const [{ activeCount }] = await tx
        .select({
          activeCount: count(),
        })
        .from(eventRegistrations)
        .where(and(
          eq(eventRegistrations.eventId, eventId),
          ne(eventRegistrations.status, "cancelled"),
        ));

      validateEventRegistrationAvailability(event, meta, now);

      if (existingRegistration) {
        if (existingRegistration.status === "cancelled") {
          validateEventCapacity(meta, activeCount);
          const [reactivated] = await tx
            .update(eventRegistrations)
            .set({ status: "registered" })
            .where(eq(eventRegistrations.id, existingRegistration.id))
            .returning();
          return reactivated;
        }
        throw new EventRegistrationError(
          "REGISTRATION_DUPLICATE",
          "Already registered for this event",
        );
      }

      validateEventCapacity(meta, activeCount);
      const [created] = await tx
        .insert(eventRegistrations)
        .values({
          eventId,
          userId,
          attendeeName: registration.attendeeName,
          attendeeEmail: registration.attendeeEmail,
          attendeePhone: registration.attendeePhone,
          companyName: registration.companyName,
          // These fields are deliberately assigned here rather than accepting
          // values from the registration request.
          status: "registered",
          paymentStatus: "free",
        })
        .onConflictDoNothing({
          target: [eventRegistrations.eventId, eventRegistrations.userId],
        })
        .returning();

      if (!created) {
        throw new EventRegistrationError(
          "REGISTRATION_DUPLICATE",
          "Already registered for this event",
        );
      }
      return created;
    });
  }

  async cancelEventRegistration(id: string, userId: string): Promise<EventRegistration> {
    return db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(eventRegistrations)
        .where(eq(eventRegistrations.id, id));
      if (!current) {
        throw new EventRegistrationError("REGISTRATION_NOT_FOUND", "Registration not found");
      }
      if (current.userId !== userId) {
        throw new EventRegistrationError(
          "REGISTRATION_NOT_OWNER",
          "You can only cancel your own registrations",
        );
      }

      // Use the same event lock as registration so a cancellation cannot race
      // a capacity decision for the same event.
      if (current.eventId) {
        await tx.execute(sql`SELECT ${posts.id} FROM ${posts} WHERE ${posts.id} = ${current.eventId} FOR UPDATE`);
      }

      const [locked] = await tx
        .select()
        .from(eventRegistrations)
        .where(eq(eventRegistrations.id, id))
        .for("update");
      if (!locked) {
        throw new EventRegistrationError("REGISTRATION_NOT_FOUND", "Registration not found");
      }
      if (locked.userId !== userId) {
        throw new EventRegistrationError(
          "REGISTRATION_NOT_OWNER",
          "You can only cancel your own registrations",
        );
      }
      if (locked.status === "cancelled") {
        throw new EventRegistrationError(
          "REGISTRATION_ALREADY_CANCELLED",
          "Registration is already cancelled",
        );
      }
      if (locked.status === "attended") {
        throw new EventRegistrationError(
          "REGISTRATION_ATTENDED",
          "Cannot cancel attended event",
        );
      }

      const [cancelled] = await tx
        .update(eventRegistrations)
        .set({ status: "cancelled" })
        .where(eq(eventRegistrations.id, id))
        .returning();
      return cancelled;
    });
  }

  async updateEventRegistration(id: string, updates: Partial<EventRegistration>): Promise<EventRegistration | undefined> {
    const [registration] = await db
      .update(eventRegistrations)
      .set(updates)
      .where(eq(eventRegistrations.id, id))
      .returning();
    return registration || undefined;
  }

  // Inquiries
  async getInquiry(id: string): Promise<Inquiry | undefined> {
    const [inquiry] = await db.select().from(inquiries).where(eq(inquiries.id, id));
    return inquiry || undefined;
  }

  async getInquiries(filters?: {
    status?: string;
    category?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ inquiries: Inquiry[]; total: number }> {
    let query = db.select().from(inquiries);
    let countQuery = db.select({ count: count() }).from(inquiries);

    const conditions = [];

    if (filters?.status) {
      conditions.push(eq(inquiries.status, filters.status));
    }
    if (filters?.category) {
      conditions.push(eq(inquiries.category, filters.category));
    }

    if (conditions.length > 0) {
      const whereCondition = and(...conditions);
      if (whereCondition) {
        // @ts-expect-error - Drizzle ORM type inference issue, works at runtime
        query = query.where(whereCondition);
        // @ts-expect-error - Drizzle ORM type inference issue, works at runtime
        countQuery = countQuery.where(whereCondition);
      }
    }

    const [totalResults, inquiriesResult] = await Promise.all([
      countQuery,
      query
        .orderBy(desc(inquiries.createdAt))
        .limit(filters?.limit || 50)
        .offset(filters?.offset || 0),
    ]);
    const [totalResult] = totalResults;

    return {
      inquiries: inquiriesResult,
      total: totalResult.count,
    };
  }

  async createInquiry(inquiry: InsertInquiry): Promise<Inquiry> {
    const duplicateWindowStart = new Date(Date.now() - 15 * 60 * 1000);

    return db.transaction(async (tx) => {
      // Serialize matching submissions by email so concurrent retries cannot
      // both pass the duplicate check.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`inquiry:${inquiry.email}`}))`);

      const [recentMatch] = await tx
        .select({ id: inquiries.id })
        .from(inquiries)
        .where(and(
          eq(inquiries.category, inquiry.category),
          eq(inquiries.name, inquiry.name),
          eq(inquiries.email, inquiry.email),
          inquiry.phone ? eq(inquiries.phone, inquiry.phone) : isNull(inquiries.phone),
          inquiry.companyName ? eq(inquiries.companyName, inquiry.companyName) : isNull(inquiries.companyName),
          eq(inquiries.subject, inquiry.subject),
          eq(inquiries.message, inquiry.message),
          gte(inquiries.createdAt, duplicateWindowStart),
        ))
        .limit(1);

      if (recentMatch) {
        throw new DuplicateInquiryError();
      }

      const [newInquiry] = await tx
        .insert(inquiries)
        .values(inquiry)
        .returning();
      return newInquiry;
    });
  }

  async updateInquiry(id: string, updates: Partial<Inquiry>): Promise<Inquiry | undefined> {
    const [inquiry] = await db
      .update(inquiries)
      .set(updates)
      .where(eq(inquiries.id, id))
      .returning();
    return inquiry || undefined;
  }

  async deleteInquiry(id: string): Promise<void> {
    await db.delete(inquiries).where(eq(inquiries.id, id));
  }

  async getInquiryWithReplies(id: string): Promise<InquiryWithReplies | undefined> {
    const inquiry = await this.getInquiry(id);
    if (!inquiry) return undefined;

    const replies = await db
      .select({
        reply: inquiryReplies,
        responder: {
          id: users.id,
          name: users.name,
        } satisfies Record<keyof SafeUser, unknown>,
      })
      .from(inquiryReplies)
      .leftJoin(users, eq(inquiryReplies.respondedBy, users.id))
      .where(eq(inquiryReplies.inquiryId, id))
      .orderBy(inquiryReplies.createdAt);

    return {
      ...inquiry,
      replies: replies.map(r => ({
        ...r.reply,
        responder: r.responder || null,
      })),
    };
  }

  async getInquiryReplies(inquiryId: string): Promise<InquiryReply[]> {
    return db
      .select()
      .from(inquiryReplies)
      .where(eq(inquiryReplies.inquiryId, inquiryId))
      .orderBy(inquiryReplies.createdAt);
  }

  async createInquiryReply(reply: InsertInquiryReply): Promise<InquiryReply> {
    const [newReply] = await db
      .insert(inquiryReplies)
      .values(reply)
      .returning();
    return newReply;
  }

  async updateInquiryReplyEmailStatus(id: string, sent: boolean): Promise<void> {
    await db
      .update(inquiryReplies)
      .set({
        emailSent: sent,
        emailSentAt: sent ? new Date() : null,
      })
      .where(eq(inquiryReplies.id, id));
  }

  // Partners
  async getPartner(id: string): Promise<Partner | undefined> {
    const [partner] = await db.select().from(partners).where(eq(partners.id, id));
    return partner || undefined;
  }

  async getPartners(filters?: {
    active?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ partners: Partner[]; total: number }> {
    let query = db.select().from(partners);
    let countQuery = db.select({ count: count() }).from(partners);
    const limit = boundedPageSize(filters?.limit, MAX_ADMIN_COLLECTION_PAGE_SIZE);
    const offset = boundedOffset(filters?.offset);

    if (filters?.active !== undefined) {
      // @ts-expect-error - Drizzle ORM type inference issue, works at runtime
      query = query.where(eq(partners.isActive, filters.active));
      // @ts-expect-error - Drizzle ORM type inference issue, works at runtime
      countQuery = countQuery.where(eq(partners.isActive, filters.active));
    }

    const [[totalResult], partnersResult] = await Promise.all([
      countQuery,
      query
        .orderBy(
          asc(partners.order),
          asc(partners.name),
          asc(partners.createdAt),
          asc(partners.id),
        )
        .limit(limit)
        .offset(offset),
    ]);

    return {
      partners: partnersResult,
      total: totalResult?.count || 0,
    };
  }

  async createPartner(partner: InsertPartner): Promise<Partner> {
    const [newPartner] = await db
      .insert(partners)
      .values(partner)
      .returning();
    return newPartner;
  }

  async updatePartner(id: string, updates: Partial<Partner>): Promise<Partner | undefined> {
    const [partner] = await db
      .update(partners)
      .set(updates)
      .where(eq(partners.id, id))
      .returning();
    return partner || undefined;
  }

  async deletePartner(id: string): Promise<void> {
    await db.delete(partners).where(eq(partners.id, id));
  }

  async getSurveySettings(): Promise<SurveySettings | undefined> {
    const [settings] = await db
      .select()
      .from(surveySettings)
      .where(eq(surveySettings.id, "default"))
      .limit(1);
    return settings || undefined;
  }

  async upsertSurveySettings(settings: SurveySettingsInput, updatedBy: string): Promise<SurveySettings> {
    return await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('survey-settings:default'))`);
      const [current] = await tx
        .select()
        .from(surveySettings)
        .where(eq(surveySettings.id, "default"))
        .limit(1);
      const nextValues = {
        title: settings.title,
        description: settings.description,
        externalUrl: settings.externalUrl || null,
        isActive: settings.isActive,
        startsAt: settings.startsAt,
        endsAt: settings.endsAt,
      };
      const [actor] = await tx
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, updatedBy))
        .limit(1);
      if (!actor) {
        throw new Error("Survey settings editor not found");
      }

      if (!current) {
        const [created] = await tx
          .insert(surveySettings)
          .values({
            id: "default",
            ...nextValues,
            updatedBy,
          })
          .returning();
        await tx.insert(surveySettingsHistory).values({
          surveySettingsId: created.id,
          version: 1,
          ...nextValues,
          changedBy: updatedBy,
          changedByName: actor.name,
          changedAt: created.updatedAt,
        });
        return created;
      }

      const [existingHistory] = await tx
        .select({ id: surveySettingsHistory.id })
        .from(surveySettingsHistory)
        .where(eq(surveySettingsHistory.surveySettingsId, current.id))
        .limit(1);
      if (!existingHistory) {
        const [baselineActor] = current.updatedBy
          ? await tx
            .select({ name: users.name })
            .from(users)
            .where(eq(users.id, current.updatedBy))
            .limit(1)
          : [];
        await tx.insert(surveySettingsHistory).values({
          surveySettingsId: current.id,
          version: 1,
          title: current.title,
          description: current.description,
          externalUrl: current.externalUrl,
          isActive: current.isActive,
          startsAt: current.startsAt,
          endsAt: current.endsAt,
          changedBy: current.updatedBy,
          changedByName: baselineActor?.name || "알 수 없음",
          changedAt: current.updatedAt,
        });
      }

      const datesEqual = (left: Date | null, right: Date | null) =>
        (left?.getTime() ?? null) === (right?.getTime() ?? null);
      const hasChanged =
        current.title !== nextValues.title ||
        current.description !== nextValues.description ||
        current.externalUrl !== nextValues.externalUrl ||
        current.isActive !== nextValues.isActive ||
        !datesEqual(current.startsAt, nextValues.startsAt) ||
        !datesEqual(current.endsAt, nextValues.endsAt);
      if (!hasChanged) return current;

      const changedAt = new Date();
      const [versionResult] = await tx
        .select({ maxVersion: sql<number>`coalesce(max(${surveySettingsHistory.version}), 0)` })
        .from(surveySettingsHistory)
        .where(eq(surveySettingsHistory.surveySettingsId, current.id));
      const [updated] = await tx
        .update(surveySettings)
        .set({
          ...nextValues,
          updatedBy,
          updatedAt: changedAt,
        })
        .where(eq(surveySettings.id, current.id))
        .returning();
      await tx.insert(surveySettingsHistory).values({
        surveySettingsId: updated.id,
        version: Number(versionResult?.maxVersion ?? 0) + 1,
        ...nextValues,
        changedBy: updatedBy,
        changedByName: actor.name,
        changedAt,
      });
      return updated;
    });
  }

  async getSurveySettingsHistory(filters: {
    limit?: number;
    offset?: number;
    snapshotVersion?: number;
  } = {}): Promise<{ history: SurveySettingsHistoryEntry[]; total: number; snapshotVersion: number }> {
    const limit = boundedPageSize(filters.limit, 50);
    const offset = boundedOffset(filters.offset);
    const [latest] = await db
      .select({ version: surveySettingsHistory.version })
      .from(surveySettingsHistory)
      .where(eq(surveySettingsHistory.surveySettingsId, "default"))
      .orderBy(desc(surveySettingsHistory.version))
      .limit(1);
    const snapshotVersion = Math.min(
      filters.snapshotVersion ?? latest?.version ?? 0,
      latest?.version ?? 0,
    );
    const snapshotCondition = and(
      eq(surveySettingsHistory.surveySettingsId, "default"),
      lte(surveySettingsHistory.version, snapshotVersion),
    );
    const [totalResult, history] = await Promise.all([
      db
        .select({ count: count() })
        .from(surveySettingsHistory)
        .where(snapshotCondition),
      db
        .select({
          id: surveySettingsHistory.id,
          surveySettingsId: surveySettingsHistory.surveySettingsId,
          version: surveySettingsHistory.version,
          title: surveySettingsHistory.title,
          description: surveySettingsHistory.description,
          externalUrl: surveySettingsHistory.externalUrl,
          isActive: surveySettingsHistory.isActive,
          startsAt: surveySettingsHistory.startsAt,
          endsAt: surveySettingsHistory.endsAt,
          changedBy: surveySettingsHistory.changedBy,
          changedByName: surveySettingsHistory.changedByName,
          changedAt: surveySettingsHistory.changedAt,
        })
        .from(surveySettingsHistory)
        .where(snapshotCondition)
        .orderBy(
          desc(surveySettingsHistory.changedAt),
          desc(surveySettingsHistory.version),
          desc(surveySettingsHistory.id),
        )
        .limit(limit)
        .offset(offset),
    ]);
    return {
      history,
      total: Number(totalResult[0]?.count ?? 0),
      snapshotVersion,
    };
  }

  // Unified Posts System
  // Posts
  async getPostAccessContext(userId?: string, managementRequested = false): Promise<PostAccessContext> {
    if (!userId) return publicPostAccess;

    const [user] = await db
      .select({ id: users.id, role: users.role, isActive: users.isActive })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user?.isActive) return publicPostAccess;

    // The account row, not a query parameter or token claim, is the authority
    // for administrator access.
    if (user.role === "admin") {
      return {
        userId,
        isAdmin: true,
        isEditor: false,
        managedPostTypes: new Set(Object.keys(postPermissionKeys)),
        canReadMembers: true,
        canReadPremium: true,
      };
    }

    const now = new Date();
    const [activeMemberships, managedPostTypes] = await Promise.all([
      db
        .select({ tierCode: tiers.code, roleCode: roles.code })
        .from(userMemberships)
        .innerJoin(tiers, eq(userMemberships.tierId, tiers.id))
        .innerJoin(roles, eq(userMemberships.roleId, roles.id))
        .where(and(
          eq(userMemberships.userId, userId),
          eq(userMemberships.isActive, true),
          eq(tiers.isActive, true),
          eq(roles.isActive, true),
          lte(userMemberships.startedAt, now),
          or(isNull(userMemberships.expiresAt), gt(userMemberships.expiresAt, now)),
        )),
      managementRequested
        ? Promise.all(
            Object.entries(postPermissionKeys).map(async ([postType]) => {
              const permission = getPostPermissionKey(
                postType as keyof typeof postPermissionKeys,
                "read",
              );
              return permission && await hasPermission(userId, permission) ? postType : undefined;
            }),
          ).then((postTypes) => new Set(postTypes.filter((postType): postType is string => Boolean(postType))))
        : Promise.resolve(new Set<string>()),
    ]);

    const premiumTiers = new Set([
      "PRO", "CORP", "PARTNER", "ADMIN",
      "PREMIUM", "SILVER", "GOLD", "PLATINUM",
    ]);
    const editorAccount = user.role === "operator" ||
      activeMemberships.some(({ roleCode }) => roleCode === "editor" || roleCode === "operator");

    return {
      userId,
      isAdmin: false,
      isEditor: managementRequested && editorAccount && managedPostTypes.size > 0,
      managedPostTypes,
      canReadMembers: activeMemberships.length > 0,
      canReadPremium: activeMemberships.some(({ tierCode }) =>
        premiumTiers.has(tierCode.toUpperCase()),
      ),
    };
  }

  async getPost(id: string): Promise<Post | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    return post || undefined;
  }

  async getPostBySlug(slug: string): Promise<Post | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.slug, slug));
    return post || undefined;
  }

  async getPostByObjectPath(objectPath: string): Promise<Post | undefined> {
    const [result] = await db
      .select({ post: posts })
      .from(postMeta)
      .innerJoin(posts, eq(postMeta.postId, posts.id))
      .where(and(
        eq(postMeta.key, "resource.fileUrl"),
        or(
          eq(postMeta.valueText, objectPath),
          sql`${postMeta.value} = ${JSON.stringify(objectPath)}::jsonb`,
        )!,
      ));
    return result?.post;
  }

  async claimDueScheduledPosts(now: Date, limit: number): Promise<Post[]> {
    const boundedLimit = boundedPageSize(limit, 100);
    return db.transaction(async (tx) => {
      // The row lock and the status transition share one transaction. A
      // second instance skips these rows and cannot publish them twice.
      const duePosts = await tx
        .select()
        .from(posts)
        .where(and(
          eq(posts.status, "draft"),
          isNotNull(posts.scheduledAt),
          lte(posts.scheduledAt, now),
          isNull(posts.publishedAt),
          or(isNull(posts.expiresAt), gt(posts.expiresAt, now)),
          or(isNull(posts.expiresAt), gt(posts.expiresAt, posts.scheduledAt)),
        )!)
        .orderBy(asc(posts.scheduledAt))
        .limit(boundedLimit)
        .for("update", { skipLocked: true });

      const publishedPosts: Post[] = [];
      for (const post of duePosts) {
        const [publishedPost] = await tx
          .update(posts)
          .set({
            status: "published",
            // The scheduled instant is the canonical publication instant.
            // `now` is used only for a legacy row missing scheduledAt.
            publishedAt: post.scheduledAt || now,
            updatedAt: now,
          })
          .where(and(
            eq(posts.id, post.id),
            eq(posts.status, "draft"),
            isNull(posts.publishedAt),
          )!)
          .returning();
        if (publishedPost) publishedPosts.push(publishedPost);
      }
      return publishedPosts;
    });
  }

  async getResourcePostsNeedingAcl(now: Date, limit: number): Promise<Post[]> {
    const expectedMarker = sql`concat(
      to_char(${posts.updatedAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      ':',
      CASE
        WHEN ${posts.status} = 'published'
          AND ${posts.visibility} = 'public'
          AND (${posts.publishedAt} IS NULL OR ${posts.publishedAt} <= ${now})
          AND (${posts.expiresAt} IS NULL OR ${posts.expiresAt} > ${now})
        THEN 'public'
        ELSE 'private'
      END
    )`;

    return db
      .select()
      .from(posts)
      .where(and(
        eq(posts.postType, "resource"),
        sql`EXISTS (
          SELECT 1
          FROM ${postMeta} AS resource_file
          WHERE resource_file.post_id = ${posts.id}
            AND resource_file.meta_key = 'resource.fileUrl'
            AND (resource_file.value_text IS NOT NULL OR resource_file.meta_value IS NOT NULL)
        )`,
        sql`NOT EXISTS (
          SELECT 1
          FROM ${postMeta} AS acl_marker
          WHERE acl_marker.post_id = ${posts.id}
            AND acl_marker.meta_key = ${RESOURCE_ACL_SYNC_META_KEY}
            AND acl_marker.value_text = ${expectedMarker}
        )`,
      )!)
      .orderBy(asc(posts.updatedAt))
      .limit(boundedPageSize(limit, 100));
  }

  private async getLocalizedPostTranslations(postId: string, primaryLocale: string, locale?: string): Promise<PostTranslation[]> {
    if (!locale) {
      return db
        .select()
        .from(postTranslations)
        .where(eq(postTranslations.postId, postId));
    }

    const locales = Array.from(new Set([locale, primaryLocale]));
    const translations = await db
      .select()
      .from(postTranslations)
      .where(and(
        eq(postTranslations.postId, postId),
        inArray(postTranslations.locale, locales as any),
      ));

    // Preserve the old "first available translation" fallback for incomplete content.
    if (translations.length === 0) {
      return db
        .select()
        .from(postTranslations)
        .where(eq(postTranslations.postId, postId))
        .limit(1);
    }
    return translations;
  }

  async getPostBySlugWithTranslations(
    slug: string,
    locale?: string,
    access: PostAccessContext = publicPostAccess,
  ): Promise<PostWithTranslations | undefined> {
    const post = await this.getPostBySlug(slug);
    if (!post || !canReadPost(post, access)) return undefined;

    const [translations, meta] = await Promise.all([
      this.getLocalizedPostTranslations(post.id, post.primaryLocale, locale),
      this.getPostMetaAll(post.id, access),
    ]);
    const registrationCount = post.postType === "event"
      ? await this.getActiveEventRegistrationCount(post.id)
      : undefined;

    return {
      ...post,
      translations,
      meta,
      ...(registrationCount !== undefined ? { registrationCount } : {}),
    };
  }

  async getPostWithTranslations(
    id: string,
    locale?: string,
    access: PostAccessContext = publicPostAccess,
  ): Promise<PostWithTranslations | undefined> {
    const post = await this.getPost(id);
    if (!post || !canReadPost(post, access)) return undefined;

    const [translations, meta] = await Promise.all([
      this.getLocalizedPostTranslations(id, post.primaryLocale, locale),
      this.getPostMetaAll(id, access),
    ]);
    const registrationCount = post.postType === "event"
      ? await this.getActiveEventRegistrationCount(id)
      : undefined;

    return {
      ...post,
      translations,
      meta,
      ...(registrationCount !== undefined ? { registrationCount } : {}),
    };
  }

  private async getActiveEventRegistrationCount(eventId: string): Promise<number> {
    const [{ activeCount }] = await db
      .select({ activeCount: count() })
      .from(eventRegistrations)
      .where(and(
        eq(eventRegistrations.eventId, eventId),
        ne(eventRegistrations.status, "cancelled"),
      ));
    return Number(activeCount || 0);
  }

  async getPosts(filters?: {
    postType?: string;
    status?: string;
    visibility?: string;
    authorId?: string;
    isFeatured?: boolean;
    tags?: string[];
    search?: string;
    publishedAfter?: Date;
    publishedBefore?: Date;
    upcoming?: boolean;
    locale?: string;
    compact?: boolean;
    limit?: number;
    offset?: number;
    access?: PostAccessContext;
  }): Promise<{ posts: PostWithTranslations[]; total: number }> {
    let query = db.select().from(posts);
    let countQuery = db.select({ count: count() }).from(posts);

    const conditions = [];
    const upcomingEventDate = filters?.upcoming && filters?.postType === "event"
      ? sql<Date | null>`(
          SELECT COALESCE(
            ${postMeta.valueTimestamp},
            CASE
              WHEN ${postMeta.valueText} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
              THEN ${postMeta.valueText}::timestamp
              ELSE NULL
            END
          )
          FROM ${postMeta}
          WHERE ${postMeta.postId} = ${posts.id}
            AND ${postMeta.key} IN ('event.eventDate', 'event.date')
          ORDER BY CASE WHEN ${postMeta.key} = 'event.eventDate' THEN 0 ELSE 1 END
          LIMIT 1
        )`
      : undefined;

    if (filters?.postType) {
      conditions.push(eq(posts.postType, filters.postType as any));
    }

    const access = filters?.access || publicPostAccess;

    if (access.isAdmin && filters?.status) {
      conditions.push(eq(posts.status, filters.status as any));
    } else if (canManagePostType(access, filters?.postType || "")) {
      // Editor lists are scoped to the requested post type and expose only
      // editable states. Archived content remains an administrator concern.
      if (filters?.status) {
        if (filters.status === "draft" || filters.status === "published") {
          conditions.push(eq(posts.status, filters.status as any));
        } else {
          conditions.push(sql`FALSE`);
        }
      } else {
        conditions.push(inArray(posts.status, ["draft", "published"] as any));
      }
      const now = new Date();
      if (filters?.status !== "draft") {
        conditions.push(or(
          eq(posts.status, "draft"),
          and(
            eq(posts.status, "published"),
            or(isNull(posts.publishedAt), lte(posts.publishedAt, now)),
            or(isNull(posts.expiresAt), gt(posts.expiresAt, now)),
          ),
        )!);
      }
    } else if (!access.isAdmin) {
      conditions.push(eq(posts.status, "published"));
    }

    if (access.isAdmin && filters?.visibility) {
      conditions.push(eq(posts.visibility, filters.visibility as any));
    } else if (!access.isAdmin) {
      const readableVisibilities = ["public"];
      if (access.canReadMembers) readableVisibilities.push("members");
      if (access.canReadPremium) readableVisibilities.push("premium");

      if (filters?.visibility && !readableVisibilities.includes(filters.visibility)) {
        conditions.push(sql`FALSE`);
      } else {
        conditions.push(inArray(posts.visibility, readableVisibilities as any));
      }
      if (!canManagePostType(access, filters?.postType || "")) {
        conditions.push(or(
          isNull(posts.publishedAt),
          lte(posts.publishedAt, new Date()),
        )!);
        conditions.push(or(
          isNull(posts.expiresAt),
          gt(posts.expiresAt, new Date()),
        )!);
      } else if (filters?.visibility === "internal") {
        conditions.push(sql`FALSE`);
      }
    }

    if (access.isEditor && filters?.postType && !canManagePostType(access, filters.postType)) {
      conditions.push(sql`FALSE`);
    } else if (access.isEditor && !filters?.postType) {
      // Management reads must always name the post type being managed; do not
      // turn an editor context into a cross-type content search.
      conditions.push(sql`FALSE`);
    }

    if (filters?.authorId) {
      conditions.push(eq(posts.authorId, filters.authorId));
    }

    if (filters?.isFeatured !== undefined) {
      conditions.push(eq(posts.isFeatured, filters.isFeatured));
    }

    if (filters?.publishedAfter) {
      conditions.push(gte(posts.publishedAt, filters.publishedAfter));
    }

    if (filters?.publishedBefore) {
      conditions.push(lte(posts.publishedAt, filters.publishedBefore));
    }

    // Tags filtering using JSONB ? operator (checks if any filter tag exists in post tags)
    if (filters?.tags && filters.tags.length > 0) {
      const tagConditions = filters.tags.map(tag => 
        sql`${posts.tags}::jsonb ? ${tag}`
      );
      if (tagConditions.length > 0) {
        conditions.push(or(...tagConditions)!);
      }
    }

    // Search filtering (slug + translations)
    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push(sql`(EXISTS (
        SELECT 1 FROM ${postTranslations}
        WHERE ${postTranslations.postId} = ${posts.id}
          AND (
            ${postTranslations.title} ILIKE ${searchTerm}
            OR ${postTranslations.content} ILIKE ${searchTerm}
            OR ${postTranslations.excerpt} ILIKE ${searchTerm}
          )
      ) OR ${posts.slug} ILIKE ${searchTerm})`);
    }

    // Upcoming events filtering (SQL-level for correct pagination)
    // Check event.date key with valueText containing date string
    if (upcomingEventDate) {
      conditions.push(sql`${upcomingEventDate} >= CURRENT_TIMESTAMP`);
    }

    if (conditions.length > 0) {
      const whereCondition = and(...conditions);
      if (whereCondition) {
        // @ts-expect-error - Drizzle ORM type inference issue, works at runtime
        query = query.where(whereCondition);
        // @ts-expect-error - Drizzle ORM type inference issue, works at runtime
        countQuery = countQuery.where(whereCondition);
      }
    }

    const postsQuery = query
      .orderBy(
        ...(upcomingEventDate
          ? [asc(upcomingEventDate), asc(posts.id)]
          : [desc(posts.publishedAt), desc(posts.id)]),
      )
      .limit(boundedPageSize(filters?.limit, MAX_POST_PAGE_SIZE))
      .offset(boundedOffset(filters?.offset));
    const [[totalResult], postsResult] = await Promise.all([countQuery, postsQuery]);

    // Early return if no posts
    if (postsResult.length === 0) {
      return { posts: [], total: totalResult?.count || 0 };
    }

    // Batch fetch translations and meta for all posts
    const postIds = postsResult.map(p => p.id);
    
    // Public list views only need the selected locale and card metadata.
    const translationConditions = [inArray(postTranslations.postId, postIds)];
    if (filters?.locale) {
      const locales = Array.from(new Set([
        filters.locale,
        ...postsResult.map(post => post.primaryLocale),
      ]));
      translationConditions.push(inArray(postTranslations.locale, locales as any));
    }
    const allTranslations = filters?.compact
      ? await db
          .select({
            id: postTranslations.id,
            postId: postTranslations.postId,
            locale: postTranslations.locale,
            title: postTranslations.title,
            subtitle: postTranslations.subtitle,
            excerpt: postTranslations.excerpt,
            content: sql<string | null>`NULL`,
            seoTitle: postTranslations.seoTitle,
            seoDescription: postTranslations.seoDescription,
            seoKeywords: postTranslations.seoKeywords,
            createdAt: postTranslations.createdAt,
            updatedAt: postTranslations.updatedAt,
          })
          .from(postTranslations)
          .where(and(...translationConditions))
      : await db
          .select()
          .from(postTranslations)
          .where(and(...translationConditions));
    
    // Public cards only need the metadata used to render the list.
    const compactMetaKeys = filters?.postType === 'news'
      ? ['news.category', 'news.images', 'news.videos']
      : filters?.postType === 'event'
        ? ['event.eventDate', 'event.endDate', 'event.location', 'event.category', 'event.eventType', 'event.capacity', 'event.fee', 'event.registrationDeadline', 'event.speakers', 'event.program', 'event.images']
        : filters?.postType === 'resource'
          ? ['resource.fileUrl', 'resource.fileName', 'resource.fileType', 'resource.fileSize', 'resource.category', 'resource.accessLevel']
          : undefined;
    const metaConditions = [inArray(postMeta.postId, postIds)];
    const managementRead = access.isAdmin ||
      (filters?.postType ? canManagePostType(access, filters.postType) : false);
    const requestedMetaKeys = filters?.compact && compactMetaKeys
      ? managementRead
        ? compactMetaKeys
        : compactMetaKeys.filter((key) => {
            const postType = filters.postType!;
            return isMetaKeyForPostType(postType, key) &&
              canExposeMetaKey(postType, key, false);
          })
      : undefined;
    if (requestedMetaKeys) {
      metaConditions.push(inArray(postMeta.key, requestedMetaKeys));
    }
    const allMeta = await db
      .select()
      .from(postMeta)
      .where(and(...metaConditions));
    
    // Group translations and meta by postId
    const translationsByPost = new Map<string, typeof allTranslations>();
    const metaByPost = new Map<string, typeof allMeta>();
    
    allTranslations.forEach(t => {
      const existing = translationsByPost.get(t.postId) || [];
      translationsByPost.set(t.postId, [...existing, t]);
    });
    
    allMeta
      .filter((meta) => {
        const post = postsResult.find(({ id }) => id === meta.postId);
        if (!post) return false;
        const postManagementRead = access.isAdmin || canManagePostType(access, post.postType);
        return canExposeMetaKey(post.postType, meta.key, postManagementRead) &&
          (postManagementRead || isValidStoredPostMeta(post.postType, meta));
      })
      .forEach(m => {
      const existing = metaByPost.get(m.postId) || [];
      metaByPost.set(m.postId, [...existing, m]);
      });
    
    // Combine posts with their translations and meta
    const hydratedPosts: PostWithTranslations[] = postsResult.map(post => {
      const translations = translationsByPost.get(post.id) || [];
      const selectedTranslation = filters?.compact && filters.locale
        ? translations.find(translation => translation.locale === filters.locale)
          || translations.find(translation => translation.locale === post.primaryLocale)
        : undefined;

      return {
        ...post,
        // Compact public lists expose only the requested translation, or the
        // post's primary locale when the requested translation is unavailable.
        translations: selectedTranslation ? [selectedTranslation] : translations,
        meta: metaByPost.get(post.id) || [],
      };
    });

    // Application-layer sorting for upcoming events (by event date ASC).
    // Support the legacy event.date key while preferring event.eventDate.
    if (filters?.upcoming && filters?.postType === 'event') {
      hydratedPosts.sort((a, b) => {
        const aDateMeta = a.meta.find(m => m.key === 'event.eventDate' || m.key === 'event.date');
        const bDateMeta = b.meta.find(m => m.key === 'event.eventDate' || m.key === 'event.date');
        const aDate = aDateMeta?.valueText || aDateMeta?.valueTimestamp;
        const bDate = bDateMeta?.valueText || bDateMeta?.valueTimestamp;
        if (!aDate) return 1;  // nulls last
        if (!bDate) return -1; // nulls last
        return new Date(aDate).getTime() - new Date(bDate).getTime() ||
          a.id.localeCompare(b.id); // ASC, deterministic tie-breaker
      });
    }

    return {
      posts: hydratedPosts,
      total: totalResult?.count || 0,
    };
  }

  async getResourceCategoryCounts(
    access: PostAccessContext = publicPostAccess,
  ): Promise<Record<string, number>> {
    const firstPage = await this.getPosts({
      postType: "resource",
      status: "published",
      compact: true,
      limit: MAX_POST_PAGE_SIZE,
      offset: 0,
      access,
    });

    const pageCount = Math.ceil(firstPage.total / MAX_POST_PAGE_SIZE);
    const remainingPages = await Promise.all(
      Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) =>
        this.getPosts({
          postType: "resource",
          status: "published",
          compact: true,
          limit: MAX_POST_PAGE_SIZE,
          offset: (index + 1) * MAX_POST_PAGE_SIZE,
          access,
        }),
      ),
    );

    const counts: Record<string, number> = {};
    for (const resource of [
      ...firstPage.posts,
      ...remainingPages.flatMap((page) => page.posts),
    ]) {
      const categoryMeta = resource.meta.find(
        (meta) => meta.key === "resource.category",
      );
      const category = categoryMeta?.valueText ||
        (Array.isArray(resource.tags) ? resource.tags[0] : undefined) ||
        "uncategorized";
      counts[category] = (counts[category] || 0) + 1;
    }

    return counts;
  }

  async createPost(post: InsertPost): Promise<Post> {
    const postData = {
      ...post,
      slug: post.slug || `${post.postType}-${Date.now().toString(36)}`,
    };
    validatePostWrite(postData);
    const [newPost] = await db
      .insert(posts)
      .values(postData)
      .returning();
    return newPost;
  }

  async updatePost(
    id: string,
    updates: Partial<Omit<Post, "authorId">> & { authorId?: never },
  ): Promise<Post | undefined> {
    if ("authorId" in updates) {
      throw new PostMetaValidationError("Post authorship is server-managed");
    }
    return db.transaction(async (tx) => {
      const [currentPost] = await tx
        .select()
        .from(posts)
        .where(eq(posts.id, id))
        .for("update");
      if (!currentPost) return undefined;

      const updateData = preparePostUpdate(currentPost, updates);
      validatePostWrite({ ...currentPost, ...updateData });
      const [post] = await tx
        .update(posts)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(posts.id, id))
        .returning();
      return post || undefined;
    });
  }

  async updatePostComplete(
    id: string,
    updates: Partial<Omit<Post, "authorId">> & { authorId?: never },
    translation: InsertPostTranslation,
    metadata: Array<{ key: string; value?: any }>,
  ): Promise<Post | undefined> {
    if ("authorId" in updates) {
      throw new PostMetaValidationError("Post authorship is server-managed");
    }
    return db.transaction(async (tx) => {
      const [currentPost] = await tx
        .select()
        .from(posts)
        .where(eq(posts.id, id))
        .for("update");
      if (!currentPost) return undefined;

      for (const { key, value } of metadata) {
        validatePostMetaValue(currentPost.postType, key, value);
      }
      const updateData = preparePostUpdate(currentPost, updates);
      validatePostWrite({ ...currentPost, ...updateData });
      const [updatedPost] = await tx
        .update(posts)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(posts.id, id))
        .returning();

      if (!updatedPost) return undefined;

      const [existingTranslation] = await tx
        .select()
        .from(postTranslations)
        .where(and(
          eq(postTranslations.postId, id),
          eq(postTranslations.locale, translation.locale as any),
        ))
        .limit(1);

      if (existingTranslation) {
        await tx
          .update(postTranslations)
          .set({ ...translation, updatedAt: new Date() })
          .where(eq(postTranslations.id, existingTranslation.id));
      } else {
        await tx
          .insert(postTranslations)
          .values(translation);
      }

      // An edit sends the complete intended metadata set. Replacing the
      // existing rows makes omitted keys explicit deletions and lets the
      // database transaction roll back the post and translation if any
      // metadata row cannot be persisted.
      const uniqueMetadata = new Map(metadata.map((item) => [item.key, item]));
      await tx.delete(postMeta).where(eq(postMeta.postId, id));
      if (uniqueMetadata.size > 0) {
        await tx.insert(postMeta).values(
          Array.from(uniqueMetadata.values()).map(({ key, value }) => ({
            postId: id,
            key,
            ...getPostMetaValueColumns(value),
          })) as any,
        );
      }

      return updatedPost;
    });
  }

  async deletePost(id: string): Promise<void> {
    await db.delete(posts).where(eq(posts.id, id));
  }

  // Post Translations
  async getPostTranslation(postId: string, locale: string): Promise<PostTranslation | undefined> {
    const [translation] = await db
      .select()
      .from(postTranslations)
      .where(and(
        eq(postTranslations.postId, postId),
        eq(postTranslations.locale, locale as any)
      ));
    return translation || undefined;
  }

  async getPostTranslations(postId: string): Promise<PostTranslation[]> {
    return db.select().from(postTranslations).where(eq(postTranslations.postId, postId));
  }

  async createPostTranslation(translation: InsertPostTranslation): Promise<PostTranslation> {
    const [newTranslation] = await db
      .insert(postTranslations)
      .values(translation)
      .returning();
    return newTranslation;
  }

  async updatePostTranslation(id: string, updates: Partial<PostTranslation>): Promise<PostTranslation | undefined> {
    const [translation] = await db
      .update(postTranslations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(postTranslations.id, id))
      .returning();
    return translation || undefined;
  }

  async upsertPostTranslation(translation: InsertPostTranslation): Promise<PostTranslation> {
    const existing = await this.getPostTranslation(translation.postId, translation.locale as string);
    
    if (existing) {
      return (await this.updatePostTranslation(existing.id, translation))!;
    }
    
    return this.createPostTranslation(translation);
  }

  // Post Meta
  async getPostMeta(
    postId: string,
    key: string,
    access: PostAccessContext = publicPostAccess,
  ): Promise<PostMeta | undefined> {
    const post = await this.getPost(postId);
    if (!post) return undefined;
    const managementRead = access.isAdmin || canManagePostType(access, post.postType);
    if (!isMetaKeyForPostType(post.postType, key) && !managementRead) {
      throw new PostMetaValidationError(`Metadata key is not valid for ${post.postType}: ${key}`);
    }
    if (!canExposeMetaKey(post.postType, key, managementRead)) {
      return undefined;
    }
    const [meta] = await db
      .select()
      .from(postMeta)
      .where(and(
        eq(postMeta.postId, postId),
        eq(postMeta.key, key)
      ));
    if (!meta) return undefined;
    if (managementRead || isValidStoredPostMeta(post.postType, meta)) return meta;
    return undefined;
  }

  async getPostMetaAll(
    postId: string,
    access: PostAccessContext = publicPostAccess,
  ): Promise<PostMeta[]> {
    const post = await this.getPost(postId);
    if (!post) return [];
    const meta = await db.select().from(postMeta).where(eq(postMeta.postId, postId));
    const managementRead = access.isAdmin || canManagePostType(access, post.postType);
    return meta.filter((item) =>
      canExposeMetaKey(post.postType, item.key, managementRead) &&
      (managementRead || isValidStoredPostMeta(post.postType, item)),
    );
  }

  async setPostMeta(postId: string, key: string, value: any): Promise<PostMeta> {
    const post = await this.getPost(postId);
    if (!post) throw new PostMetaValidationError("Post not found");
    validatePostMetaValue(post.postType, key, value);
    const existing = await db
      .select()
      .from(postMeta)
      .where(and(eq(postMeta.postId, postId), eq(postMeta.key, key)))
      .then(([meta]) => meta);
    
    const metaValue = {
      ...getPostMetaValueColumns(value),
      updatedAt: new Date(),
    };

    if (existing) {
      const [updated] = await db
        .update(postMeta)
        .set(metaValue)
        .where(eq(postMeta.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(postMeta)
      .values({
        postId,
        key,
        ...metaValue,
      } as any)
      .returning();
    return created;
  }

  async markResourceAclSynchronized(postId: string, marker: string): Promise<void> {
    await this.setPostMeta(postId, RESOURCE_ACL_SYNC_META_KEY, marker);
  }

  async deletePostMeta(postId: string, key: string): Promise<void> {
    await db.delete(postMeta).where(and(
      eq(postMeta.postId, postId),
      eq(postMeta.key, key)
    ));
  }

  async incrementPostMetaNumber(postId: string, key: string, amount: number = 1): Promise<number> {
    const post = await this.getPost(postId);
    if (!post) throw new PostMetaValidationError("Post not found");
    if (!Number.isInteger(amount) || !Number.isFinite(amount)) {
      throw new PostMetaValidationError("Increment amount must be an integer");
    }
    validatePostMetaValue(post.postType, key, amount);
    const existing = await db
      .select()
      .from(postMeta)
      .where(and(eq(postMeta.postId, postId), eq(postMeta.key, key)))
      .then(([meta]) => meta);
    
    if (existing && existing.valueNumber !== null) {
      const newValue = existing.valueNumber + amount;
      await db
        .update(postMeta)
        .set({ 
          valueNumber: newValue,
          updatedAt: new Date(),
        })
        .where(eq(postMeta.id, existing.id));
      return newValue;
    } else {
      await this.setPostMeta(postId, key, amount);
      return amount;
    }
  }

  // Organization Members
  async getOrganizationMember(id: string): Promise<OrganizationMember | undefined> {
    const [member] = await db.select().from(organizationMembers).where(eq(organizationMembers.id, id));
    return member || undefined;
  }

  async getOrganizationMembers(filters?: {
    category?: string;
    categories?: readonly string[];
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ members: OrganizationMember[]; total: number }> {
    let query = db.select().from(organizationMembers);
    let countQuery = db.select({ count: count() }).from(organizationMembers);
    const conditions = [];
    const limit = boundedPageSize(filters?.limit, MAX_ADMIN_COLLECTION_PAGE_SIZE);
    const offset = boundedOffset(filters?.offset);

    if (filters?.category) {
      conditions.push(eq(organizationMembers.category, filters.category));
    }
    if (filters?.categories && filters.categories.length > 0) {
      conditions.push(inArray(organizationMembers.category, filters.categories));
    }
    if (filters?.isActive !== undefined) {
      conditions.push(eq(organizationMembers.isActive, filters.isActive));
    }

    if (conditions.length > 0) {
      const whereCondition = and(...conditions);
      if (whereCondition) {
        // @ts-expect-error - Drizzle ORM type inference issue, works at runtime
        query = query.where(whereCondition);
        // @ts-expect-error - Drizzle ORM type inference issue, works at runtime
        countQuery = countQuery.where(whereCondition);
      }
    }

    const [[totalResult], membersResult] = await Promise.all([
      countQuery,
      query
        .orderBy(
          organizationMembers.category,
          organizationMembers.sortOrder,
          organizationMembers.name,
          organizationMembers.id,
        )
        .limit(limit)
        .offset(offset),
    ]);

    return {
      members: membersResult,
      total: totalResult?.count || 0,
    };
  }

  async createOrganizationMember(member: InsertOrganizationMember): Promise<OrganizationMember> {
    const [newMember] = await db
      .insert(organizationMembers)
      .values(member)
      .returning();
    return newMember;
  }

  async updateOrganizationMember(id: string, updates: Partial<OrganizationMember>): Promise<OrganizationMember | undefined> {
    const [member] = await db
      .update(organizationMembers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(organizationMembers.id, id))
      .returning();
    return member || undefined;
  }

  async reorderOrganizationMembers(category: string, memberIds: string[]): Promise<OrganizationMember[]> {
    const uniqueMemberIds = new Set(memberIds);
    if (uniqueMemberIds.size !== memberIds.length) {
      throw new Error("Duplicate organization member ids are not allowed");
    }

    return db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext(${`organization-order:${category}`}))`,
      );
      const existingMembers = await tx
        .select({ id: organizationMembers.id })
        .from(organizationMembers)
        .where(eq(organizationMembers.category, category));

      const existingIds = new Set(existingMembers.map((member) => member.id));
      if (
        existingMembers.length !== memberIds.length
        || memberIds.some((memberId) => !existingIds.has(memberId))
      ) {
        throw new Error("The complete category member list is required to reorder");
      }

      for (let index = 0; index < memberIds.length; index += 1) {
        const memberId = memberIds[index];
        await tx
          .update(organizationMembers)
          .set({ sortOrder: index * 10, updatedAt: new Date() })
          .where(eq(organizationMembers.id, memberId));
      }

      return tx
        .select()
        .from(organizationMembers)
        .where(eq(organizationMembers.category, category))
        .orderBy(
          organizationMembers.sortOrder,
          organizationMembers.name,
          organizationMembers.id,
        );
    });
  }

  async deleteOrganizationMember(id: string): Promise<void> {
    await db.delete(organizationMembers).where(eq(organizationMembers.id, id));
  }
}

export const storage = new DatabaseStorage();

export type AclRoleCode = "admin" | "operator" | "editor" | "member" | "guest";

const ACCOUNT_ROLE_TO_ACL_ROLE: Record<AccountRole, AclRoleCode> = {
  admin: "admin",
  operator: "operator",
  user: "member",
};

export class AuthorizationStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthorizationStateError";
  }
}

const ACL_ROLE_TO_ACCOUNT_ROLE: Record<AclRoleCode, AccountRole> = {
  admin: "admin",
  operator: "operator",
  editor: "user",
  member: "user",
  guest: "user",
};

function validateEventCapacity(meta: PostMeta[], activeRegistrationCount: number): void {
  const capacityValue = getEventMetaValue(meta, ["event.capacity"]);
  const capacity = parseEventCapacity(capacityValue);
  if (capacityValue !== undefined && capacity === undefined) {
    throw new EventRegistrationError(
      "EVENT_CONFIGURATION_INVALID",
      "Event capacity is not configured correctly",
    );
  }
  if (capacity !== undefined && activeRegistrationCount >= capacity) {
    throw new EventRegistrationError("EVENT_CAPACITY_REACHED", "Event is at capacity");
  }
}

function isEventClosed(meta: PostMeta[]): boolean {
  const closedValue = getEventMetaValue(meta, [
    "event.registrationClosed",
    "event.closed",
    "registrationClosed",
    "closed",
  ]);
  if (closedValue === true) return true;
  if (typeof closedValue === "string") {
    return ["true", "1", "yes", "closed"].includes(closedValue.trim().toLowerCase());
  }

  const registrationStatus = getEventMetaValue(meta, [
    "event.registrationStatus",
    "registrationStatus",
  ]);
  return typeof registrationStatus === "string" &&
    registrationStatus.trim().toLowerCase() === "closed";
}

function parseEventDate(value: unknown): Date | undefined {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value;
  }
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function parseEventCapacity(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return undefined;
  return parsed;
}

export class EventRegistrationError extends Error {
  constructor(
    public readonly code: EventRegistrationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "EventRegistrationError";
  }
}

function validateEventRegistrationAvailability(
  event: Post,
  meta: PostMeta[],
  now: Date,
): void {
  if (event.postType !== "event") {
    throw new EventRegistrationError("NOT_AN_EVENT", "Post is not an event");
  }
  if (event.status !== "published") {
    throw new EventRegistrationError("EVENT_NOT_PUBLISHED", "Event is not published");
  }
  if (event.publishedAt && event.publishedAt > now) {
    throw new EventRegistrationError("EVENT_NOT_PUBLISHED", "Event is not published yet");
  }
  if (event.expiresAt && event.expiresAt <= now) {
    throw new EventRegistrationError("EVENT_EXPIRED", "Event has expired");
  }
  if (isEventClosed(meta)) {
    throw new EventRegistrationError("EVENT_CLOSED", "Event registration is closed");
  }

  const eventDate = parseEventDate(getEventMetaValue(meta, ["event.eventDate", "event.date"]));
  if (!eventDate) {
    throw new EventRegistrationError(
      "EVENT_CONFIGURATION_INVALID",
      "Event date is not configured",
    );
  }
  if (eventDate <= now) {
    throw new EventRegistrationError("EVENT_NOT_STARTED", "Event has already started");
  }

  const endDate = parseEventDate(getEventMetaValue(meta, ["event.endDate"]));
  if (endDate && endDate <= now) {
    throw new EventRegistrationError("EVENT_EXPIRED", "Event has ended");
  }

  const registrationDeadline = parseEventDate(
    getEventMetaValue(meta, ["event.registrationDeadline"]),
  );
  if (registrationDeadline && registrationDeadline <= now) {
    throw new EventRegistrationError("EVENT_CLOSED", "Event registration is closed");
  }
}

function isValidStoredPostMeta(postType: string, meta: PostMeta): boolean {
  const value = getStoredPostMetaValue(meta);
  if (value === undefined) return false;
  try {
    validatePostMetaValue(postType, meta.key, value);
    return true;
  } catch {
    return false;
  }
}

function validatePostWrite(
  post: Partial<Pick<Post, "publishedAt" | "scheduledAt" | "expiresAt">> & {
    status?: Post["status"];
  },
): void {
  validatePostSchedule({
    ...post,
    status: post.status || "draft",
    publishedAt: post.publishedAt ?? null,
    scheduledAt: post.scheduledAt ?? null,
    expiresAt: post.expiresAt ?? null,
  });
}
