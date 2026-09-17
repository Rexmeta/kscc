import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import {
  memberServiceOrganizationLocalizations,
  memberServiceOrganizations,
  memberServiceOrganizationServices,
  memberServiceOrganizationRegions,
  memberServiceServices,
  memberServiceRegions,
  type MemberServicePublicOrganization,
} from "@shared/schema";
import { db } from "./db";

export const PUBLIC_VERIFICATION_STATUSES = [
  "verified_official",
  "verified_register",
] as const;

const MAX_PAGE_SIZE = 50;

type DirectoryFilters = {
  q?: string;
  service?: string;
  region?: string;
  organizationType?: string;
  language?: "ko" | "en" | "zh";
  page: number;
  limit: number;
};

function clampPageSize(limit: number) {
  return Math.min(Math.max(limit, 1), MAX_PAGE_SIZE);
}

function localizedValue(
  rows: Array<{ locale: "ko" | "en" | "zh"; officialName: string; displayName: string | null; summary: string | null }>,
  requested: "ko" | "en" | "zh",
) {
  return rows.find((row) => row.locale === requested)
    ?? rows.find((row) => row.locale === "ko")
    ?? rows[0]
    ?? null;
}

async function getLocalizationRows(organizationIds: string[]) {
  if (organizationIds.length === 0) return [];
  return db
    .select({
      organizationId: memberServiceOrganizationLocalizations.organizationId,
      locale: memberServiceOrganizationLocalizations.locale,
      officialName: memberServiceOrganizationLocalizations.officialName,
      displayName: memberServiceOrganizationLocalizations.displayName,
      summary: memberServiceOrganizationLocalizations.summary,
    })
    .from(memberServiceOrganizationLocalizations)
    .where(inArray(memberServiceOrganizationLocalizations.organizationId, organizationIds));
}

async function getTaxonomyRows(organizationIds: string[]) {
  if (organizationIds.length === 0) {
    return { services: [], regions: [] };
  }

  const [services, regions] = await Promise.all([
    db
      .select({
        organizationId: memberServiceOrganizationServices.organizationId,
        code: memberServiceServices.code,
        nameKo: memberServiceServices.nameKo,
        nameEn: memberServiceServices.nameEn,
        nameZh: memberServiceServices.nameZh,
      })
      .from(memberServiceOrganizationServices)
      .innerJoin(
        memberServiceServices,
        eq(memberServiceOrganizationServices.serviceId, memberServiceServices.id),
      )
      .where(and(
        inArray(memberServiceOrganizationServices.organizationId, organizationIds),
        eq(memberServiceOrganizationServices.isApproved, true),
        eq(memberServiceServices.isActive, true),
      )),
    db
      .select({
        organizationId: memberServiceOrganizationRegions.organizationId,
        code: memberServiceRegions.code,
        countryCode: memberServiceRegions.countryCode,
        nameKo: memberServiceRegions.nameKo,
        nameEn: memberServiceRegions.nameEn,
        nameZh: memberServiceRegions.nameZh,
        relationScope: memberServiceOrganizationRegions.relationScope,
      })
      .from(memberServiceOrganizationRegions)
      .innerJoin(
        memberServiceRegions,
        eq(memberServiceOrganizationRegions.regionId, memberServiceRegions.id),
      )
      .where(and(
        inArray(memberServiceOrganizationRegions.organizationId, organizationIds),
        eq(memberServiceOrganizationRegions.isApproved, true),
        eq(memberServiceRegions.isActive, true),
      )),
  ]);

  return { services, regions };
}

function toPublicOrganization(
  organization: typeof memberServiceOrganizations.$inferSelect,
  localizations: Array<{
    locale: "ko" | "en" | "zh";
    officialName: string;
    displayName: string | null;
    summary: string | null;
  }>,
  services: Array<{
    code: string;
    nameKo: string;
    nameEn: string | null;
    nameZh: string | null;
  }>,
  regions: Array<{
    code: string;
    countryCode: string;
    nameKo: string;
    nameEn: string | null;
    nameZh: string | null;
    relationScope: string;
  }>,
  language: "ko" | "en" | "zh",
): MemberServicePublicOrganization & {
  services: typeof services;
  regions: typeof regions;
} {
  const localized = localizedValue(localizations, language);

  return {
    id: organization.id,
    name: localized?.displayName || localized?.officialName || organization.sourceRecordKey,
    alternateNames: localizations
      .filter((row) => row.officialName !== localized?.officialName)
      .map((row) => row.displayName || row.officialName),
    summary: localized?.summary || organization.summaryKo,
    organizationType: organization.organizationType,
    baseCountry: organization.baseCountry,
    baseRegion: organization.baseRegion,
    chinaRegionFocus: organization.chinaRegionFocus,
    websiteUrl: organization.websiteUrl,
    contactUrl: organization.contactUrl,
    verification: {
      status: organization.verificationStatus,
      lastVerifiedAt: organization.lastVerifiedAt?.toISOString() ?? null,
      nextReviewAt: organization.nextReviewAt?.toISOString() ?? null,
    },
    services,
    regions,
  };
}

export async function listPublicOrganizations(filters: DirectoryFilters) {
  const page = Math.max(filters.page, 1);
  const limit = clampPageSize(filters.limit);
  const offset = (page - 1) * limit;
  const language = filters.language ?? "ko";
  const q = filters.q?.trim();

  const searchFilter = q
    ? or(
      ilike(memberServiceOrganizations.primaryDomain, `%${q}%`),
      ilike(memberServiceOrganizations.summaryKo, `%${q}%`),
      ilike(memberServiceOrganizations.baseRegion, `%${q}%`),
      ilike(memberServiceOrganizations.chinaRegionFocus, `%${q}%`),
      sql`exists (
        select 1
        from ${memberServiceOrganizationLocalizations} search_localization
        where search_localization.organization_id = ${memberServiceOrganizations.id}
          and (
            search_localization.official_name ilike ${`%${q}%`}
            or search_localization.display_name ilike ${`%${q}%`}
          )
      )`,
    )
    : undefined;

  const filtersWhere = and(
    eq(memberServiceOrganizations.isActive, true),
    eq(memberServiceOrganizations.publicApproved, true),
    inArray(memberServiceOrganizations.verificationStatus, [...PUBLIC_VERIFICATION_STATUSES]),
    filters.organizationType
      ? eq(memberServiceOrganizations.organizationType, filters.organizationType)
      : undefined,
    searchFilter,
    filters.service
      ? sql`exists (
        select 1
        from ${memberServiceOrganizationServices} filter_service
        inner join ${memberServiceServices} filter_service_catalog
          on filter_service_catalog.id = filter_service.service_id
        where filter_service.organization_id = ${memberServiceOrganizations.id}
          and filter_service_catalog.code = ${filters.service}
          and filter_service.is_approved = true
      )`
      : undefined,
    filters.region
      ? sql`exists (
        select 1
        from ${memberServiceOrganizationRegions} filter_region
        inner join ${memberServiceRegions} filter_region_catalog
          on filter_region_catalog.id = filter_region.region_id
        where filter_region.organization_id = ${memberServiceOrganizations.id}
          and filter_region_catalog.code = ${filters.region}
          and filter_region.is_approved = true
      )`
      : undefined,
  );

  const [organizations, countRows] = await Promise.all([
    db
      .select()
      .from(memberServiceOrganizations)
      .where(filtersWhere)
      .orderBy(desc(memberServiceOrganizations.updatedAt), desc(memberServiceOrganizations.id))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(memberServiceOrganizations)
      .where(filtersWhere),
  ]);

  const ids = organizations.map((organization) => organization.id);
  const [localizations, taxonomy] = await Promise.all([
    getLocalizationRows(ids),
    getTaxonomyRows(ids),
  ]);
  const items = organizations.map((organization) => toPublicOrganization(
    organization,
    localizations.filter((row) => row.organizationId === organization.id),
    taxonomy.services.filter((row) => row.organizationId === organization.id),
    taxonomy.regions.filter((row) => row.organizationId === organization.id),
    language,
  ));
  const total = countRows[0]?.count ?? 0;

  return {
    organizations: items,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getPublicOrganization(id: string, language: "ko" | "en" | "zh" = "ko") {
  const [organization] = await db
    .select()
    .from(memberServiceOrganizations)
    .where(and(
      eq(memberServiceOrganizations.id, id),
      eq(memberServiceOrganizations.isActive, true),
      eq(memberServiceOrganizations.publicApproved, true),
      inArray(memberServiceOrganizations.verificationStatus, [...PUBLIC_VERIFICATION_STATUSES]),
    ))
    .limit(1);

  if (!organization) return null;

  const [localizations, taxonomy] = await Promise.all([
    getLocalizationRows([organization.id]),
    getTaxonomyRows([organization.id]),
  ]);

  return toPublicOrganization(
    organization,
    localizations
      .filter((row) => row.organizationId === organization.id)
      .map(({ organizationId: _organizationId, ...row }) => row),
    taxonomy.services
      .filter((row) => row.organizationId === organization.id)
      .map(({ organizationId: _organizationId, ...row }) => row),
    taxonomy.regions
      .filter((row) => row.organizationId === organization.id)
      .map(({ organizationId: _organizationId, ...row }) => row),
    language,
  );
}