import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("member"), // member, admin
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const members = pgTable("members", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id),
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

export const events = pgTable("events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  titleEn: text("title_en"),
  titleZh: text("title_zh"),
  description: text("description").notNull(),
  descriptionEn: text("description_en"),
  descriptionZh: text("description_zh"),
  content: text("content"),
  contentEn: text("content_en"),
  contentZh: text("content_zh"),
  eventDate: timestamp("event_date").notNull(),
  endDate: timestamp("end_date"),
  location: text("location").notNull(),
  locationEn: text("location_en"),
  locationZh: text("location_zh"),
  category: text("category").notNull(), // networking, seminar, workshop, cultural
  eventType: text("event_type").notNull().default("offline"), // offline, online, hybrid
  capacity: integer("capacity"),
  registrationDeadline: timestamp("registration_deadline"),
  fee: integer("fee").default(0),
  isPublic: boolean("is_public").notNull().default(true),
  requiresApproval: boolean("requires_approval").notNull().default(false),
  images: jsonb("images"), // array of image URLs
  speakers: jsonb("speakers"), // array of speaker objects
  program: jsonb("program"), // array of program items
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const eventRegistrations = pgTable("event_registrations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: uuid("event_id").references(() => events.id),
  userId: uuid("user_id").references(() => users.id),
  attendeeName: text("attendee_name").notNull(),
  attendeeEmail: text("attendee_email").notNull(),
  attendeePhone: text("attendee_phone"),
  companyName: text("company_name"),
  status: text("status").notNull().default("registered"), // registered, approved, cancelled, attended
  paymentStatus: text("payment_status").default("free"), // free, paid, pending
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const news = pgTable("news", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  titleEn: text("title_en"),
  titleZh: text("title_zh"),
  excerpt: text("excerpt").notNull(),
  excerptEn: text("excerpt_en"),
  excerptZh: text("excerpt_zh"),
  content: text("content").notNull(),
  contentEn: text("content_en"),
  contentZh: text("content_zh"),
  category: text("category").notNull(), // notice, press, activity
  tags: jsonb("tags"), // array of tags
  featuredImage: text("featured_image"),
  images: jsonb("images"), // array of image URLs
  isPublished: boolean("is_published").notNull().default(false),
  publishedAt: timestamp("published_at"),
  viewCount: integer("view_count").notNull().default(0),
  authorId: uuid("author_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const resources = pgTable("resources", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  titleEn: text("title_en"),
  titleZh: text("title_zh"),
  description: text("description"),
  descriptionEn: text("description_en"),
  descriptionZh: text("description_zh"),
  category: text("category").notNull(), // reports, forms, presentations, guides
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size"), // in bytes
  fileType: text("file_type").notNull(), // pdf, docx, xlsx, etc.
  accessLevel: text("access_level").notNull().default("public"), // public, members, premium
  downloadCount: integer("download_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
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
  response: text("response"),
  respondedBy: uuid("responded_by").references(() => users.id),
  respondedAt: timestamp("responded_at"),
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

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  member: one(members, {
    fields: [users.id],
    references: [members.userId],
  }),
  eventsCreated: many(events),
  registrations: many(eventRegistrations),
  newsArticles: many(news),
  resourcesCreated: many(resources),
  inquiriesResponded: many(inquiries),
}));

export const membersRelations = relations(members, ({ one }) => ({
  user: one(users, {
    fields: [members.userId],
    references: [users.id],
  }),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  creator: one(users, {
    fields: [events.createdBy],
    references: [users.id],
  }),
  registrations: many(eventRegistrations),
}));

export const eventRegistrationsRelations = relations(eventRegistrations, ({ one }) => ({
  event: one(events, {
    fields: [eventRegistrations.eventId],
    references: [events.id],
  }),
  user: one(users, {
    fields: [eventRegistrations.userId],
    references: [users.id],
  }),
}));

export const newsRelations = relations(news, ({ one }) => ({
  author: one(users, {
    fields: [news.authorId],
    references: [users.id],
  }),
}));

export const resourcesRelations = relations(resources, ({ one }) => ({
  creator: one(users, {
    fields: [resources.createdBy],
    references: [users.id],
  }),
}));

export const inquiriesRelations = relations(inquiries, ({ one }) => ({
  responder: one(users, {
    fields: [inquiries.respondedBy],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  name: true,
  role: true,
});

export const insertMemberSchema = createInsertSchema(members).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEventRegistrationSchema = createInsertSchema(eventRegistrations).omit({
  id: true,
  createdAt: true,
});

export const insertNewsSchema = createInsertSchema(news).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertResourceSchema = createInsertSchema(resources).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInquirySchema = createInsertSchema(inquiries).omit({
  id: true,
  createdAt: true,
});

export const insertPartnerSchema = createInsertSchema(partners).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Member = typeof members.$inferSelect;
export type InsertMember = z.infer<typeof insertMemberSchema>;

export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;

export type EventRegistration = typeof eventRegistrations.$inferSelect;
export type InsertEventRegistration = z.infer<typeof insertEventRegistrationSchema>;

export type News = typeof news.$inferSelect;
export type InsertNews = z.infer<typeof insertNewsSchema>;

export type Resource = typeof resources.$inferSelect;
export type InsertResource = z.infer<typeof insertResourceSchema>;

export type Inquiry = typeof inquiries.$inferSelect;
export type InsertInquiry = z.infer<typeof insertInquirySchema>;

export type Partner = typeof partners.$inferSelect;
export type InsertPartner = z.infer<typeof insertPartnerSchema>;
