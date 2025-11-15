import { PostWithTranslations, PostMeta, PostTranslation } from '@shared/schema';

/**
 * Get meta value by key from post meta array
 * Automatically returns the appropriate typed value (text, number, boolean, timestamp, or JSONB)
 */
export const getMetaValue = (meta: PostMeta[], key: string): any => {
  const metaItem = meta.find(m => m.key === key);
  if (!metaItem) return null;
  
  // Return the appropriate value based on what's set
  // Priority: specific types first, then fallback to generic value
  if (metaItem.valueText !== null) return metaItem.valueText;
  if (metaItem.valueNumber !== null) return metaItem.valueNumber;
  if (metaItem.valueBoolean !== null) return metaItem.valueBoolean;
  if (metaItem.valueTimestamp !== null) return metaItem.valueTimestamp;
  if (metaItem.value !== null) return metaItem.value;
  return null;
};

/**
 * Get translation for a specific locale with fallback to primary locale or first available
 * Returns undefined if no translations exist - callers should handle this case
 */
export const getTranslation = (post: PostWithTranslations, locale: string): PostTranslation | undefined => {
  if (!post.translations || post.translations.length === 0) {
    return undefined;
  }
  
  // Try to find exact locale match
  const exactMatch = post.translations.find(t => t.locale === locale);
  if (exactMatch) return exactMatch;
  
  // Fallback to primary locale
  const primaryMatch = post.translations.find(t => t.locale === post.primaryLocale);
  if (primaryMatch) return primaryMatch;
  
  // Last resort: return first available translation
  return post.translations[0];
};

/**
 * Safe translation getter with default fallback values
 * Guarantees a PostTranslation-compliant object with fallback to slug
 */
export const getTranslationSafe = (post: PostWithTranslations, locale: string): PostTranslation => {
  const translation = getTranslation(post, locale);
  
  if (translation) {
    return translation;
  }
  
  // Safe fallback: full PostTranslation schema with explicit defaults
  return {
    id: `fallback-${post.id}`,
    postId: post.id,
    locale: (locale as 'ko' | 'en' | 'zh'),
    title: post.slug,
    subtitle: null,
    excerpt: null,
    content: null,
    seoTitle: null,
    seoDescription: null,
    seoKeywords: null,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
};

/**
 * Typed helper to extract text meta value
 */
export const getMetaText = (meta: PostMeta[], key: string): string | null => {
  const value = getMetaValue(meta, key);
  return typeof value === 'string' ? value : null;
};

/**
 * Typed helper to extract number meta value
 */
export const getMetaNumber = (meta: PostMeta[], key: string): number | null => {
  const value = getMetaValue(meta, key);
  return typeof value === 'number' ? value : null;
};

/**
 * Typed helper to extract boolean meta value
 */
export const getMetaBoolean = (meta: PostMeta[], key: string): boolean | null => {
  const value = getMetaValue(meta, key);
  return typeof value === 'boolean' ? value : null;
};

/**
 * Typed helper to extract timestamp meta value
 * Returns a Date object if the value is a valid date string or Date
 */
export const getMetaTimestamp = (meta: PostMeta[], key: string): Date | null => {
  const value = getMetaValue(meta, key);
  if (!value) return null;
  
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
};

/**
 * Typed helper to extract JSONB array meta value
 */
export const getMetaArray = <T = any>(meta: PostMeta[], key: string): T[] | null => {
  const value = getMetaValue(meta, key);
  return Array.isArray(value) ? value : null;
};

/**
 * Typed helper to extract JSONB object meta value
 */
export const getMetaObject = <T = any>(meta: PostMeta[], key: string): T | null => {
  const value = getMetaValue(meta, key);
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
};

// ============================================================================
// Event-specific Helpers
// ============================================================================

import { EVENT_META_KEYS } from '@shared/postMetaKeys';

/**
 * Event-specific meta data extractor
 * Provides type-safe access to event meta fields
 */
export interface EventMetaData {
  eventDate: Date | null;
  endDate: Date | null;
  registrationDeadline: Date | null;
  location: string | null;
  category: string | null;
  eventType: string | null;
  capacity: number | null;
  fee: number | null;
  isPublic: boolean | null;
  requiresApproval: boolean | null;
  speakers: any[] | null;
  program: any[] | null;
  images: string[] | null;
}

/**
 * Extract all event meta data from a post
 */
export const getEventMeta = (post: PostWithTranslations): EventMetaData => {
  const meta = post.meta || [];
  
  return {
    eventDate: getMetaTimestamp(meta, EVENT_META_KEYS.eventDate),
    endDate: getMetaTimestamp(meta, EVENT_META_KEYS.endDate),
    registrationDeadline: getMetaTimestamp(meta, EVENT_META_KEYS.registrationDeadline),
    location: getMetaText(meta, EVENT_META_KEYS.location),
    category: getMetaText(meta, EVENT_META_KEYS.category),
    eventType: getMetaText(meta, EVENT_META_KEYS.eventType),
    capacity: getMetaNumber(meta, EVENT_META_KEYS.capacity),
    fee: getMetaNumber(meta, EVENT_META_KEYS.fee),
    isPublic: getMetaBoolean(meta, EVENT_META_KEYS.isPublic),
    requiresApproval: getMetaBoolean(meta, EVENT_META_KEYS.requiresApproval),
    speakers: getMetaArray(meta, EVENT_META_KEYS.speakers),
    program: getMetaArray(meta, EVENT_META_KEYS.program),
    images: getMetaArray<string>(meta, EVENT_META_KEYS.images),
  };
};

/**
 * Type for post with event-specific runtime data
 * This includes computed fields like registrationCount
 */
export type PostWithEventData = PostWithTranslations & {
  registrationCount?: number;
};
