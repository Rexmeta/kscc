import type { PostWithTranslations, PostMeta, InsertPost, InsertPostTranslation, InsertPostMeta } from '@shared/schema';
import { NEWS_META_KEYS, EVENT_META_KEYS, RESOURCE_META_KEYS } from '@shared/postMetaKeys';
import { nanoid } from 'nanoid';

// Utility to create slug from title
function createSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);
}

// ============================================
// NEWS MAPPERS
// ============================================

export interface NewsFormData {
  title: string;
  excerpt: string;
  content: string;
  category: string;
  featuredImage?: string;
  images?: string[];
  isPublished: boolean;
  publishedAt?: Date | string | null;
}

export function mapNewsFormToPost(formData: NewsFormData, authorId: string): {
  post: Omit<InsertPost, 'id'>;
  translation: Omit<InsertPostTranslation, 'id' | 'postId'>;
  meta: Omit<InsertPostMeta, 'id' | 'postId'>[];
} {
  const slug = createSlug(formData.title);
  
  return {
    post: {
      postType: 'news',
      slug,
      authorId,
      status: formData.isPublished ? 'published' : 'draft',
      visibility: 'public',
      isFeatured: false,
      tags: [formData.category],
      // Preserve existing publishedAt when editing, or use current time for new published articles
      publishedAt: formData.isPublished 
        ? (formData.publishedAt ? new Date(formData.publishedAt) : new Date())
        : null,
      coverImage: formData.featuredImage || null,
    },
    translation: {
      locale: 'ko',
      title: formData.title,
      excerpt: formData.excerpt,
      content: formData.content,
    },
    meta: [
      {
        key: NEWS_META_KEYS.category,
        valueText: formData.category,
        valueNumber: null,
        valueBoolean: null,
        valueTimestamp: null,
        value: null,
      },
      ...(formData.images && formData.images.length > 0 ? [{
        key: NEWS_META_KEYS.images,
        valueText: null,
        valueNumber: null,
        valueBoolean: null,
        valueTimestamp: null,
        value: formData.images,
      }] : []),
    ],
  };
}

export function mapPostToNewsForm(post: PostWithTranslations): NewsFormData {
  const translation = post.translations.find(t => t.locale === 'ko') || post.translations[0];
  const meta = post.meta || [];
  
  const getMetaValue = (key: string): any => {
    const item = meta.find(m => m.key === key);
    if (!item) return null;
    return item.valueText || item.valueNumber || item.valueBoolean || item.valueTimestamp || item.value || null;
  };
  
  return {
    title: translation?.title || post.slug,
    excerpt: translation?.excerpt || '',
    content: translation?.content || '',
    category: getMetaValue(NEWS_META_KEYS.category) || (post.tags && post.tags[0]) || '',
    featuredImage: post.coverImage || '',
    images: getMetaValue(NEWS_META_KEYS.images) || [],
    isPublished: post.status === 'published',
    publishedAt: post.publishedAt,
  };
}

// ============================================
// EVENT MAPPERS
// ============================================

export interface EventFormData {
  title: string;
  description: string;
  content?: string;
  eventDate: string;
  endDate?: string;
  location: string;
  category: string;
  eventType: string;
  capacity?: number;
  fee?: number;
  registrationDeadline?: string;
  images?: string[];
  isPublic: boolean;
}

export function mapEventFormToPost(formData: EventFormData, authorId: string): {
  post: Omit<InsertPost, 'id'>;
  translation: Omit<InsertPostTranslation, 'id' | 'postId'>;
  meta: Omit<InsertPostMeta, 'id' | 'postId'>[];
} {
  const slug = createSlug(formData.title);
  
  return {
    post: {
      postType: 'event',
      slug,
      authorId,
      status: 'published',
      visibility: formData.isPublic ? 'public' : 'members',
      isFeatured: false,
      tags: [formData.category],
      publishedAt: new Date(),
    },
    translation: {
      locale: 'ko',
      title: formData.title,
      excerpt: formData.description,
      content: formData.content || '',
    },
    meta: [
      {
        key: EVENT_META_KEYS.eventDate,
        valueText: null,
        valueNumber: null,
        valueBoolean: null,
        valueTimestamp: new Date(formData.eventDate),
        value: null,
      },
      ...(formData.endDate ? [{
        key: EVENT_META_KEYS.endDate,
        valueText: null,
        valueNumber: null,
        valueBoolean: null,
        valueTimestamp: new Date(formData.endDate),
        value: null,
      }] : []),
      {
        key: EVENT_META_KEYS.location,
        valueText: formData.location,
        valueNumber: null,
        valueBoolean: null,
        valueTimestamp: null,
        value: null,
      },
      {
        key: EVENT_META_KEYS.category,
        valueText: formData.category,
        valueNumber: null,
        valueBoolean: null,
        valueTimestamp: null,
        value: null,
      },
      {
        key: EVENT_META_KEYS.eventType,
        valueText: formData.eventType,
        valueNumber: null,
        valueBoolean: null,
        valueTimestamp: null,
        value: null,
      },
      ...(formData.capacity ? [{
        key: EVENT_META_KEYS.capacity,
        valueText: null,
        valueNumber: formData.capacity,
        valueBoolean: null,
        valueTimestamp: null,
        value: null,
      }] : []),
      {
        key: EVENT_META_KEYS.fee,
        valueText: formData.fee?.toString() || '0',
        valueNumber: null,
        valueBoolean: null,
        valueTimestamp: null,
        value: null,
      },
      ...(formData.registrationDeadline ? [{
        key: EVENT_META_KEYS.registrationDeadline,
        valueText: null,
        valueNumber: null,
        valueBoolean: null,
        valueTimestamp: new Date(formData.registrationDeadline),
        value: null,
      }] : []),
      ...(formData.images && formData.images.length > 0 ? [{
        key: EVENT_META_KEYS.images,
        valueText: null,
        valueNumber: null,
        valueBoolean: null,
        valueTimestamp: null,
        value: formData.images,
      }] : []),
    ],
  };
}

export function mapPostToEventForm(post: PostWithTranslations): EventFormData {
  const translation = post.translations.find(t => t.locale === 'ko') || post.translations[0];
  const meta = post.meta || [];
  
  const getMetaValue = (key: string): any => {
    const item = meta.find(m => m.key === key);
    if (!item) return null;
    return item.valueText || item.valueNumber || item.valueBoolean || item.valueTimestamp || item.value || null;
  };
  
  return {
    title: translation?.title || post.slug,
    description: translation?.excerpt || '',
    content: translation?.content || '',
    eventDate: getMetaValue(EVENT_META_KEYS.eventDate) || '',
    endDate: getMetaValue(EVENT_META_KEYS.endDate) || undefined,
    location: getMetaValue(EVENT_META_KEYS.location) || '',
    category: getMetaValue(EVENT_META_KEYS.category) || (post.tags && post.tags[0]) || '',
    eventType: getMetaValue(EVENT_META_KEYS.eventType) || 'offline',
    capacity: getMetaValue(EVENT_META_KEYS.capacity) || undefined,
    fee: parseInt(getMetaValue(EVENT_META_KEYS.fee) || '0'),
    registrationDeadline: getMetaValue(EVENT_META_KEYS.registrationDeadline) || undefined,
    images: getMetaValue(EVENT_META_KEYS.images) || [],
    isPublic: post.visibility === 'public',
  };
}

// ============================================
// RESOURCE MAPPERS
// ============================================

export interface ResourceFormData {
  title: string;
  description?: string;
  category: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  accessLevel: string;
  isActive: boolean;
}

export function mapResourceFormToPost(formData: ResourceFormData, authorId: string): {
  post: Omit<InsertPost, 'id'>;
  translation: Omit<InsertPostTranslation, 'id' | 'postId'>;
  meta: Omit<InsertPostMeta, 'id' | 'postId'>[];
} {
  const slug = createSlug(formData.title);
  
  // Map accessLevel to visibility
  const visibilityMap: Record<string, 'public' | 'members' | 'premium' | 'internal'> = {
    'public': 'public',
    'members': 'members',
    'premium': 'premium',
    'private': 'internal',
  };
  
  return {
    post: {
      postType: 'resource',
      slug,
      authorId,
      status: formData.isActive ? 'published' : 'draft',
      visibility: visibilityMap[formData.accessLevel] || 'public',
      isFeatured: false,
      tags: [formData.category],
      publishedAt: formData.isActive ? new Date() : null,
    },
    translation: {
      locale: 'ko',
      title: formData.title,
      excerpt: formData.description || '',
      content: '',
    },
    meta: [
      {
        key: RESOURCE_META_KEYS.category,
        valueText: formData.category,
        valueNumber: null,
        valueBoolean: null,
        valueTimestamp: null,
        value: null,
      },
      {
        key: RESOURCE_META_KEYS.fileUrl,
        valueText: formData.fileUrl,
        valueNumber: null,
        valueBoolean: null,
        valueTimestamp: null,
        value: null,
      },
      {
        key: RESOURCE_META_KEYS.fileName,
        valueText: formData.fileName,
        valueNumber: null,
        valueBoolean: null,
        valueTimestamp: null,
        value: null,
      },
      {
        key: RESOURCE_META_KEYS.fileType,
        valueText: formData.fileType,
        valueNumber: null,
        valueBoolean: null,
        valueTimestamp: null,
        value: null,
      },
      {
        key: RESOURCE_META_KEYS.accessLevel,
        valueText: formData.accessLevel,
        valueNumber: null,
        valueBoolean: null,
        valueTimestamp: null,
        value: null,
      },
    ],
  };
}

export function mapPostToResourceForm(post: PostWithTranslations): ResourceFormData {
  const translation = post.translations.find(t => t.locale === 'ko') || post.translations[0];
  const meta = post.meta || [];
  
  const getMetaValue = (key: string): any => {
    const item = meta.find(m => m.key === key);
    if (!item) return null;
    return item.valueText || item.valueNumber || item.valueBoolean || item.valueTimestamp || item.value || null;
  };
  
  return {
    title: translation?.title || post.slug,
    description: translation?.excerpt || '',
    category: getMetaValue(RESOURCE_META_KEYS.category) || (post.tags && post.tags[0]) || '',
    fileUrl: getMetaValue(RESOURCE_META_KEYS.fileUrl) || '',
    fileName: getMetaValue(RESOURCE_META_KEYS.fileName) || '',
    fileType: getMetaValue(RESOURCE_META_KEYS.fileType) || '',
    accessLevel: getMetaValue(RESOURCE_META_KEYS.accessLevel) || 'public',
    isActive: post.status === 'published',
  };
}
