import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb, uuid, pgEnum, uniqueIndex, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums for unified post system
export const postTypeEnum = pgEnum("post_type", ["news", "event", "resource"]);
export const postStatusEnum = pgEnum("post_status", ["draft", "published", "archived"]);
export const postVisibilityEnum = pgEnum("post_visibility", ["public", "members", "premium", "internal"]);
export const localeEnum = pgEnum("locale", ["ko", "en", "zh"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("member"), // member, admin
  userType: text("user_type").notNull().default("staff"), // staff, company
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const members = pgTable("members", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").unique().references(() => users.id), // one-to-one with users
  companyName: text("company_name").notNull(),
  companyNameEn: text("company_name_en"),
  companyNameZh: text("company_name_zh"),
  industry: text("industry").notNull(),
  country: text("country").notNull(), // Korea, China
  city: text("city").notNull(),
  address: text("address").notNull(),
  phone: text("phone"),
  website: text("website"),
  description: text("description"),
  descriptionEn: text("description_en"),
  descriptionZh: text("description_zh"),
  logo: text("logo"), // URL to logo image
  membershipLevel: text("membership_level").notNull().default("regular"), // regular, premium, sponsor
  membershipStatus: text("membership_status").notNull().default("pending"), // pending, active, inactive
  contactPerson: text("contact_person").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone"),
  isPublic: boolean("is_public").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const eventRegistrations = pgTable("event_registrations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: uuid("event_id").references(() => posts.id, { onDelete: 'cascade' }),
  userId: uuid("user_id").references(() => users.id),
  attendeeName: text("attendee_name").notNull(),
  attendeeEmail: text("attendee_email").notNull(),
  attendeePhone: text("attendee_phone"),
  companyName: text("company_name"),
  status: text("status").notNull().default("registered"), // registered, approved, cancelled, attended
  paymentStatus: text("payment_status").default("free"), // free, paid, pending
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const inquiries = pgTable("inquiries", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  category: text("category").notNull(), // membership, event, partnership, other
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  companyName: text("company_name"),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("new"), // new, in_progress, resolved
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const inquiryReplies = pgTable("inquiry_replies", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  inquiryId: uuid("inquiry_id").notNull().references(() => inquiries.id, { onDelete: 'cascade' }),
  message: text("message").notNull(),
  respondedBy: uuid("responded_by").notNull().references(() => users.id),
  emailSent: boolean("email_sent").notNull().default(false),
  emailSentAt: timestamp("email_sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const partners = pgTable("partners", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  nameEn: text("name_en"),
  nameZh: text("name_zh"),
  logo: text("logo").notNull(),
  website: text("website"),
  description: text("description"),
  descriptionEn: text("description_en"),
  descriptionZh: text("description_zh"),
  category: text("category").notNull(), // sponsor, partner, government
  isActive: boolean("is_active").notNull().default(true),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Unified Posts System (WordPress-like)
export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  postType: postTypeEnum("post_type").notNull(),
  status: postStatusEnum("status").notNull().default("draft"),
  visibility: postVisibilityEnum("visibility").notNull().default("public"),
  slug: text("slug").notNull(),
  primaryLocale: localeEnum("primary_locale").notNull().default("ko"),
  authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
  coverImage: text("cover_image"),
  listImage: text("list_image"),
  isFeatured: boolean("is_featured").notNull().default(false),
  tags: jsonb("tags"),
  publishedAt: timestamp("published_at"),
  scheduledAt: timestamp("scheduled_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  slugUnique: uniqueIndex("posts_slug_unique").on(table.slug),
  typeStatusIdx: index("posts_type_status_idx").on(table.postType, table.status),
  visibilityIdx: index("posts_visibility_idx").on(table.visibility),
  publishIdx: index("posts_publish_idx").on(table.postType, table.publishedAt.desc()),
}));

export const postTranslations = pgTable("post_translations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  locale: localeEnum("locale").notNull(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  excerpt: text("excerpt"),
  content: text("content"),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  seoKeywords: jsonb("seo_keywords"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  postLocaleUnique: uniqueIndex("post_translations_post_locale_unique").on(table.postId, table.locale),
  localeIdx: index("post_translations_locale_idx").on(table.locale),
}));

export const postMeta = pgTable("post_meta", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  key: text("meta_key").notNull(),
  value: jsonb("meta_value"),
  valueText: text("value_text"),
  valueNumber: integer("value_number"),
  valueBoolean: boolean("value_boolean"),
  valueTimestamp: timestamp("value_timestamp"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  postKeyUnique: uniqueIndex("post_meta_post_key_unique").on(table.postId, table.key),
  keyIdx: index("post_meta_key_idx").on(table.key),
  timestampIdx: index("post_meta_timestamp_idx").on(table.key, table.valueTimestamp),
}));

// Membership tier system
export const tiers = pgTable("tiers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(), // MEMBER, PRO, CORP, PARTNER, ADMIN
  name: text("name").notNull(),
  nameEn: text("name_en"),
  nameZh: text("name_zh"),
  annualFee: integer("annual_fee").default(0),
  benefits: jsonb("benefits"), // array of benefit descriptions
  isActive: boolean("is_active").notNull().default(true),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Role system
export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(), // admin, operator, editor, member, guest
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Permission system
export const permissions = pgTable("permissions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(), // event.read, event.create, event.publish, etc.
  resource: text("resource").notNull(), // event, news, resource, member, etc.
  action: text("action").notNull(), // read, create, update, delete, publish, etc.
  description: text("description").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Role-Permission mapping
export const rolePermissions = pgTable("role_permissions", {
  roleId: uuid("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  permissionId: uuid("permission_id").notNull().references(() => permissions.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  pk: { name: "role_permissions_pkey", columns: [table.roleId, table.permissionId] },
}));

// User memberships (connects user to tier and role)
export const userMemberships = pgTable("user_memberships", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tierId: uuid("tier_id").references(() => tiers.id),
  roleId: uuid("role_id").references(() => roles.id),
  isActive: boolean("is_active").notNull().default(true),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  member: one(members, {
    fields: [users.id],
    references: [members.userId],
  }),
  registrations: many(eventRegistrations),
  inquiriesResponded: many(inquiries),
  memberships: many(userMemberships),
  postsCreated: many(posts),
}));

export const tiersRelations = relations(tiers, ({ many }) => ({
  memberships: many(userMemberships),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  memberships: many(userMemberships),
  rolePermissions: many(rolePermissions),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));

export const userMembershipsRelations = relations(userMemberships, ({ one }) => ({
  user: one(users, {
    fields: [userMemberships.userId],
    references: [users.id],
  }),
  tier: one(tiers, {
    fields: [userMemberships.tierId],
    references: [tiers.id],
  }),
  role: one(roles, {
    fields: [userMemberships.roleId],
    references: [roles.id],
  }),
}));

export const membersRelations = relations(members, ({ one }) => ({
  user: one(users, {
    fields: [members.userId],
    references: [users.id],
  }),
}));

export const eventRegistrationsRelations = relations(eventRegistrations, ({ one }) => ({
  event: one(posts, {
    fields: [eventRegistrations.eventId],
    references: [posts.id],
  }),
  user: one(users, {
    fields: [eventRegistrations.userId],
    references: [users.id],
  }),
}));

export const inquiriesRelations = relations(inquiries, ({ many }) => ({
  replies: many(inquiryReplies),
}));

export const inquiryRepliesRelations = relations(inquiryReplies, ({ one }) => ({
  inquiry: one(inquiries, {
    fields: [inquiryReplies.inquiryId],
    references: [inquiries.id],
  }),
  responder: one(users, {
    fields: [inquiryReplies.respondedBy],
    references: [users.id],
  }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
  translations: many(postTranslations),
  meta: many(postMeta),
  registrations: many(eventRegistrations),
}));

export const postTranslationsRelations = relations(postTranslations, ({ one }) => ({
  post: one(posts, {
    fields: [postTranslations.postId],
    references: [posts.id],
  }),
}));

export const postMetaRelations = relations(postMeta, ({ one }) => ({
  post: one(posts, {
    fields: [postMeta.postId],
    references: [posts.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  name: true,
});

export const insertMemberSchema = createInsertSchema(members).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEventRegistrationSchema = createInsertSchema(eventRegistrations).omit({
  id: true,
  createdAt: true,
});

export const insertInquirySchema = createInsertSchema(inquiries).omit({
  id: true,
  createdAt: true,
});

export const insertInquiryReplySchema = createInsertSchema(inquiryReplies).omit({
  id: true,
  createdAt: true,
  emailSent: true,
  emailSentAt: true,
});

export const insertPartnerSchema = createInsertSchema(partners).omit({
  id: true,
  createdAt: true,
});

export const insertTierSchema = createInsertSchema(tiers).omit({
  id: true,
  createdAt: true,
});

export const insertRoleSchema = createInsertSchema(roles).omit({
  id: true,
  createdAt: true,
});

export const insertPermissionSchema = createInsertSchema(permissions).omit({
  id: true,
  createdAt: true,
});

export const insertRolePermissionSchema = createInsertSchema(rolePermissions).omit({
  createdAt: true,
});

export const insertUserMembershipSchema = createInsertSchema(userMemberships).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Unified Posts System Insert Schemas
export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // Allow date fields to accept ISO strings from JSON and coerce to Date
  publishedAt: z.coerce.date().nullable().optional(),
  scheduledAt: z.coerce.date().nullable().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
});

export const insertPostTranslationSchema = createInsertSchema(postTranslations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPostMetaSchema = createInsertSchema(postMeta).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // Allow timestamp fields to accept ISO strings from JSON and coerce to Date
  valueTimestamp: z.coerce.date().nullable().optional(),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Member = typeof members.$inferSelect;
export type InsertMember = z.infer<typeof insertMemberSchema>;

export type EventRegistration = typeof eventRegistrations.$inferSelect;
export type InsertEventRegistration = z.infer<typeof insertEventRegistrationSchema>;

export type Inquiry = typeof inquiries.$inferSelect;
export type InsertInquiry = z.infer<typeof insertInquirySchema>;

export type InquiryReply = typeof inquiryReplies.$inferSelect;
export type InsertInquiryReply = z.infer<typeof insertInquiryReplySchema>;

export type Partner = typeof partners.$inferSelect;
export type InsertPartner = z.infer<typeof insertPartnerSchema>;

export type Tier = typeof tiers.$inferSelect;
export type InsertTier = z.infer<typeof insertTierSchema>;

export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;

export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = z.infer<typeof insertPermissionSchema>;

export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;

export type UserMembership = typeof userMemberships.$inferSelect;
export type InsertUserMembership = z.infer<typeof insertUserMembershipSchema>;

// Unified Posts System Types
export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;

export type PostTranslation = typeof postTranslations.$inferSelect;
export type InsertPostTranslation = z.infer<typeof insertPostTranslationSchema>;

export type PostMeta = typeof postMeta.$inferSelect;
export type InsertPostMeta = z.infer<typeof insertPostMetaSchema>;

// Combined types for joined queries
export type UserRegistrationWithEvent = EventRegistration & {
  event: PostWithTranslations | null;
};

export type InquiryWithReplies = Inquiry & {
  replies: (InquiryReply & { responder: User | null })[];
};

// Post with translations and meta
export type PostWithTranslations = Post & {
  translations: PostTranslation[];
  meta: PostMeta[];
};
