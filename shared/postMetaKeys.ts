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
  
  // Status (deprecated - use post.status instead)
  // isActive: 'resource.isActive',
} as const;

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
