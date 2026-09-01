import type { OrganizationMember } from '@shared/schema';
import {
  ORGANIZATION_CATEGORY_LABELS,
  ORGANIZATION_CATEGORY_ORDER,
  type OrganizationCategory,
} from '@shared/organization';
import { Award, Building, Briefcase, GraduationCap, Users, UserCheck, type LucideIcon } from 'lucide-react';

const ORGANIZATION_CATEGORY_PRESENTATION: Record<
  OrganizationCategory,
  { icon: LucideIcon; color: string }
> = {
  executives: {
    icon: Award,
    color: 'bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800',
  },
  honorary: {
    icon: GraduationCap,
    color: 'bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800',
  },
  vicepresidents: {
    icon: Users,
    color: 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
  },
  directors: {
    icon: Briefcase,
    color: 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800',
  },
  advisors: {
    icon: UserCheck,
    color: 'bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800',
  },
  secretariat: {
    icon: Building,
    color: 'bg-sky-100 dark:bg-sky-900/30 border-sky-200 dark:border-sky-800',
  },
  committees: {
    icon: Users,
    color: 'bg-rose-100 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800',
  },
  organizations: {
    icon: Building,
    color: 'bg-slate-100 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800',
  },
};

export const ORGANIZATION_CATEGORY_DISPLAY = ORGANIZATION_CATEGORY_ORDER.map((value) => ({
  value,
  labels: ORGANIZATION_CATEGORY_LABELS[value],
  ...ORGANIZATION_CATEGORY_PRESENTATION[value],
}));

export function getOrganizationCategoryDisplay(category: string) {
  return ORGANIZATION_CATEGORY_DISPLAY.find((item) => item.value === category);
}

export function getMemberName(member: OrganizationMember, language: string): string {
  if (language === 'en' && member.nameEn) return member.nameEn;
  if (language === 'zh' && member.nameZh) return member.nameZh;
  return member.name;
}

export function getMemberPosition(member: OrganizationMember, language: string): string {
  if (language === 'en' && member.positionEn) return member.positionEn;
  if (language === 'zh' && member.positionZh) return member.positionZh;
  return member.position;
}

export function getMemberDescription(member: OrganizationMember, language: string): string | null {
  if (language === 'en' && member.descriptionEn) return member.descriptionEn;
  if (language === 'zh' && member.descriptionZh) return member.descriptionZh;
  return member.description;
}

export function getCategoryLabel(
  category: { labels: { ko: string; en: string; zh: string } },
  language: string,
): string {
  return category.labels[language as keyof typeof category.labels] || category.labels.ko;
}