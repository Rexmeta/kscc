export const EXECUTIVE_MANAGEMENT_CATEGORIES = [
  'executives',
  'honorary',
  'vicepresidents',
  'directors',
  'advisors',
] as const;

export function isExecutiveManagementCategory(category: string): boolean {
  return (EXECUTIVE_MANAGEMENT_CATEGORIES as readonly string[]).includes(category);
}