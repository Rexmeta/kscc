import { 
  users, members, events, eventRegistrations, news, resources, inquiries, partners,
  posts, postTranslations, postMeta,
  type User, type InsertUser, type Member, type InsertMember, type Event, type InsertEvent,
  type EventRegistration, type InsertEventRegistration, type News, type InsertNews,
  type Resource, type InsertResource, type Inquiry, type InsertInquiry,
  type Partner, type InsertPartner, type UserRegistrationWithEvent,
  type Post, type InsertPost, type PostTranslation, type InsertPostTranslation,
  type PostMeta, type InsertPostMeta, type PostWithTranslations
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, like, gte, lte, count, sql, inArray } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserCount(): Promise<number>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser & { role?: string; userType?: string }): Promise<User>;
  createUserWithMember(userData: InsertUser & { role?: string; userType?: string }, memberData: Omit<InsertMember, 'userId'>): Promise<{ user: User; member: Member }>;
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

  // Unified Posts System
  // Posts
  getPost(id: string): Promise<Post | undefined>;
  getPostBySlug(slug: string): Promise<Post | undefined>;
  getPostWithTranslations(id: string, locale?: string): Promise<PostWithTranslations | undefined>;
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
    limit?: number;
    offset?: number;
  }): Promise<{ posts: PostWithTranslations[]; total: number }>;
  createPost(post: InsertPost): Promise<Post>;
  updatePost(id: string, updates: Partial<Post>): Promise<Post | undefined>;
  deletePost(id: string): Promise<void>;

  // Post Translations
  getPostTranslation(postId: string, locale: string): Promise<PostTranslation | undefined>;
  getPostTranslations(postId: string): Promise<PostTranslation[]>;
  createPostTranslation(translation: InsertPostTranslation): Promise<PostTranslation>;
  updatePostTranslation(id: string, updates: Partial<PostTranslation>): Promise<PostTranslation | undefined>;
  upsertPostTranslation(translation: InsertPostTranslation): Promise<PostTranslation>;

  // Post Meta
  getPostMeta(postId: string, key: string): Promise<PostMeta | undefined>;
  getPostMetaAll(postId: string): Promise<PostMeta[]>;
  setPostMeta(postId: string, key: string, value: any): Promise<PostMeta>;
  deletePostMeta(postId: string, key: string): Promise<void>;
  incrementPostMetaNumber(postId: string, key: string, amount?: number): Promise<void>;
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

  async createUser(insertUser: InsertUser & { role?: string; userType?: string }): Promise<User> {
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

  // Unified Posts System
  // Posts
  async getPost(id: string): Promise<Post | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    return post || undefined;
  }

  async getPostBySlug(slug: string): Promise<Post | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.slug, slug));
    return post || undefined;
  }

  async getPostWithTranslations(id: string, locale?: string): Promise<PostWithTranslations | undefined> {
    const post = await this.getPost(id);
    if (!post) return undefined;

    let translations;
    if (locale) {
      translations = await db
        .select()
        .from(postTranslations)
        .where(and(
          eq(postTranslations.postId, id),
          eq(postTranslations.locale, locale as any)
        ));
    } else {
      translations = await db
        .select()
        .from(postTranslations)
        .where(eq(postTranslations.postId, id));
    }

    const meta = await this.getPostMetaAll(id);

    return {
      ...post,
      translations,
      meta,
    };
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
    limit?: number;
    offset?: number;
  }): Promise<{ posts: PostWithTranslations[]; total: number }> {
    let query = db.select().from(posts);
    let countQuery = db.select({ count: count() }).from(posts);

    const conditions = [];

    if (filters?.postType) {
      conditions.push(eq(posts.postType, filters.postType as any));
    }

    if (filters?.status) {
      conditions.push(eq(posts.status, filters.status as any));
    }

    if (filters?.visibility) {
      conditions.push(eq(posts.visibility, filters.visibility as any));
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
      conditions.push(sql`EXISTS (
        SELECT 1 FROM ${postTranslations}
        WHERE ${postTranslations.postId} = ${posts.id}
          AND (
            ${postTranslations.title} ILIKE ${searchTerm}
            OR ${postTranslations.content} ILIKE ${searchTerm}
            OR ${postTranslations.excerpt} ILIKE ${searchTerm}
          )
      ) OR ${posts.slug} ILIKE ${searchTerm}`);
    }

    // Upcoming events filtering (SQL-level for correct pagination)
    if (filters?.upcoming && filters?.postType === 'event') {
      conditions.push(sql`EXISTS (
        SELECT 1 FROM ${postMeta}
        WHERE ${postMeta.postId} = ${posts.id}
          AND ${postMeta.key} = 'event.eventDate'
          AND ${postMeta.valueTimestamp} IS NOT NULL
          AND ${postMeta.valueTimestamp} > NOW()
      )`);
    }

    if (conditions.length > 0) {
      const whereCondition = and(...conditions);
      if (whereCondition) {
        query = query.where(whereCondition);
        countQuery = countQuery.where(whereCondition);
      }
    }

    const [totalResult] = await countQuery;
    const postsResult = await query
      .orderBy(desc(posts.publishedAt))
      .limit(filters?.limit || 50)
      .offset(filters?.offset || 0);

    // Early return if no posts
    if (postsResult.length === 0) {
      return { posts: [], total: 0 };
    }

    // Batch fetch translations and meta for all posts
    const postIds = postsResult.map(p => p.id);
    
    // Fetch all translations (all locales)
    const allTranslations = await db
      .select()
      .from(postTranslations)
      .where(inArray(postTranslations.postId, postIds));
    
    // Fetch all meta
    const allMeta = await db
      .select()
      .from(postMeta)
      .where(inArray(postMeta.postId, postIds));
    
    // Group translations and meta by postId
    const translationsByPost = new Map<string, typeof allTranslations>();
    const metaByPost = new Map<string, typeof allMeta>();
    
    allTranslations.forEach(t => {
      const existing = translationsByPost.get(t.postId) || [];
      translationsByPost.set(t.postId, [...existing, t]);
    });
    
    allMeta.forEach(m => {
      const existing = metaByPost.get(m.postId) || [];
      metaByPost.set(m.postId, [...existing, m]);
    });
    
    // Combine posts with their translations and meta
    const hydratedPosts: PostWithTranslations[] = postsResult.map(post => ({
      ...post,
      translations: translationsByPost.get(post.id) || [],
      meta: metaByPost.get(post.id) || [],
    }));

    return {
      posts: hydratedPosts,
      total: totalResult.count,
    };
  }

  async createPost(post: InsertPost): Promise<Post> {
    const [newPost] = await db
      .insert(posts)
      .values(post)
      .returning();
    return newPost;
  }

  async updatePost(id: string, updates: Partial<Post>): Promise<Post | undefined> {
    const [post] = await db
      .update(posts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(posts.id, id))
      .returning();
    return post || undefined;
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
  async getPostMeta(postId: string, key: string): Promise<PostMeta | undefined> {
    const [meta] = await db
      .select()
      .from(postMeta)
      .where(and(
        eq(postMeta.postId, postId),
        eq(postMeta.key, key)
      ));
    return meta || undefined;
  }

  async getPostMetaAll(postId: string): Promise<PostMeta[]> {
    return db.select().from(postMeta).where(eq(postMeta.postId, postId));
  }

  async setPostMeta(postId: string, key: string, value: any): Promise<PostMeta> {
    const existing = await this.getPostMeta(postId, key);
    
    // Determine the appropriate column based on value type
    const metaValue: Partial<PostMeta> = {
      value: typeof value === 'object' ? value : undefined,
      valueText: typeof value === 'string' ? value : undefined,
      valueNumber: typeof value === 'number' ? value : undefined,
      valueBoolean: typeof value === 'boolean' ? value : undefined,
      valueTimestamp: value instanceof Date ? value : undefined,
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

  async deletePostMeta(postId: string, key: string): Promise<void> {
    await db.delete(postMeta).where(and(
      eq(postMeta.postId, postId),
      eq(postMeta.key, key)
    ));
  }

  async incrementPostMetaNumber(postId: string, key: string, amount: number = 1): Promise<void> {
    const existing = await this.getPostMeta(postId, key);
    
    if (existing && existing.valueNumber !== null) {
      await db
        .update(postMeta)
        .set({ 
          valueNumber: (existing.valueNumber || 0) + amount,
          updatedAt: new Date(),
        })
        .where(eq(postMeta.id, existing.id));
    } else {
      await this.setPostMeta(postId, key, amount);
    }
  }
}

export const storage = new DatabaseStorage();
