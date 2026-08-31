/**
 * Canonical meta-key schema per postType
 * 
 * This file defines the standard meta keys for each post type
 * to prevent ad-hoc duplication during migration and future writes.
 */

// Meta keys for News posts
export const NEWS_META_KEYS = {
  // Category
  category: 'news.category', // notice, press, activity
  
  // Engagement
  viewCount: 'news.viewCount',
  
  // Images (stored as JSONB array)
  images: 'news.images',
  
  // Videos (stored as JSONB array of URLs)
  videos: 'news.videos',
  
  // Featured image (deprecated - use post.coverImage instead)
  // featuredImage: 'news.featuredImage',
} as const;

// Meta keys for Event posts
export const EVENT_META_KEYS = {
  // Event timing
  eventDate: 'event.eventDate',
  endDate: 'event.endDate',
  registrationDeadline: 'event.registrationDeadline',
  
  // Location (multilingual - use valueText for primary, post_translations for localized)
  location: 'event.location',
  
  // Category & Type
  category: 'event.category', // networking, seminar, workshop, cultural
  eventType: 'event.eventType', // offline, online, hybrid
  
  // Capacity & Registration
  capacity: 'event.capacity',
  fee: 'event.fee',
  
  // Visibility & Approval
  isPublic: 'event.isPublic',
  requiresApproval: 'event.requiresApproval',
  
  // Rich data (JSONB)
  speakers: 'event.speakers', // array of speaker objects
  program: 'event.program', // array of program items
  images: 'event.images', // array of image URLs
} as const;

// Meta keys for Resource posts
export const RESOURCE_META_KEYS = {
  // Category
  category: 'resource.category', // reports, forms, presentations, guides
  
  // File information
  fileUrl: 'resource.fileUrl',
  fileName: 'resource.fileName',
  fileSize: 'resource.fileSize', // in bytes
  fileType: 'resource.fileType', // pdf, docx, xlsx, etc.
  
  // Access control (consider migrating to post.visibility instead)
  accessLevel: 'resource.accessLevel', // public, members, premium
  
  // Engagement
  downloadCount: 'resource.downloadCount',

  // Internal workflow state
  aclSynchronizedAt: 'system.resourceAclSynchronizedAt',
  
  // Status (deprecated - use post.status instead)
  // isActive: 'resource.isActive',
} as const;

export type MetaVisibility = 'public' | 'management' | 'internal';

/**
 * Metadata is deliberately allow-listed.  Public post DTOs include only
 * fields that are needed to render a card or detail page; workflow flags and
 * counters stay available only to management reads.
 */
export const POST_META_VISIBILITY: Record<string, MetaVisibility> = {
  [NEWS_META_KEYS.category]: 'public',
  [NEWS_META_KEYS.images]: 'public',
  [NEWS_META_KEYS.videos]: 'public',
  [NEWS_META_KEYS.viewCount]: 'internal',

  [EVENT_META_KEYS.eventDate]: 'public',
  [EVENT_META_KEYS.endDate]: 'public',
  [EVENT_META_KEYS.registrationDeadline]: 'public',
  [EVENT_META_KEYS.location]: 'public',
  [EVENT_META_KEYS.category]: 'public',
  [EVENT_META_KEYS.eventType]: 'public',
  [EVENT_META_KEYS.capacity]: 'public',
  [EVENT_META_KEYS.fee]: 'public',
  [EVENT_META_KEYS.speakers]: 'public',
  [EVENT_META_KEYS.program]: 'public',
  [EVENT_META_KEYS.images]: 'public',
  [EVENT_META_KEYS.isPublic]: 'management',
  [EVENT_META_KEYS.requiresApproval]: 'management',

  [RESOURCE_META_KEYS.category]: 'public',
  [RESOURCE_META_KEYS.fileUrl]: 'public',
  [RESOURCE_META_KEYS.fileName]: 'public',
  [RESOURCE_META_KEYS.fileSize]: 'public',
  [RESOURCE_META_KEYS.fileType]: 'public',
  [RESOURCE_META_KEYS.accessLevel]: 'public',
  [RESOURCE_META_KEYS.downloadCount]: 'internal',
  [RESOURCE_META_KEYS.aclSynchronizedAt]: 'internal',
};

const META_KEYS_BY_POST_TYPE: Record<string, ReadonlySet<string>> = {
  news: new Set(Object.values(NEWS_META_KEYS)),
  event: new Set(Object.values(EVENT_META_KEYS)),
  resource: new Set(Object.values(RESOURCE_META_KEYS)),
  page: new Set(),
};

// Combined meta keys
export const POST_META_KEYS = {
  news: NEWS_META_KEYS,
  event: EVENT_META_KEYS,
  resource: RESOURCE_META_KEYS,
} as const;

// Type helpers
export type NewsMetaKey = typeof NEWS_META_KEYS[keyof typeof NEWS_META_KEYS];
export type EventMetaKey = typeof EVENT_META_KEYS[keyof typeof EVENT_META_KEYS];
export type ResourceMetaKey = typeof RESOURCE_META_KEYS[keyof typeof RESOURCE_META_KEYS];
export type PostMetaKey = NewsMetaKey | EventMetaKey | ResourceMetaKey;

// Value type mapping helpers
export interface MetaKeyTypeMap {
  // News
  'news.category': 'text';
  'news.viewCount': 'number';
  'news.images': 'json';
  'news.videos': 'json';
  
  // Event
  'event.eventDate': 'timestamp';
  'event.endDate': 'timestamp';
  'event.registrationDeadline': 'timestamp';
  'event.location': 'text';
  'event.category': 'text';
  'event.eventType': 'text';
  'event.capacity': 'number';
  'event.fee': 'number';
  'event.isPublic': 'boolean';
  'event.requiresApproval': 'boolean';
  'event.speakers': 'json';
  'event.program': 'json';
  'event.images': 'json';
  
  // Resource
  'resource.category': 'text';
  'resource.fileUrl': 'text';
  'resource.fileName': 'text';
  'resource.fileSize': 'number';
  'resource.fileType': 'text';
  'resource.accessLevel': 'text';
  'resource.downloadCount': 'number';
  'system.resourceAclSynchronizedAt': 'text';
}

export type MetaValueType = 'text' | 'number' | 'boolean' | 'timestamp' | 'json';

/**
 * Helper to get the appropriate value type for a meta key
 */
export function getMetaValueType(key: string): MetaValueType {
  const typeMap = {
    // Numbers
    viewCount: 'number',
    downloadCount: 'number',
    capacity: 'number',
    fee: 'number',
    fileSize: 'number',
    
    // Timestamps
    eventDate: 'timestamp',
    endDate: 'timestamp',
    registrationDeadline: 'timestamp',
    
    // Booleans
    isPublic: 'boolean',
    requiresApproval: 'boolean',
    
    // JSON
    images: 'json',
    speakers: 'json',
    program: 'json',
  } as const;
  
  // Extract the field name from the key (e.g., 'event.capacity' -> 'capacity')
  const field = key.split('.')[1];
  
  return typeMap[field as keyof typeof typeMap] || 'text';
}

export function isMetaKeyForPostType(postType: string, key: string): boolean {
  return META_KEYS_BY_POST_TYPE[postType]?.has(key) ?? false;
}

export function getMetaVisibility(key: string): MetaVisibility {
  // Unknown keys are never public.  Management reads can still inspect them
  // while administrators repair or migrate old data.
  return POST_META_VISIBILITY[key] || 'internal';
}

export function isPublicMetaKey(postType: string, key: string): boolean {
  return isMetaKeyForPostType(postType, key) && getMetaVisibility(key) === 'public';
}

export function canExposeMetaKey(
  postType: string,
  key: string,
  managementRead: boolean,
): boolean {
  return managementRead || isPublicMetaKey(postType, key);
}

export class PostMetaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PostMetaValidationError';
  }
}

export function validatePostMetaValue(
  postType: string,
  key: string,
  value: unknown,
): void {
  if (!isMetaKeyForPostType(postType, key)) {
    throw new PostMetaValidationError(`Metadata key is not valid for ${postType}: ${key}`);
  }

  if (value === null || value === undefined) {
    throw new PostMetaValidationError(`Metadata value is required for ${key}`);
  }

  const valueType = getMetaValueType(key);
  const valid = valueType === 'text'
    ? typeof value === 'string'
    : valueType === 'number'
      ? typeof value === 'number' && Number.isInteger(value) && Number.isFinite(value)
      : valueType === 'boolean'
        ? typeof value === 'boolean'
        : valueType === 'timestamp'
          ? value instanceof Date && !Number.isNaN(value.getTime())
          : typeof value === 'object' && value !== null;

  if (!valid) {
    throw new PostMetaValidationError(`Metadata value has the wrong type for ${key}`);
  }
}
