import { z } from 'zod';

export const EXECUTIVE_MANAGEMENT_CATEGORIES = [
  'executives',
  'honorary',
  'vicepresidents',
  'directors',
  'advisors',
] as const;

export const ORGANIZATION_CATEGORY_ORDER = [
  'executives',
  'honorary',
  'vicepresidents',
  'secretary_office',
  'directors',
  'advisors',
  'secretariat',
  'committees',
  'organizations',
] as const;

export const organizationCategorySchema = z.enum(ORGANIZATION_CATEGORY_ORDER);

export type OrganizationCategory = (typeof ORGANIZATION_CATEGORY_ORDER)[number];

export const ORGANIZATION_CATEGORY_LABELS: Record<
  OrganizationCategory,
  { ko: string; en: string; zh: string }
> = {
  executives: { ko: '임원진', en: 'Executives', zh: '管理层' },
  honorary: { ko: '명예직', en: 'Honorary', zh: '荣誉职位' },
  vicepresidents: { ko: '부회장', en: 'Vice Presidents', zh: '副会长' },
  secretary_office: { ko: '비서실', en: 'Secretary Office', zh: '秘书室' },
  directors: { ko: '이사', en: 'Directors', zh: '理事' },
  advisors: { ko: '고문', en: 'Advisors', zh: '顾问' },
  secretariat: { ko: '사무국', en: 'Secretariat', zh: '秘书处' },
  committees: { ko: '위원회', en: 'Committees', zh: '委员会' },
  organizations: { ko: '단체회원', en: 'Organization Members', zh: '团体会员' },
};

export function compareOrganizationMembers(
  a: { sortOrder: number; name: string; id: string },
  b: { sortOrder: number; name: string; id: string },
): number {
  return (
    a.sortOrder - b.sortOrder
    || a.name.localeCompare(b.name, 'ko')
    || a.id.localeCompare(b.id)
  );
}

export function sortOrganizationMembers<T extends { sortOrder: number; name: string; id: string }>(
  members: T[],
): T[] {
  return [...members].sort(compareOrganizationMembers);
}

export function isExecutiveManagementCategory(category: string): boolean {
  return (EXECUTIVE_MANAGEMENT_CATEGORIES as readonly string[]).includes(category);
}