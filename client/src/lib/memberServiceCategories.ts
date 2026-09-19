import type { Language } from './i18n';

export const MEMBER_SERVICE_CATEGORY_LABELS: Record<string, Record<Language, string>> = {
  '경제·비즈니스': { ko: '경제·비즈니스', en: 'Economy & Business', zh: '经济与商业' },
  '문화·교육': { ko: '문화·교육', en: 'Culture & Education', zh: '文化与教育' },
  '교류·협력': { ko: '교류·협력', en: 'Exchange & Cooperation', zh: '交流与合作' },
  '법률·연구': { ko: '법률·연구', en: 'Law & Research', zh: '法律与研究' },
  '산업': { ko: '산업', en: 'Industry', zh: '产业' },
};

export function memberServiceCategoryLabel(category: string, language: Language) {
  return MEMBER_SERVICE_CATEGORY_LABELS[category]?.[language] ?? category;
}