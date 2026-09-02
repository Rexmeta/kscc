import { z } from 'zod';
import {
  ORGANIZATION_CATEGORY_LABELS,
  organizationCategorySchema,
} from '@shared/organization';

export const newsSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요'),
  excerpt: z.string().min(1, '요약을 입력해주세요'),
  content: z.string().optional(),
  category: z.string().optional(),
  featuredImage: z.string().optional(),
  images: z.array(z.string()).optional(),
  isPublished: z.boolean().optional().default(false),
  publishedAt: z.string().optional(),
});
export type NewsFormValues = z.infer<typeof newsSchema>;

export const eventSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요'),
  description: z.string().min(1, '설명을 입력해주세요'),
  content: z.string().optional(),
  eventDate: z.string().min(1, '날짜를 선택해주세요'),
  endDate: z.string().optional(),
  location: z.string().min(1, '장소를 입력해주세요'),
  category: z.string().min(1, '카테고리를 선택해주세요'),
  eventType: z.string().default('offline'),
  capacity: z.number().optional().or(z.nan()).transform((val) => Number.isNaN(val) ? undefined : val),
  fee: z.number().optional().or(z.nan()).transform((val) => Number.isNaN(val) ? 0 : val),
  registrationDeadline: z.string().optional(),
  images: z.array(z.string()).optional(),
  isPublic: z.boolean().default(true),
  isPublished: z.boolean().default(true),
});
export type EventFormValues = z.infer<typeof eventSchema>;

export const resourceSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요'),
  excerpt: z.string().optional(),
  content: z.string().optional(),
  category: z.string().min(1, '카테고리를 선택해주세요'),
  tags: z.array(z.string()).optional(),
  fileUrl: z.string().optional(),
  visibility: z.enum(['public', 'members', 'premium']).default('public'),
  isPublished: z.boolean().default(false),
});
export type ResourceFormValues = z.infer<typeof resourceSchema>;

export const RESOURCE_CATEGORY_OPTIONS = [
  { value: 'reports', label: '보고서' },
  { value: 'forms', label: '양식' },
  { value: 'presentations', label: '발표자료' },
  { value: 'guides', label: '가이드북' },
] as const;

export const memberSchema = z.object({
  companyName: z.string(),
  industry: z.string(),
  country: z.string(),
  city: z.string(),
  address: z.string(),
  phone: z.string().optional(),
  website: z.string().optional(),
  description: z.string().optional(),
  logo: z.string().optional(),
  membershipLevel: z.string(),
  membershipStatus: z.enum(['pending', 'active', 'inactive']),
  isPublic: z.boolean(),
  contactPerson: z.string(),
  contactEmail: z.string().email(),
});
export type MemberFormValues = z.infer<typeof memberSchema>;

export const organizationMemberSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요'),
  nameEn: z.string().optional(),
  nameZh: z.string().optional(),
  position: z.string().min(1, '직책을 입력해주세요'),
  positionEn: z.string().optional(),
  positionZh: z.string().optional(),
  category: z.string().min(1, '카테고리를 선택해주세요'),
  photo: z.string().optional(),
  description: z.string().optional(),
  descriptionEn: z.string().optional(),
  descriptionZh: z.string().optional(),
  sortOrder: z.number().default(0),
  isActive: z.boolean().default(true),
});
export type OrganizationMemberFormValues = z.infer<typeof organizationMemberSchema>;

export const ORGANIZATION_CATEGORIES = [
  ...organizationCategorySchema.options.map((value) => ({
    value,
    label: ORGANIZATION_CATEGORY_LABELS[value].ko,
  })),
];
