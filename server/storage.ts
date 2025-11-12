import { 
  users, members, events, eventRegistrations, news, resources, inquiries, partners,
  type User, type InsertUser, type Member, type InsertMember, type Event, type InsertEvent,
  type EventRegistration, type InsertEventRegistration, type News, type InsertNews,
  type Resource, type InsertResource, type Inquiry, type InsertInquiry,
  type Partner, type InsertPartner, type UserRegistrationWithEvent
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, like, gte, lte, count, sql } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserCount(): Promise<number>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser & { role?: string }): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  validateUser(email: string, password: string): Promise<User | undefined>;

  // Members
  getMember(id: string): Promise<Member | undefined>;
  getMemberByUserId(userId: string): Promise<Member | undefined>;
  getMembers(filters?: {
    country?: string;
    industry?: string;
    membershipLevel?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ members: Member[]; total: number }>;
  createMember(member: InsertMember): Promise<Member>;
  updateMember(id: string, updates: Partial<Member>): Promise<Member | undefined>;

  // Events
  getEvent(id: string): Promise<Event | undefined>;
  getEvents(filters?: {
    category?: string;
    upcoming?: boolean;
    published?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ events: Event[]; total: number }>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: string, updates: Partial<Event>): Promise<Event | undefined>;
  deleteEvent(id: string): Promise<void>;

  // Event Registrations
  getEventRegistration(eventId: string, userId: string): Promise<EventRegistration | undefined>;
  getEventRegistrationById(id: string): Promise<EventRegistration | undefined>;
  getEventRegistrations(eventId: string): Promise<EventRegistration[]>;
  getUserRegistrations(userId: string): Promise<UserRegistrationWithEvent[]>;
  createEventRegistration(registration: InsertEventRegistration): Promise<EventRegistration>;
  updateEventRegistration(id: string, updates: Partial<EventRegistration>): Promise<EventRegistration | undefined>;

  // News
  getNewsArticle(id: string): Promise<News | undefined>;
  getNews(filters?: {
    category?: string;
    published?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ articles: News[]; total: number }>;
  createNews(article: InsertNews): Promise<News>;
  updateNews(id: string, updates: Partial<News>): Promise<News | undefined>;
  deleteNews(id: string): Promise<void>;
  incrementNewsViews(id: string): Promise<void>;

  // Resources
  getResource(id: string): Promise<Resource | undefined>;
  getResources(filters?: {
    category?: string;
    accessLevel?: string;
    active?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ resources: Resource[]; total: number }>;
  createResource(resource: InsertResource): Promise<Resource>;
  updateResource(id: string, updates: Partial<Resource>): Promise<Resource | undefined>;
  deleteResource(id: string): Promise<void>;
  incrementResourceDownloads(id: string): Promise<void>;

  // Inquiries
  getInquiry(id: string): Promise<Inquiry | undefined>;
  getInquiries(filters?: {
    status?: string;
    category?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ inquiries: Inquiry[]; total: number }>;
  createInquiry(inquiry: InsertInquiry): Promise<Inquiry>;
  updateInquiry(id: string, updates: Partial<Inquiry>): Promise<Inquiry | undefined>;

  // Partners
  getPartner(id: string): Promise<Partner | undefined>;
  getPartners(active?: boolean): Promise<Partner[]>;
  createPartner(partner: InsertPartner): Promise<Partner>;
  updatePartner(id: string, updates: Partial<Partner>): Promise<Partner | undefined>;
  deletePartner(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser & { role?: string }): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        password: hashedPassword,
      })
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async validateUser(email: string, password: string): Promise<User | undefined> {
    const user = await this.getUserByEmail(email);
    if (!user) return undefined;
    
    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : undefined;
  }

  async getUserCount(): Promise<number> {
    const [result] = await db.select({ count: count() }).from(users);
    return result?.count || 0;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
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
    limit?: number;
    offset?: number;
  }): Promise<{ members: Member[]; total: number }> {
    let query = db.select().from(members);
    let countQuery = db.select({ count: count() }).from(members);

    const conditions = [eq(members.isPublic, true)];

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
        query = query.where(whereCondition);
        countQuery = countQuery.where(whereCondition);
      }
    }

    const [totalResult] = await countQuery;
    const membersResult = await query
      .orderBy(desc(members.createdAt))
      .limit(filters?.limit || 50)
      .offset(filters?.offset || 0);

    return {
      members: membersResult,
      total: totalResult.count,
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

  // Events
  async getEvent(id: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event || undefined;
  }

  async getEvents(filters?: {
    category?: string;
    upcoming?: boolean;
    published?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ events: Event[]; total: number }> {
    const conditions = [];

    if (filters?.category) {
      conditions.push(eq(events.category, filters.category));
    }
    if (filters?.upcoming) {
      conditions.push(gte(events.eventDate, new Date()));
    }
    if (filters?.published) {
      conditions.push(eq(events.isPublic, true));
    }

    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

    // Get events with registration count
    const eventsWithCount = await db
      .select({
        event: events,
        registrationCount: count(eventRegistrations.id),
      })
      .from(events)
      .leftJoin(eventRegistrations, eq(events.id, eventRegistrations.eventId))
      .where(whereCondition)
      .groupBy(events.id)
      .orderBy(desc(events.eventDate))
      .limit(filters?.limit || 50)
      .offset(filters?.offset || 0);

    // Get total count
    let countQuery = db.select({ count: count() }).from(events);
    if (whereCondition) {
      countQuery = countQuery.where(whereCondition);
    }
    const [totalResult] = await countQuery;

    // Map results to include registrationCount
    const eventsResult = eventsWithCount.map(({ event, registrationCount }) => ({
      ...event,
      registrationCount: Number(registrationCount),
    }));

    return {
      events: eventsResult as any,
      total: totalResult.count,
    };
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const [newEvent] = await db
      .insert(events)
      .values(event)
      .returning();
    return newEvent;
  }

  async updateEvent(id: string, updates: Partial<Event>): Promise<Event | undefined> {
    const [event] = await db
      .update(events)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(events.id, id))
      .returning();
    return event || undefined;
  }

  async deleteEvent(id: string): Promise<void> {
    await db.delete(events).where(eq(events.id, id));
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
    const results = await db
      .select({
        registration: eventRegistrations,
        event: events,
      })
      .from(eventRegistrations)
      .leftJoin(events, eq(eventRegistrations.eventId, events.id))
      .where(eq(eventRegistrations.userId, userId))
      .orderBy(desc(eventRegistrations.createdAt));

    return results.map(({ registration, event }) => ({
      ...registration,
      event,
    }));
  }

  async createEventRegistration(registration: InsertEventRegistration): Promise<EventRegistration> {
    const [newRegistration] = await db
      .insert(eventRegistrations)
      .values(registration)
      .returning();
    return newRegistration;
  }

  async updateEventRegistration(id: string, updates: Partial<EventRegistration>): Promise<EventRegistration | undefined> {
    const [registration] = await db
      .update(eventRegistrations)
      .set(updates)
      .where(eq(eventRegistrations.id, id))
      .returning();
    return registration || undefined;
  }

  // News
  async getNewsArticle(id: string): Promise<News | undefined> {
    const [article] = await db.select().from(news).where(eq(news.id, id));
    return article || undefined;
  }

  async getNews(filters?: {
    category?: string;
    published?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ articles: News[]; total: number }> {
    let query = db.select().from(news);
    let countQuery = db.select({ count: count() }).from(news);

    const conditions = [];

    if (filters?.category) {
      conditions.push(eq(news.category, filters.category));
    }
    if (filters?.published) {
      conditions.push(eq(news.isPublished, true));
    }

    if (conditions.length > 0) {
      const whereCondition = and(...conditions);
      if (whereCondition) {
        query = query.where(whereCondition);
        countQuery = countQuery.where(whereCondition);
      }
    }

    const [totalResult] = await countQuery;
    const articlesResult = await query
      .orderBy(desc(news.publishedAt), desc(news.createdAt))
      .limit(filters?.limit || 50)
      .offset(filters?.offset || 0);

    return {
      articles: articlesResult,
      total: totalResult.count,
    };
  }

  async createNews(article: InsertNews): Promise<News> {
    const [newArticle] = await db
      .insert(news)
      .values(article)
      .returning();
    return newArticle;
  }

  async updateNews(id: string, updates: Partial<News>): Promise<News | undefined> {
    const [article] = await db
      .update(news)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(news.id, id))
      .returning();
    return article || undefined;
  }

  async deleteNews(id: string): Promise<void> {
    await db.delete(news).where(eq(news.id, id));
  }

  async incrementNewsViews(id: string): Promise<void> {
    await db
      .update(news)
      .set({ viewCount: sql`${news.viewCount} + 1` })
      .where(eq(news.id, id));
  }

  // Resources
  async getResource(id: string): Promise<Resource | undefined> {
    const [resource] = await db.select().from(resources).where(eq(resources.id, id));
    return resource || undefined;
  }

  async getResources(filters?: {
    category?: string;
    accessLevel?: string;
    active?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ resources: Resource[]; total: number }> {
    let query = db.select().from(resources);
    let countQuery = db.select({ count: count() }).from(resources);

    const conditions = [];

    if (filters?.category) {
      conditions.push(eq(resources.category, filters.category));
    }
    if (filters?.accessLevel) {
      conditions.push(eq(resources.accessLevel, filters.accessLevel));
    }
    if (filters?.active !== undefined) {
      conditions.push(eq(resources.isActive, filters.active));
    }

    if (conditions.length > 0) {
      const whereCondition = and(...conditions);
      if (whereCondition) {
        query = query.where(whereCondition);
        countQuery = countQuery.where(whereCondition);
      }
    }

    const [totalResult] = await countQuery;
    const resourcesResult = await query
      .orderBy(desc(resources.createdAt))
      .limit(filters?.limit || 50)
      .offset(filters?.offset || 0);

    return {
      resources: resourcesResult,
      total: totalResult.count,
    };
  }

  async createResource(resource: InsertResource): Promise<Resource> {
    const [newResource] = await db
      .insert(resources)
      .values(resource)
      .returning();
    return newResource;
  }

  async updateResource(id: string, updates: Partial<Resource>): Promise<Resource | undefined> {
    const [resource] = await db
      .update(resources)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(resources.id, id))
      .returning();
    return resource || undefined;
  }

  async deleteResource(id: string): Promise<void> {
    await db.delete(resources).where(eq(resources.id, id));
  }

  async incrementResourceDownloads(id: string): Promise<void> {
    await db
      .update(resources)
      .set({ downloadCount: sql`${resources.downloadCount} + 1` })
      .where(eq(resources.id, id));
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
        query = query.where(whereCondition);
        countQuery = countQuery.where(whereCondition);
      }
    }

    const [totalResult] = await countQuery;
    const inquiriesResult = await query
      .orderBy(desc(inquiries.createdAt))
      .limit(filters?.limit || 50)
      .offset(filters?.offset || 0);

    return {
      inquiries: inquiriesResult,
      total: totalResult.count,
    };
  }

  async createInquiry(inquiry: InsertInquiry): Promise<Inquiry> {
    const [newInquiry] = await db
      .insert(inquiries)
      .values(inquiry)
      .returning();
    return newInquiry;
  }

  async updateInquiry(id: string, updates: Partial<Inquiry>): Promise<Inquiry | undefined> {
    const [inquiry] = await db
      .update(inquiries)
      .set(updates)
      .where(eq(inquiries.id, id))
      .returning();
    return inquiry || undefined;
  }

  // Partners
  async getPartner(id: string): Promise<Partner | undefined> {
    const [partner] = await db.select().from(partners).where(eq(partners.id, id));
    return partner || undefined;
  }

  async getPartners(active?: boolean): Promise<Partner[]> {
    let query = db.select().from(partners);

    if (active !== undefined) {
      query = query.where(eq(partners.isActive, active));
    }

    return query.orderBy(partners.order, partners.name);
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
}

export const storage = new DatabaseStorage();
