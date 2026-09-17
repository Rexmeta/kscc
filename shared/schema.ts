import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb, uuid, pgEnum, uniqueIndex, index, check } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { organizationCategorySchema } from "./organization";

// Enums for unified post system
export const postTypeEnum = pgEnum("post_type", ["news", "event", "resource", "page"]);
export const postStatusEnum = pgEnum("post_status", ["draft", "published", "archived"]);
export const postVisibilityEnum = pgEnum("post_visibility", ["public", "members", "premium", "internal"]);
export const localeEnum = pgEnum("locale", ["ko", "en", "zh"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  // Social-only accounts may add these credentials later from their profile.
  // Email/password registration still validates both fields at the API boundary.
  email: text("email").unique(),
  password: text("password"),
  name: text("name").notNull(),
  role: text("role").notNull().default("user"), // admin, operator, user
  userType: text("user_type").notNull().default("user"), // admin, operator, company, user
  membershipTier: text("membership_tier").notNull().default("free"), // free, bronze, silver, gold, platinum
  weixin: text("weixin"), // WeChat ID
  isActive: boolean("is_active").notNull().default(true),
  // Incremented to revoke all previously issued JWTs for this account.
  sessionVersion: integer("session_version").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const wechatIdentities = pgTable("wechat_identities", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").notNull().default("wechat"),
  appId: text("app_id").notNull(),
  openId: text("open_id").notNull(),
  unionId: text("union_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userProviderUnique: uniqueIndex("wechat_identities_user_provider_unique")
    .on(table.userId, table.provider),
  appOpenIdUnique: uniqueIndex("wechat_identities_app_open_id_unique")
    .on(table.provider, table.appId, table.openId),
  unionIdUnique: uniqueIndex("wechat_identities_union_id_unique")
    .on(table.provider, table.unionId),
}));

export const authHandoffs = pgTable("auth_handoffs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  codeHash: text("code_hash").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  consumedAt: timestamp("consumed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  activeExpiryIdx: index("auth_handoffs_expires_at_idx").on(table.expiresAt),
}));

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
}, (table) => ({
  publicCreatedIdx: index("members_public_created_idx").on(table.isPublic, table.createdAt.desc()),
}));

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
}, (table) => ({
  eventUserUnique: uniqueIndex("event_registrations_event_user_unique").on(table.eventId, table.userId),
}));

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
}, (table) => ({
  statusCreatedIdx: index("inquiries_status_created_idx").on(table.status, table.createdAt.desc()),
  categoryCreatedIdx: index("inquiries_category_created_idx").on(table.category, table.createdAt.desc()),
}));

export const consentEvidence = pgTable("consent_evidence", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  inquiryId: uuid("inquiry_id").references(() => inquiries.id, { onDelete: "cascade" }),
  purpose: text("purpose").notNull(),
  policyVersion: text("policy_version").notNull(),
  consentedAt: timestamp("consented_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  oneSubject: check(
    "consent_evidence_one_subject_check",
    sql`(("user_id" IS NOT NULL)::integer + ("inquiry_id" IS NOT NULL)::integer) = 1`,
  ),
  purposeSubject: check(
    "consent_evidence_purpose_subject_check",
    sql`(
      ("purpose" IN ('account_terms', 'account_privacy') AND "user_id" IS NOT NULL AND "inquiry_id" IS NULL)
      OR ("purpose" = 'inquiry_privacy' AND "user_id" IS NULL AND "inquiry_id" IS NOT NULL)
    )`,
  ),
  userPurposeUnique: uniqueIndex("consent_evidence_user_purpose_version_unique")
    .on(table.userId, table.purpose, table.policyVersion),
  inquiryPurposeUnique: uniqueIndex("consent_evidence_inquiry_purpose_version_unique")
    .on(table.inquiryId, table.purpose, table.policyVersion),
  subjectDateIdx: index("consent_evidence_subject_date_idx")
    .on(table.userId, table.inquiryId, table.consentedAt),
}));

export const consentEvidenceAccessLog = pgTable("consent_evidence_access_log", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  adminUserId: uuid("admin_user_id").references(() => users.id, { onDelete: "set null" }),
  subjectType: text("subject_type").notNull(),
  subjectId: uuid("subject_id").notNull(),
  action: text("action").notNull(),
  accessedAt: timestamp("accessed_at", { withTimezone: true }).notNull().defaultNow(),
  retentionHoldUntil: timestamp("retention_hold_until", { withTimezone: true }),
}, (table) => ({
  subjectAccessIdx: index("consent_evidence_access_log_subject_access_idx")
    .on(table.subjectType, table.subjectId, table.accessedAt.desc()),
  actionAccessIdx: index("consent_evidence_access_log_action_access_idx")
    .on(table.action, table.accessedAt.desc()),
  retentionCleanupIdx: index("consent_evidence_access_log_retention_cleanup_idx")
    .on(table.accessedAt, table.retentionHoldUntil),
  subjectTypeCheck: check(
    "consent_evidence_access_log_subject_type_check",
    sql`"subject_type" IN ('account', 'inquiry')`,
  ),
  actionCheck: check(
    "consent_evidence_access_log_action_check",
    sql`"action" IN ('view', 'export')`,
  ),
}));
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

export const surveySettings = pgTable("survey_settings", {
  id: text("id").primaryKey().default("default"),
  title: text("title").notNull().default(""),
  description: text("description").notNull().default(""),
  externalUrl: text("external_url"),
  displayOrder: integer("display_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(false),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const surveySettingsHistory = pgTable("survey_settings_history", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  surveySettingsId: text("survey_settings_id").notNull().references(() => surveySettings.id, { onDelete: "restrict" }),
  version: integer("version").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  externalUrl: text("external_url"),
  displayOrder: integer("display_order").notNull().default(0),
  isActive: boolean("is_active").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  changedBy: uuid("changed_by").references(() => users.id, { onDelete: "set null" }),
  changedByName: text("changed_by_name").notNull(),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  settingsVersionUnique: uniqueIndex("survey_settings_history_settings_version_unique")
    .on(table.surveySettingsId, table.version),
  changedAtIdx: index("survey_settings_history_changed_at_idx")
    .on(table.surveySettingsId, table.changedAt.desc(), table.version.desc(), table.id.desc()),
}));

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

export const postTranslationHistory = pgTable("post_translation_history", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  locale: localeEnum("locale").notNull(),
  changedBy: uuid("changed_by").references(() => users.id, { onDelete: "set null" }),
  changedByName: text("changed_by_name").notNull(),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  postLocaleChangedAtIdx: index("post_translation_history_post_locale_changed_at_idx")
    .on(table.postId, table.locale, table.changedAt.desc(), table.id.desc()),
  changedAtIdx: index("post_translation_history_changed_at_idx")
    .on(table.changedAt.desc(), table.id.desc()),
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
  consentEvidence: many(consentEvidence),
  wechatIdentities: many(wechatIdentities),
  authHandoffs: many(authHandoffs),
}));

export const wechatIdentitiesRelations = relations(wechatIdentities, ({ one }) => ({
  user: one(users, {
    fields: [wechatIdentities.userId],
    references: [users.id],
  }),
}));

export const authHandoffsRelations = relations(authHandoffs, ({ one }) => ({
  user: one(users, {
    fields: [authHandoffs.userId],
    references: [users.id],
  }),
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
  consentEvidence: many(consentEvidence),
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

export const consentEvidenceRelations = relations(consentEvidence, ({ one }) => ({
  user: one(users, {
    fields: [consentEvidence.userId],
    references: [users.id],
  }),
  inquiry: one(inquiries, {
    fields: [consentEvidence.inquiryId],
    references: [inquiries.id],
  }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
  translations: many(postTranslations),
  translationHistory: many(postTranslationHistory),
  meta: many(postMeta),
  registrations: many(eventRegistrations),
}));

export const postTranslationsRelations = relations(postTranslations, ({ one }) => ({
  post: one(posts, {
    fields: [postTranslations.postId],
    references: [posts.id],
  }),
}));

export const postTranslationHistoryRelations = relations(postTranslationHistory, ({ one }) => ({
  post: one(posts, {
    fields: [postTranslationHistory.postId],
    references: [posts.id],
  }),
  actor: one(users, {
    fields: [postTranslationHistory.changedBy],
    references: [users.id],
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
  weixin: true,
});

export const insertMemberSchema = createInsertSchema(members).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

const normalizeHttpUrlInput = (value: unknown) => {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  // Keep explicit schemes intact so the validator can reject unsafe ones.
  // A bare host/path, including a host with a port, is treated as HTTPS.
  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }
  const looksLikeHostWithPort = /^[^/\s:]+:\d+(?:[/?#]|$)/.test(trimmed);
  if (/^[a-z][a-z\d+.-]*:/i.test(trimmed) && !looksLikeHostWithPort) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

export const httpUrlSchema = z.preprocess(
  normalizeHttpUrlInput,
  z.string()
    .trim()
    .url("유효한 URL을 입력해주세요.")
    .refine((value) => {
      try {
        const protocol = new URL(value).protocol;
        return protocol === "http:" || protocol === "https:";
      } catch {
        return false;
      }
    }, "URL은 HTTP 또는 HTTPS 주소여야 합니다."),
);

export const optionalHttpUrlSchema = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? null : value,
  httpUrlSchema.nullable().optional(),
);

export const memberProfileSchema = z.object({
  companyName: z.string(),
  companyNameEn: z.string().optional().nullable(),
  companyNameZh: z.string().optional().nullable(),
  industry: z.string(),
  country: z.string(),
  city: z.string(),
  address: z.string(),
  phone: z.string().optional().nullable(),
  website: optionalHttpUrlSchema,
  description: z.string().optional().nullable(),
  descriptionEn: z.string().optional().nullable(),
  descriptionZh: z.string().optional().nullable(),
  logo: optionalHttpUrlSchema,
  contactPerson: z.string(),
  contactEmail: z.string().email(),
  contactPhone: z.string().optional().nullable(),
}).strict();
export const insertEventRegistrationSchema = createInsertSchema(eventRegistrations).omit({
  id: true,
  createdAt: true,
});

export const inquiryCategorySchema = z.enum(["membership", "event", "partnership", "other"]);
export const inquiryStatusSchema = z.enum(["new", "pending", "in_progress", "resolved", "closed"]);

const optionalTrimmedInquiryText = (max: number) => z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().max(max).optional(),
);

export const insertInquirySchema = createInsertSchema(inquiries).omit({
  id: true,
  createdAt: true,
}).extend({
  category: inquiryCategorySchema,
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email address").max(254),
  phone: optionalTrimmedInquiryText(50),
  companyName: optionalTrimmedInquiryText(200),
  subject: z.string().trim().min(1, "Subject is required").max(200),
  message: z.string().trim().min(1, "Message is required").max(10_000),
}).strict();

export const insertInquiryReplySchema = createInsertSchema(inquiryReplies).omit({
  id: true,
  createdAt: true,
  emailSent: true,
  emailSentAt: true,
}).extend({
  inquiryId: z.string().uuid(),
  message: z.string().trim().min(1, "Reply message is required").max(10_000),
  respondedBy: z.string().uuid(),
}).strict();

const partnerText = (max: number) => z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? null : value,
  z.string().trim().max(max).nullable().optional(),
);

export const partnerUrlSchema = z.string()
  .trim()
  .transform((value) => normalizeHttpUrlInput(value) as string)
  .pipe(httpUrlSchema);

export const partnerCategorySchema = z.enum(["sponsor", "partner", "government"]);

export const insertPartnerSchema = z.object({
  name: z.string().trim().min(1, "파트너 이름은 필수입니다.").max(200),
  nameEn: partnerText(200),
  nameZh: partnerText(200),
  logo: partnerUrlSchema,
  website: z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? null : value,
    partnerUrlSchema.nullable().optional(),
  ),
  description: partnerText(2_000),
  descriptionEn: partnerText(2_000),
  descriptionZh: partnerText(2_000),
  category: partnerCategorySchema,
  isActive: z.boolean().default(true),
  order: z.number().int().min(0).max(10_000).default(0),
}).strict();

export const updatePartnerSchema = insertPartnerSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one partner field is required" },
);

export { surveySettingsSchema } from "./survey";

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
  // Make slug optional - backend will auto-generate if not provided
  slug: z.string().optional(),
  // Allow date fields to accept ISO strings from JSON and coerce to Date
  publishedAt: z.coerce.date().nullable().optional(),
  scheduledAt: z.coerce.date().nullable().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
});

// Authorship is assigned by the authenticated server actor.  This schema is
// intended for storage/internal callers; HTTP post shapes omit authorId and
// reject it explicitly.

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

export type WechatIdentity = typeof wechatIdentities.$inferSelect;

export type UserProfileDto = Pick<
  User,
  "id" | "email" | "name" | "role" | "userType" | "weixin" | "createdAt"
>;
export type ConsentEvidence = typeof consentEvidence.$inferSelect;
export type ConsentEvidenceAccessLogEntry = Pick<
  typeof consentEvidenceAccessLog.$inferSelect,
  "id" | "adminUserId" | "subjectType" | "subjectId" | "action" | "accessedAt" |
    "retentionHoldUntil"
>;

export type Member = typeof members.$inferSelect;
export type InsertMember = z.infer<typeof insertMemberSchema>;

export type PublicMemberDto = Pick<
  Member,
  | "id"
  | "companyName"
  | "companyNameEn"
  | "companyNameZh"
  | "industry"
  | "country"
  | "city"
  | "website"
  | "description"
  | "descriptionEn"
  | "descriptionZh"
  | "logo"
  | "membershipLevel"
  | "isPublic"
  | "createdAt"
>;
export type MemberProfile = z.infer<typeof memberProfileSchema>;
export type EventRegistration = typeof eventRegistrations.$inferSelect;
export type InsertEventRegistration = z.infer<typeof insertEventRegistrationSchema>;

export type Inquiry = typeof inquiries.$inferSelect;
export type InsertInquiry = z.infer<typeof insertInquirySchema>;

export type InquiryReply = typeof inquiryReplies.$inferSelect;
export type InsertInquiryReply = z.infer<typeof insertInquiryReplySchema>;
export type SafeUser = Pick<User, "id" | "name">;

export type Partner = typeof partners.$inferSelect;
export type InsertPartner = z.infer<typeof insertPartnerSchema>;

export type SurveySettings = typeof surveySettings.$inferSelect;
export type SurveySettingsHistory = typeof surveySettingsHistory.$inferSelect;
export type { SurveySettingsInput } from "./survey";

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

export type PostTranslationHistory = typeof postTranslationHistory.$inferSelect;

export type PostMeta = typeof postMeta.$inferSelect;
export type InsertPostMeta = z.infer<typeof insertPostMetaSchema>;

export type OwnEventRegistrationDto = Pick<
  EventRegistration,
  "id" | "eventId" | "status" | "createdAt"
> & {
  event: {
    id: Post["id"];
    slug: Post["slug"];
    translations: Array<Pick<PostTranslation, "locale" | "title">>;
    eventDate: Date | string | null;
    location: string | null;
  } | null;
};
export type UserRegistrationWithEvent = EventRegistration & {
  event: PostWithTranslations | null;
};

export type InquiryWithReplies = Inquiry & {
  replies: (InquiryReply & { responder: SafeUser | null })[];
};

// Post with translations and meta
export type PostWithTranslations = Post & {
  translations: PostTranslation[];
  meta: PostMeta[];
};

// Organization Structure - for managing chamber executives and members
export const organizationMembers = pgTable("organization_members", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // Korean name
  nameEn: text("name_en"), // English name
  nameZh: text("name_zh"), // Chinese name
  position: text("position").notNull(), // 회장, 부회장, 이사 등
  positionEn: text("position_en"),
  positionZh: text("position_zh"),
  category: text("category").notNull(), // executives, honorary, vicepresidents, secretary_office, directors, advisors, secretariat, committees, organizations
  photo: text("photo"), // photo URL
  description: text("description"), // additional info like committee role
  descriptionEn: text("description_en"),
  descriptionZh: text("description_zh"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertOrganizationMemberSchema = createInsertSchema(organizationMembers)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    category: organizationCategorySchema,
  });

export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type InsertOrganizationMember = z.infer<typeof insertOrganizationMemberSchema>;

export type PublicOrganizationMemberDto = Pick<
  OrganizationMember,
  | "id"
  | "name"
  | "nameEn"
  | "nameZh"
  | "position"
  | "positionEn"
  | "positionZh"
  | "category"
  | "photo"
  | "description"
  | "descriptionEn"
  | "descriptionZh"
  | "sortOrder"
>;
export const memberAdminSchema = memberProfileSchema.extend({
  membershipLevel: z.enum(["regular", "premium", "sponsor"]),
  membershipStatus: z.enum(["pending", "active", "inactive"]),
  isPublic: z.boolean(),
}).strict();

export type MemberAdminUpdate = z.infer<typeof memberAdminSchema>;

export type AdminUserDto = Pick<
  User,
  "id" | "email" | "name" | "role" | "userType" | "membershipTier" | "isActive"
>;

export type AdminEventRegistrationDto = Pick<
  EventRegistration,
  | "id"
  | "attendeeName"
  | "attendeeEmail"
  | "attendeePhone"
  | "companyName"
  | "status"
  | "createdAt"
>;

export type OwnMemberDto = Pick<
  Member,
  "id" | "companyName" | "industry" | "membershipLevel" | "membershipStatus"
>;

export type AdminMemberDto = Pick<
  Member,
  | "id"
  | "companyName"
  | "companyNameEn"
  | "companyNameZh"
  | "industry"
  | "country"
  | "city"
  | "address"
  | "phone"
  | "website"
  | "description"
  | "descriptionEn"
  | "descriptionZh"
  | "logo"
  | "membershipLevel"
  | "membershipStatus"
  | "contactPerson"
  | "contactEmail"
  | "contactPhone"
  | "isPublic"
>;

export type AdminOrganizationMemberDto = PublicOrganizationMemberDto & Pick<
  OrganizationMember,
  "isActive"
>;

export type AdminMembershipDto = {
  tierCode: string;
  tierName: string;
  isActive: boolean;
};

// Member service domain. These tables intentionally do not reuse or mutate
// the legacy members table; the public directory owns its own reviewed data.
export const memberServiceOrganizations = pgTable("member_service_organizations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceSystem: text("source_system").notNull(),
  sourceRecordKey: text("source_record_key").notNull(),
  organizationType: text("organization_type").notNull(),
  legalForm: text("legal_form"),
  supervisingAuthority: text("supervising_authority"),
  scope: text("scope"),
  baseCountry: text("base_country").notNull(),
  baseRegion: text("base_region"),
  chinaRegionFocus: text("china_region_focus"),
  primaryDomain: text("primary_domain"),
  summaryKo: text("summary_ko"),
  websiteUrl: text("website_url"),
  contactUrl: text("contact_url"),
  verificationStatus: text("verification_status").notNull(),
  sourceType: text("source_type"),
  sourceUrl: text("source_url"),
  lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
  nextReviewAt: timestamp("next_review_at", { withTimezone: true }),
  reviewNote: text("review_note"),
  isActive: boolean("is_active").notNull().default(false),
  publicApproved: boolean("public_approved").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  sourceUnique: uniqueIndex("member_service_organizations_source_unique")
    .on(table.sourceSystem, table.sourceRecordKey),
  publicLookupIdx: index("member_service_organizations_public_lookup_idx")
    .on(table.publicApproved, table.isActive, table.verificationStatus),
  reviewIdx: index("member_service_organizations_review_idx")
    .on(table.publicApproved, table.nextReviewAt),
}));

export const memberServiceOrganizationLocalizations = pgTable("member_service_organization_localizations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => memberServiceOrganizations.id, { onDelete: "cascade" }),
  locale: localeEnum("locale").notNull(),
  officialName: text("official_name").notNull(),
  displayName: text("display_name"),
  summary: text("summary"),
  isOfficial: boolean("is_official").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  organizationLocaleUnique: uniqueIndex("member_service_organization_localizations_org_locale_unique")
    .on(table.organizationId, table.locale),
  nameLookupIdx: index("member_service_organization_localizations_name_lookup_idx")
    .on(table.locale, table.officialName),
}));

export const memberServiceServices = pgTable("member_service_services", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  nameKo: text("name_ko").notNull(),
  nameEn: text("name_en"),
  nameZh: text("name_zh"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const memberServiceOrganizationServices = pgTable("member_service_organization_services", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => memberServiceOrganizations.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id")
    .notNull()
    .references(() => memberServiceServices.id, { onDelete: "restrict" }),
  rawValue: text("raw_value"),
  isApproved: boolean("is_approved").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  organizationServiceUnique: uniqueIndex("member_service_organization_services_unique")
    .on(table.organizationId, table.serviceId),
}));

export const memberServiceRegions = pgTable("member_service_regions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  countryCode: text("country_code").notNull(),
  nameKo: text("name_ko").notNull(),
  nameEn: text("name_en"),
  nameZh: text("name_zh"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const memberServiceOrganizationRegions = pgTable("member_service_organization_regions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => memberServiceOrganizations.id, { onDelete: "cascade" }),
  regionId: uuid("region_id")
    .notNull()
    .references(() => memberServiceRegions.id, { onDelete: "restrict" }),
  relationScope: text("relation_scope").notNull().default("focus"),
  rawValue: text("raw_value"),
  isApproved: boolean("is_approved").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  organizationRegionUnique: uniqueIndex("member_service_organization_regions_unique")
    .on(table.organizationId, table.regionId, table.relationScope),
}));

export const memberServiceOrganizationContacts = pgTable("member_service_organization_contacts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => memberServiceOrganizations.id, { onDelete: "cascade" }),
  contactType: text("contact_type").notNull(),
  label: text("label"),
  value: text("value").notNull(),
  isPublic: boolean("is_public").notNull().default(false),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const memberServiceImportBatches = pgTable("member_service_import_batches", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceSystem: text("source_system").notNull(),
  sourceFileName: text("source_file_name"),
  sourceFileHash: text("source_file_hash"),
  status: text("status").notNull().default("staged"),
  importedBy: uuid("imported_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (table) => ({
  sourceHashUnique: uniqueIndex("member_service_import_batches_source_hash_unique")
    .on(table.sourceSystem, table.sourceFileHash),
}));

export const memberServiceImportRows = pgTable("member_service_import_rows", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  batchId: uuid("batch_id")
    .notNull()
    .references(() => memberServiceImportBatches.id, { onDelete: "cascade" }),
  sourceRecordKey: text("source_record_key").notNull(),
  rawData: jsonb("raw_data").notNull(),
  status: text("status").notNull().default("needs_review"),
  reasonCodes: jsonb("reason_codes"),
  organizationId: uuid("organization_id")
    .references(() => memberServiceOrganizations.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  batchRecordUnique: uniqueIndex("member_service_import_rows_batch_record_unique")
    .on(table.batchId, table.sourceRecordKey),
  reviewQueueIdx: index("member_service_import_rows_review_queue_idx")
    .on(table.status, table.createdAt),
}));

export const memberServiceConnectionRequests = pgTable("member_service_connection_requests", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  requesterId: uuid("requester_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => memberServiceOrganizations.id, { onDelete: "restrict" }),
  requestType: text("request_type").notNull(),
  purpose: text("purpose"),
  background: text("background"),
  industry: text("industry"),
  item: text("item"),
  regions: jsonb("regions").notNull().default(sql`'[]'::jsonb`),
  desiredDate: timestamp("desired_date", { withTimezone: true }),
  language: localeEnum("language").notNull().default("ko"),
  disclosureScope: jsonb("disclosure_scope").notNull(),
  consentPolicyVersion: text("consent_policy_version"),
  consentedAt: timestamp("consented_at", { withTimezone: true }),
  status: text("status").notNull().default("draft"),
  idempotencyKey: text("idempotency_key"),
  assignedOperatorId: uuid("assigned_operator_id")
    .references(() => users.id, { onDelete: "set null" }),
  assignedOrganizationUserId: uuid("assigned_organization_user_id")
    .references(() => users.id, { onDelete: "set null" }),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  requesterStatusIdx: index("member_service_connection_requests_requester_status_idx")
    .on(table.requesterId, table.status, table.updatedAt),
  organizationStatusIdx: index("member_service_connection_requests_organization_status_idx")
    .on(table.organizationId, table.status, table.updatedAt),
  assignedOperatorIdx: index("member_service_connection_requests_assigned_operator_idx")
    .on(table.assignedOperatorId, table.status, table.updatedAt),
  requesterIdempotencyUnique: uniqueIndex("member_service_connection_requests_requester_idempotency_unique")
    .on(table.requesterId, table.idempotencyKey),
  statusCheck: check(
    "member_service_connection_requests_status_check",
    sql`"status" IN ('draft', 'submitted', 'reviewing', 'assigned', 'in_progress', 'completed', 'closed', 'cancelled', 'rejected')`,
  ),
  disclosureScopeObjectCheck: check(
    "member_service_connection_requests_disclosure_scope_object_check",
    sql`jsonb_typeof("disclosure_scope") = 'object'`,
  ),
}));

export const memberServiceReviewAudits = pgTable("member_service_review_audits", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => memberServiceOrganizations.id, { onDelete: "cascade" }),
  reviewerId: uuid("reviewer_id").references(() => users.id, { onDelete: "set null" }),
  decision: text("decision").notNull(),
  evidenceUrl: text("evidence_url"),
  verificationDate: timestamp("verification_date", { withTimezone: true }),
  publicApproved: boolean("public_approved").notNull(),
  note: text("note"),
  beforeState: jsonb("before_state"),
  afterState: jsonb("after_state"),
  correlationId: text("correlation_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  organizationCreatedIdx: index("member_service_review_audits_org_created_idx")
    .on(table.organizationId, table.createdAt),
  reviewerCreatedIdx: index("member_service_review_audits_reviewer_created_idx")
    .on(table.reviewerId, table.createdAt),
}));

export type MemberServiceOrganization = typeof memberServiceOrganizations.$inferSelect;
export type MemberServiceOrganizationLocalization =
  typeof memberServiceOrganizationLocalizations.$inferSelect;
export type MemberServiceOrganizationService = typeof memberServiceOrganizationServices.$inferSelect;
export type MemberServiceOrganizationRegion = typeof memberServiceOrganizationRegions.$inferSelect;
export type MemberServiceOrganizationContact = typeof memberServiceOrganizationContacts.$inferSelect;
export type MemberServiceReviewAudit = typeof memberServiceReviewAudits.$inferSelect;
export type MemberServicePublicOrganization = {
  id: string;
  name: string;
  alternateNames: string[];
  summary: string | null;
  organizationType: string;
  baseCountry: string;
  baseRegion: string | null;
  chinaRegionFocus: string | null;
  websiteUrl: string | null;
  contactUrl: string | null;
  referenceUrl: string | null;
  verification: {
    status: string;
    lastVerifiedAt: string | null;
    nextReviewAt: string | null;
  };
};

export type MemberServiceConnectionRequest = typeof memberServiceConnectionRequests.$inferSelect;
export type AuthHandoff = typeof authHandoffs.$inferSelect;

export const memberServiceAuditLogs = pgTable("member_service_audit_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  actorId: uuid("actor_id")
    .references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  before: jsonb("before"),
  after: jsonb("after"),
  correlationId: text("correlation_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  entityCreatedIdx: index("member_service_audit_logs_entity_created_idx")
    .on(table.entityType, table.entityId, table.createdAt),
  actorCreatedIdx: index("member_service_audit_logs_actor_created_idx")
    .on(table.actorId, table.createdAt),
}));

export const memberServiceDisclosureScopeSchema = z.object({
  kscc: z.literal(true),
  targetOrganization: z.boolean(),
  contactDetails: z.boolean().default(false),
}).strict();

export const memberServiceConsentSchema = z.object({
  accepted: z.literal(true),
  policyVersion: z.string().trim().min(1).max(80),
}).strict();

export const memberServiceConnectionDraftSchema = z.object({
  organizationId: z.string().uuid(),
  requestType: z.string().trim().min(1).max(80),
  purpose: z.string().trim().max(2_000).optional(),
  background: z.string().trim().max(10_000).optional(),
  industry: z.string().trim().max(160).optional(),
  item: z.string().trim().max(160).optional(),
  regions: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  desiredDate: z.coerce.date().optional(),
  language: z.enum(["ko", "en", "zh"]).default("ko"),
  disclosureScope: memberServiceDisclosureScopeSchema.optional(),
  consent: memberServiceConsentSchema.optional(),
}).strict();

export type MemberServiceAuditLog = typeof memberServiceAuditLogs.$inferSelect;

export type MemberServiceConnectionDraftInput = z.infer<typeof memberServiceConnectionDraftSchema>;

export type MemberServiceConnectionMessage = typeof memberServiceConnectionMessages.$inferSelect;

export const memberServiceAttachments = pgTable("member_service_attachments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  requestId: uuid("request_id")
    .notNull()
    .references(() => memberServiceConnectionRequests.id, { onDelete: "cascade" }),
  messageId: uuid("message_id")
    .references(() => memberServiceConnectionMessages.id, { onDelete: "set null" }),
  uploaderId: uuid("uploader_id")
    .references(() => users.id, { onDelete: "set null" }),
  objectKey: text("object_key").notNull(),
  fileName: text("file_name").notNull(),
  contentType: text("content_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  disclosureScope: jsonb("disclosure_scope").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  requestCreatedIdx: index("member_service_attachments_request_created_idx")
    .on(table.requestId, table.createdAt),
  disclosureScopeObjectCheck: check(
    "member_service_attachments_disclosure_scope_object_check",
    sql`jsonb_typeof("disclosure_scope") = 'object'`,
  ),
}));

export type MemberServiceConnectionMessageInput = z.infer<typeof memberServiceConnectionMessageSchema>;

export type MemberServiceAttachment = typeof memberServiceAttachments.$inferSelect;

export const memberServiceConnectionMessageSchema = z.object({
  body: z.string().trim().min(1).max(10_000),
  disclosureScope: memberServiceDisclosureScopeSchema.optional(),
}).strict();

export const memberServiceConnectionMessages = pgTable("member_service_connection_messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  requestId: uuid("request_id")
    .notNull()
    .references(() => memberServiceConnectionRequests.id, { onDelete: "cascade" }),
  authorId: uuid("author_id")
    .references(() => users.id, { onDelete: "set null" }),
  body: text("body").notNull(),
  disclosureScope: jsonb("disclosure_scope").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  requestCreatedIdx: index("member_service_connection_messages_request_created_idx")
    .on(table.requestId, table.createdAt),
  disclosureScopeObjectCheck: check(
    "member_service_connection_messages_disclosure_scope_object_check",
    sql`jsonb_typeof("disclosure_scope") = 'object'`,
  ),
}));

export type MemberServiceDisclosureScope = {
  kscc: true;
  targetOrganization: boolean;
  contactDetails: boolean;
};
