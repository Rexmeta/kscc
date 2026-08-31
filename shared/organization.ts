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
  'directors',
  'advisors',
  'secretariat',
  'committees',
  'organizations',
] as const;

export type OrganizationCategory = (typeof ORGANIZATION_CATEGORY_ORDER)[number];

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