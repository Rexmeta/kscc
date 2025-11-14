/**
 * Migration script: Legacy tables → Unified Posts System
 * 
 * This script migrates data from the legacy news, events, and resources tables
 * into the new unified posts, post_translations, and post_meta tables.
 * 
 * Usage: tsx server/scripts/migrateToPosts.ts [--dry-run]
 */

import { db } from "../db";
import { 
  news, events, resources,
  posts, postTranslations, postMeta,
  type News, type Event, type Resource
} from "../../shared/schema";
import { POST_META_KEYS } from "../../shared/postMetaKeys";
import { eq } from "drizzle-orm";

const isDryRun = process.argv.includes('--dry-run');

function generateSlug(title: string, id: string): string {
  // Create slug from title: lowercase, replace spaces with hyphens, remove special chars
  const slug = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
  
  // Append short ID suffix to ensure uniqueness
  const shortId = id.substring(0, 8);
  return `${slug}-${shortId}`;
}

async function migrateNews() {
  console.log('\n📰 Migrating News articles...');
  
  const newsArticles = await db.select().from(news);
  console.log(`Found ${newsArticles.length} news articles`);
  
  if (isDryRun) {
    console.log('[DRY RUN] Would migrate:');
    newsArticles.slice(0, 3).forEach(article => {
      console.log(`  - ${article.title} (slug: ${generateSlug(article.title, article.id)})`);
    });
    return;
  }
  
  for (const article of newsArticles) {
    try {
      // Wrap each record migration in a transaction for atomicity
      await db.transaction(async (tx) => {
        // Create post
        const [post] = await tx.insert(posts).values({
          postType: 'news',
          status: article.isPublished ? 'published' : 'draft',
          visibility: 'public',
          slug: generateSlug(article.title, article.id),
          primaryLocale: 'ko',
          authorId: article.authorId,
          coverImage: article.featuredImage || null,
          isFeatured: false,
          tags: article.tags,
          publishedAt: article.publishedAt,
        }).returning();
        
        // Create Korean translation
        await tx.insert(postTranslations).values({
          postId: post.id,
          locale: 'ko',
          title: article.title,
          excerpt: article.excerpt,
          content: article.content,
        });
        
        // Create English translation if exists
        if (article.titleEn || article.excerptEn || article.contentEn) {
          await tx.insert(postTranslations).values({
            postId: post.id,
            locale: 'en',
            title: article.titleEn || article.title,
            excerpt: article.excerptEn || article.excerpt,
            content: article.contentEn || article.content,
          });
        }
        
        // Create Chinese translation if exists
        if (article.titleZh || article.excerptZh || article.contentZh) {
          await tx.insert(postTranslations).values({
            postId: post.id,
            locale: 'zh',
            title: article.titleZh || article.title,
            excerpt: article.excerptZh || article.excerpt,
            content: article.contentZh || article.content,
          });
        }
        
        // Create meta entries
        await tx.insert(postMeta).values([
          {
            postId: post.id,
            key: POST_META_KEYS.news.category,
            valueText: article.category,
          },
          {
            postId: post.id,
            key: POST_META_KEYS.news.viewCount,
            valueNumber: article.viewCount,
          },
          ...(article.images ? [{
            postId: post.id,
            key: POST_META_KEYS.news.images,
            value: article.images as any,
          }] : []),
        ]);
      });
      
      console.log(`✓ Migrated: ${article.title}`);
    } catch (error) {
      console.error(`✗ Failed to migrate: ${article.title}`, error);
    }
  }
  
  console.log(`✅ Migrated ${newsArticles.length} news articles`);
}

async function migrateEvents() {
  console.log('\n📅 Migrating Events...');
  
  const eventsList = await db.select().from(events);
  console.log(`Found ${eventsList.length} events`);
  
  if (isDryRun) {
    console.log('[DRY RUN] Would migrate:');
    eventsList.slice(0, 3).forEach(event => {
      console.log(`  - ${event.title} (slug: ${generateSlug(event.title, event.id)})`);
    });
    return;
  }
  
  for (const event of eventsList) {
    try {
      // Wrap each record migration in a transaction for atomicity
      await db.transaction(async (tx) => {
        // Determine status
        const status = event.isPublic ? 'published' : 'draft';
        
        // Create post
        const [post] = await tx.insert(posts).values({
          postType: 'event',
          status,
          visibility: event.isPublic ? 'public' : 'members',
          slug: generateSlug(event.title, event.id),
          primaryLocale: 'ko',
          authorId: event.createdBy,
          coverImage: (event.images as any)?.[0] || null,
          isFeatured: false,
          tags: null,
          publishedAt: event.isPublic ? event.createdAt : null,
        }).returning();
        
        // Create Korean translation
        await tx.insert(postTranslations).values({
          postId: post.id,
          locale: 'ko',
          title: event.title,
          excerpt: (event.description || '').substring(0, 200) || null,
          content: event.content || event.description || null,
        });
        
        // Create English translation if exists
        if (event.titleEn || event.descriptionEn || event.contentEn) {
          await tx.insert(postTranslations).values({
            postId: post.id,
            locale: 'en',
            title: event.titleEn || event.title,
            excerpt: ((event.descriptionEn || event.description) || '').substring(0, 200) || null,
            content: event.contentEn || event.content || event.descriptionEn || event.description || null,
          });
        }
        
        // Create Chinese translation if exists
        if (event.titleZh || event.descriptionZh || event.contentZh) {
          await tx.insert(postTranslations).values({
            postId: post.id,
            locale: 'zh',
            title: event.titleZh || event.title,
            excerpt: ((event.descriptionZh || event.description) || '').substring(0, 200) || null,
            content: event.contentZh || event.content || event.descriptionZh || event.description || null,
          });
        }
        
        // Create meta entries
        const metaEntries: any[] = [
          {
            postId: post.id,
            key: POST_META_KEYS.event.eventDate,
            valueTimestamp: event.eventDate,
          },
          {
            postId: post.id,
            key: POST_META_KEYS.event.location,
            valueText: event.location,
          },
          {
            postId: post.id,
            key: POST_META_KEYS.event.category,
            valueText: event.category,
          },
          {
            postId: post.id,
            key: POST_META_KEYS.event.eventType,
            valueText: event.eventType,
          },
          {
            postId: post.id,
            key: POST_META_KEYS.event.fee,
            valueNumber: event.fee,
          },
          {
            postId: post.id,
            key: POST_META_KEYS.event.isPublic,
            valueBoolean: event.isPublic,
          },
          {
            postId: post.id,
            key: POST_META_KEYS.event.requiresApproval,
            valueBoolean: event.requiresApproval,
          },
        ];
        
        // Add optional meta
        if (event.endDate != null) {
          metaEntries.push({
            postId: post.id,
            key: POST_META_KEYS.event.endDate,
            valueTimestamp: event.endDate,
          });
        }
        
        if (event.capacity != null) {
          metaEntries.push({
            postId: post.id,
            key: POST_META_KEYS.event.capacity,
            valueNumber: event.capacity,
          });
        }
        
        if (event.registrationDeadline != null) {
          metaEntries.push({
            postId: post.id,
            key: POST_META_KEYS.event.registrationDeadline,
            valueTimestamp: event.registrationDeadline,
          });
        }
        
        if (event.images) {
          metaEntries.push({
            postId: post.id,
            key: POST_META_KEYS.event.images,
            value: event.images as any,
          });
        }
        
        if (event.speakers) {
          metaEntries.push({
            postId: post.id,
            key: POST_META_KEYS.event.speakers,
            value: event.speakers as any,
          });
        }
        
        if (event.program) {
          metaEntries.push({
            postId: post.id,
            key: POST_META_KEYS.event.program,
            value: event.program as any,
          });
        }
        
        await tx.insert(postMeta).values(metaEntries);
      });
      
      console.log(`✓ Migrated: ${event.title}`);
    } catch (error) {
      console.error(`✗ Failed to migrate: ${event.title}`, error);
    }
  }
  
  console.log(`✅ Migrated ${eventsList.length} events`);
}

async function migrateResources() {
  console.log('\n📁 Migrating Resources...');
  
  const resourcesList = await db.select().from(resources);
  console.log(`Found ${resourcesList.length} resources`);
  
  if (isDryRun) {
    console.log('[DRY RUN] Would migrate:');
    resourcesList.slice(0, 3).forEach(resource => {
      console.log(`  - ${resource.title} (slug: ${generateSlug(resource.title, resource.id)})`);
    });
    return;
  }
  
  for (const resource of resourcesList) {
    try {
      // Wrap each record migration in a transaction for atomicity
      await db.transaction(async (tx) => {
        // Map accessLevel to visibility
        const visibilityMap: Record<string, 'public' | 'members' | 'premium'> = {
          'public': 'public',
          'members': 'members',
          'premium': 'premium',
        };
        
        // Create post
        const [post] = await tx.insert(posts).values({
          postType: 'resource',
          status: resource.isActive ? 'published' : 'archived',
          visibility: visibilityMap[resource.accessLevel] || 'public',
          slug: generateSlug(resource.title, resource.id),
          primaryLocale: 'ko',
          authorId: resource.createdBy,
          coverImage: null,
          isFeatured: false,
          tags: null,
          publishedAt: resource.isActive ? resource.createdAt : null,
        }).returning();
        
        // Create Korean translation
        await tx.insert(postTranslations).values({
          postId: post.id,
          locale: 'ko',
          title: resource.title,
          excerpt: resource.description?.substring(0, 200) || null,
          content: resource.description || null,
        });
        
        // Create English translation if exists
        if (resource.titleEn || resource.descriptionEn) {
          await tx.insert(postTranslations).values({
            postId: post.id,
            locale: 'en',
            title: resource.titleEn || resource.title,
            excerpt: resource.descriptionEn?.substring(0, 200) || resource.description?.substring(0, 200) || null,
            content: resource.descriptionEn || resource.description || null,
          });
        }
        
        // Create Chinese translation if exists
        if (resource.titleZh || resource.descriptionZh) {
          await tx.insert(postTranslations).values({
            postId: post.id,
            locale: 'zh',
            title: resource.titleZh || resource.title,
            excerpt: resource.descriptionZh?.substring(0, 200) || resource.description?.substring(0, 200) || null,
            content: resource.descriptionZh || resource.description || null,
          });
        }
        
        // Create meta entries
        await tx.insert(postMeta).values([
          {
            postId: post.id,
            key: POST_META_KEYS.resource.category,
            valueText: resource.category,
          },
          {
            postId: post.id,
            key: POST_META_KEYS.resource.fileUrl,
            valueText: resource.fileUrl,
          },
          {
            postId: post.id,
            key: POST_META_KEYS.resource.fileName,
            valueText: resource.fileName,
          },
          {
            postId: post.id,
            key: POST_META_KEYS.resource.fileType,
            valueText: resource.fileType,
          },
          {
            postId: post.id,
            key: POST_META_KEYS.resource.accessLevel,
            valueText: resource.accessLevel,
          },
          {
            postId: post.id,
            key: POST_META_KEYS.resource.downloadCount,
            valueNumber: resource.downloadCount,
          },
          ...(resource.fileSize != null ? [{
            postId: post.id,
            key: POST_META_KEYS.resource.fileSize,
            valueNumber: resource.fileSize,
          }] : []),
        ]);
      });
      
      console.log(`✓ Migrated: ${resource.title}`);
    } catch (error) {
      console.error(`✗ Failed to migrate: ${resource.title}`, error);
    }
  }
  
  console.log(`✅ Migrated ${resourcesList.length} resources`);
}

async function main() {
  console.log('🚀 Starting migration to unified Posts system...\n');
  
  if (isDryRun) {
    console.log('⚠️  DRY RUN MODE - No data will be written\n');
  }
  
  try {
    await migrateNews();
    await migrateEvents();
    await migrateResources();
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log('  - News articles migrated');
    console.log('  - Events migrated');
    console.log('  - Resources migrated');
    console.log('\n⚠️  IMPORTANT: Legacy tables (news, events, resources) have NOT been deleted.');
    console.log('   Review the migrated data before removing the old tables.');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
