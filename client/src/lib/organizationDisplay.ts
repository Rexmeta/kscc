import type { OrganizationMember } from '@shared/schema';
import { Award, Building, Briefcase, GraduationCap, Users, UserCheck } from 'lucide-react';

export const ORGANIZATION_CATEGORY_DISPLAY = [
  {
    value: 'executives',
    labels: { ko: '임원진', en: 'Executives', zh: '管理层' },
    icon: Award,
    color: 'bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800',
  },
  {
    value: 'honorary',
    labels: { ko: '명예직', en: 'Honorary', zh: '荣誉职位' },
    icon: GraduationCap,
    color: 'bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800',
  },
  {
    value: 'vicepresidents',
    labels: { ko: '부회장', en: 'Vice Presidents', zh: '副会长' },
    icon: Users,
    color: 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
  },
  {
    value: 'directors',
    labels: { ko: '이사', en: 'Directors', zh: '理事' },
    icon: Briefcase,
    color: 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800',
  },
  {
    value: 'advisors',
    labels: { ko: '고문', en: 'Advisors', zh: '顾问' },
    icon: UserCheck,
    color: 'bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800',
  },
  {
    value: 'secretariat',
    labels: { ko: '사무국', en: 'Secretariat', zh: '秘书处' },
    icon: Building,
    color: 'bg-sky-100 dark:bg-sky-900/30 border-sky-200 dark:border-sky-800',
  },
  {
    value: 'committees',
    labels: { ko: '위원회', en: 'Committees', zh: '委员会' },
    icon: Users,
    color: 'bg-rose-100 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800',
  },
  {
    value: 'organizations',
    labels: { ko: '단체회원', en: 'Organization Members', zh: '团体会员' },
    icon: Building,
    color: 'bg-slate-100 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800',
  },
] as const;

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