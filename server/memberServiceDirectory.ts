import { and, desc, eq, gt, ilike, inArray, isNull, lte, or, sql } from "drizzle-orm";
import {
  memberServiceImportRows,
  memberServiceOrganizationLocalizations,
  memberServiceOrganizations,
  memberServiceOrganizationServices,
  memberServiceOrganizationRegions,
  memberServiceOrganizationContacts,
  memberServiceServices,
  memberServiceRegions,
  memberServiceImportBatches,
  memberServiceReviewAudits,
  memberServiceAuditLogs,
  users,
  type MemberServicePublicOrganization,
} from "@shared/schema";
import { db } from "./db";

export const PUBLIC_VERIFICATION_STATUSES = [
  "verified_official",
  "verified_register",
] as const;

const MAX_PAGE_SIZE = 50;
export const MAX_REVIEW_PAGE_SIZE = 50;
export const REVIEW_QUEUE_LOOKAHEAD_DAYS = 30;

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
    referenceUrl: organization.sourceUrl,
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

  const publicVisibilityWhere = and(
    eq(memberServiceOrganizations.isActive, true),
    eq(memberServiceOrganizations.publicApproved, true),
    inArray(memberServiceOrganizations.verificationStatus, [...PUBLIC_VERIFICATION_STATUSES]),
    or(
      isNull(memberServiceOrganizations.nextReviewAt),
      gt(memberServiceOrganizations.nextReviewAt, new Date()),
    ),
  );
  const filtersWhere = and(
    publicVisibilityWhere,
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

  const [organizations, countRows, categoryRows] = await Promise.all([
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
    db
      .select({ category: memberServiceOrganizations.organizationType })
      .from(memberServiceOrganizations)
      .where(publicVisibilityWhere)
      .groupBy(memberServiceOrganizations.organizationType)
      .orderBy(memberServiceOrganizations.organizationType),
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
    categories: categoryRows.map((row) => row.category),
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
      or(
        isNull(memberServiceOrganizations.nextReviewAt),
        gt(memberServiceOrganizations.nextReviewAt, new Date()),
      ),
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

type AdminDirectoryFilters = DirectoryFilters;

export class MemberServiceVisibilityError extends Error {
  constructor(public readonly reason: "verification_required") {
    super("Organization must have current verification before it can be public.");
    this.name = "MemberServiceVisibilityError";
  }
}

function directorySearchFilter(q?: string) {
  return q
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
}

async function getAdminLocalizations(organizationIds: string[]) {
  if (organizationIds.length === 0) return [];
  return db
    .select()
    .from(memberServiceOrganizationLocalizations)
    .where(inArray(memberServiceOrganizationLocalizations.organizationId, organizationIds))
    .orderBy(memberServiceOrganizationLocalizations.locale);
}

async function getAdminTaxonomyRows(organizationIds: string[]) {
  if (organizationIds.length === 0) return { services: [], regions: [] };
  const [services, regions] = await Promise.all([
    db
      .select({
        id: memberServiceOrganizationServices.id,
        organizationId: memberServiceOrganizationServices.organizationId,
        serviceId: memberServiceOrganizationServices.serviceId,
        rawValue: memberServiceOrganizationServices.rawValue,
        isApproved: memberServiceOrganizationServices.isApproved,
        createdAt: memberServiceOrganizationServices.createdAt,
        code: memberServiceServices.code,
        nameKo: memberServiceServices.nameKo,
        nameEn: memberServiceServices.nameEn,
        nameZh: memberServiceServices.nameZh,
        catalogIsActive: memberServiceServices.isActive,
      })
      .from(memberServiceOrganizationServices)
      .innerJoin(memberServiceServices, eq(
        memberServiceOrganizationServices.serviceId,
        memberServiceServices.id,
      ))
      .where(inArray(memberServiceOrganizationServices.organizationId, organizationIds)),
    db
      .select({
        id: memberServiceOrganizationRegions.id,
        organizationId: memberServiceOrganizationRegions.organizationId,
        regionId: memberServiceOrganizationRegions.regionId,
        rawValue: memberServiceOrganizationRegions.rawValue,
        isApproved: memberServiceOrganizationRegions.isApproved,
        relationScope: memberServiceOrganizationRegions.relationScope,
        createdAt: memberServiceOrganizationRegions.createdAt,
        code: memberServiceRegions.code,
        countryCode: memberServiceRegions.countryCode,
        nameKo: memberServiceRegions.nameKo,
        nameEn: memberServiceRegions.nameEn,
        nameZh: memberServiceRegions.nameZh,
        catalogIsActive: memberServiceRegions.isActive,
      })
      .from(memberServiceOrganizationRegions)
      .innerJoin(memberServiceRegions, eq(
        memberServiceOrganizationRegions.regionId,
        memberServiceRegions.id,
      ))
      .where(inArray(memberServiceOrganizationRegions.organizationId, organizationIds)),
  ]);
  return { services, regions };
}

async function getAdminContacts(organizationIds: string[]) {
  if (organizationIds.length === 0) return [];
  return db
    .select()
    .from(memberServiceOrganizationContacts)
    .where(inArray(memberServiceOrganizationContacts.organizationId, organizationIds))
    .orderBy(memberServiceOrganizationContacts.createdAt);
}

async function getLatestAdminImportRows(organizationIds: string[]) {
  if (organizationIds.length === 0) return [];
  const rows = await db
    .select({
      row: memberServiceImportRows,
      batch: memberServiceImportBatches,
    })
    .from(memberServiceImportRows)
    .leftJoin(
      memberServiceImportBatches,
      eq(memberServiceImportRows.batchId, memberServiceImportBatches.id),
    )
    .where(inArray(memberServiceImportRows.organizationId, organizationIds))
    .orderBy(desc(memberServiceImportRows.createdAt));
  const latestByOrganization = new Map<string, typeof rows[number]>();
  for (const row of rows) {
    const organizationId = row.row.organizationId;
    if (organizationId && !latestByOrganization.has(organizationId)) {
      latestByOrganization.set(organizationId, row);
    }
  }
  return Array.from(latestByOrganization.values());
}

async function getAdminReviewAudits(organizationIds: string[]) {
  if (organizationIds.length === 0) return [];
  return db
    .select({
      audit: memberServiceReviewAudits,
      reviewerName: users.name,
    })
    .from(memberServiceReviewAudits)
    .leftJoin(users, eq(memberServiceReviewAudits.reviewerId, users.id))
    .where(inArray(memberServiceReviewAudits.organizationId, organizationIds))
    .orderBy(desc(memberServiceReviewAudits.createdAt));
}

function toAdminOrganization(
  organization: typeof memberServiceOrganizations.$inferSelect,
  localizations: Array<typeof memberServiceOrganizationLocalizations.$inferSelect>,
  services: Array<Record<string, unknown>>,
  regions: Array<Record<string, unknown>>,
  contacts: Array<typeof memberServiceOrganizationContacts.$inferSelect>,
  importRow: {
    row: typeof memberServiceImportRows.$inferSelect;
    batch: typeof memberServiceImportBatches.$inferSelect | null;
  } | null,
  audits: Array<{
    audit: typeof memberServiceReviewAudits.$inferSelect;
    reviewerName: string | null;
  }>,
) {
  return {
    ...organization,
    createdAt: organization.createdAt.toISOString(),
    updatedAt: organization.updatedAt.toISOString(),
    lastVerifiedAt: organization.lastVerifiedAt?.toISOString() ?? null,
    nextReviewAt: organization.nextReviewAt?.toISOString() ?? null,
    localizations: localizations.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
    services: services.map((row) => ({
      ...row,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    })),
    regions: regions.map((row) => ({
      ...row,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    })),
    contacts: contacts.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      verifiedAt: row.verifiedAt?.toISOString() ?? null,
    })),
    latestImport: importRow
      ? {
        ...importRow.row,
        createdAt: importRow.row.createdAt.toISOString(),
        batch: importRow.batch
          ? {
            ...importRow.batch,
            createdAt: importRow.batch.createdAt.toISOString(),
            completedAt: importRow.batch.completedAt?.toISOString() ?? null,
          }
          : null,
      }
      : null,
    reviewAudits: audits.map(({ audit, reviewerName }) => ({
      ...audit,
      reviewerName,
      createdAt: audit.createdAt.toISOString(),
      verificationDate: audit.verificationDate?.toISOString() ?? null,
    })),
  };
}

async function assembleAdminOrganizations(
  organizations: Array<typeof memberServiceOrganizations.$inferSelect>,
) {
  const ids = organizations.map((organization) => organization.id);
  const [localizations, taxonomy, contacts, importRows, audits] = await Promise.all([
    getAdminLocalizations(ids),
    getAdminTaxonomyRows(ids),
    getAdminContacts(ids),
    getLatestAdminImportRows(ids),
    getAdminReviewAudits(ids),
  ]);
  const importByOrganization = new Map(
    importRows.map((row) => [row.row.organizationId as string, row]),
  );
  return organizations.map((organization) => toAdminOrganization(
    organization,
    localizations.filter((row) => row.organizationId === organization.id),
    taxonomy.services
      .filter((row) => row.organizationId === organization.id)
      .map(({ organizationId: _organizationId, ...row }) => row),
    taxonomy.regions
      .filter((row) => row.organizationId === organization.id)
      .map(({ organizationId: _organizationId, ...row }) => row),
    contacts.filter((row) => row.organizationId === organization.id),
    importByOrganization.get(organization.id) ?? null,
    audits
      .filter((row) => row.audit.organizationId === organization.id),
  ));
}

export async function listAdminOrganizations(filters: AdminDirectoryFilters) {
  const page = Math.max(filters.page, 1);
  const limit = clampPageSize(filters.limit);
  const offset = (page - 1) * limit;
  const q = filters.q?.trim();
  const where = and(
    filters.organizationType
      ? eq(memberServiceOrganizations.organizationType, filters.organizationType)
      : undefined,
    directorySearchFilter(q),
    filters.service
      ? sql`exists (
        select 1
        from ${memberServiceOrganizationServices} filter_service
        inner join ${memberServiceServices} filter_service_catalog
          on filter_service_catalog.id = filter_service.service_id
        where filter_service.organization_id = ${memberServiceOrganizations.id}
          and filter_service_catalog.code = ${filters.service}
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
      )`
      : undefined,
  );
  const [organizations, countRows, categoryRows] = await Promise.all([
    db
      .select()
      .from(memberServiceOrganizations)
      .where(where)
      .orderBy(desc(memberServiceOrganizations.updatedAt), desc(memberServiceOrganizations.id))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(memberServiceOrganizations)
      .where(where),
    db
      .select({ category: memberServiceOrganizations.organizationType })
      .from(memberServiceOrganizations)
      .groupBy(memberServiceOrganizations.organizationType)
      .orderBy(memberServiceOrganizations.organizationType),
  ]);
  const items = await assembleAdminOrganizations(organizations);
  const total = countRows[0]?.count ?? 0;
  return {
    organizations: items,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    categories: categoryRows.map((row) => row.category),
  };
}

export async function getAdminOrganization(id: string) {
  const [organization] = await db
    .select()
    .from(memberServiceOrganizations)
    .where(eq(memberServiceOrganizations.id, id))
    .limit(1);
  if (!organization) return null;
  const [item] = await assembleAdminOrganizations([organization]);
  return item ?? null;
}

export async function setMemberServiceOrganizationVisibility(input: {
  organizationId: string;
  actorId: string;
  visible: boolean;
  correlationId?: string;
}) {
  return db.transaction(async (tx) => {
    const [organization] = await tx
      .select()
      .from(memberServiceOrganizations)
      .where(eq(memberServiceOrganizations.id, input.organizationId))
      .limit(1);
    if (!organization) return null;

    const verificationIsCurrent = PUBLIC_VERIFICATION_STATUSES.includes(
      organization.verificationStatus as typeof PUBLIC_VERIFICATION_STATUSES[number],
    ) && (
      organization.nextReviewAt === null
      || organization.nextReviewAt.getTime() > Date.now()
    );
    if (input.visible && !verificationIsCurrent) {
      throw new MemberServiceVisibilityError("verification_required");
    }

    const [updated] = await tx
      .update(memberServiceOrganizations)
      .set({
        publicApproved: input.visible,
        isActive: input.visible ? true : organization.isActive,
        updatedAt: new Date(),
      })
      .where(eq(memberServiceOrganizations.id, organization.id))
      .returning();

    await tx.insert(memberServiceAuditLogs).values({
      actorId: input.actorId,
      action: "member_service.organization.visibility_updated",
      entityType: "member_service_organization",
      entityId: organization.id,
      before: {
        publicApproved: organization.publicApproved,
        isActive: organization.isActive,
      },
      after: {
        publicApproved: updated.publicApproved,
        isActive: updated.isActive,
      },
      correlationId: input.correlationId,
    });
    return updated;
  });
}

type ReviewQueueFilters = {
  page: number;
  limit: number;
};

type ReviewAuditHistoryFilters = ReviewQueueFilters;

type ReviewDecision = "approve" | "limit" | "reject";
type ReviewReason = "new_submission" | "verification_expired" | "verification_due_soon";

export type MemberServiceReviewInput = {
  organizationId: string;
  reviewerId: string;
  decision: ReviewDecision;
  evidenceUrl?: string;
  verificationDate?: Date;
  note?: string;
  correlationId?: string;
};

function clampReviewPageSize(limit: number) {
  return Math.min(Math.max(limit, 1), MAX_REVIEW_PAGE_SIZE);
}

function reviewQueueWhere() {
  const reviewCutoff = new Date(
    Date.now() + REVIEW_QUEUE_LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000,
  );
  return and(
    or(
      and(
        eq(memberServiceOrganizations.publicApproved, false),
        sql`exists (
          select 1
          from ${memberServiceImportRows} staged_row
          where staged_row.organization_id = ${memberServiceOrganizations.id}
            and staged_row.status = 'needs_review'
        )`,
      ),
      and(
        eq(memberServiceOrganizations.publicApproved, true),
        inArray(memberServiceOrganizations.verificationStatus, [...PUBLIC_VERIFICATION_STATUSES]),
        lte(memberServiceOrganizations.nextReviewAt, reviewCutoff),
      ),
    ),
  );
}

function toReviewOrganization(
  organization: typeof memberServiceOrganizations.$inferSelect,
  importRow: typeof memberServiceImportRows.$inferSelect | null,
  localizations: Array<{
    locale: "ko" | "en" | "zh";
    officialName: string;
    displayName: string | null;
    summary: string | null;
    isOfficial: boolean;
  }>,
) {
  return {
    id: organization.id,
    sourceRecordKey: organization.sourceRecordKey,
    organizationType: organization.organizationType,
    legalForm: organization.legalForm,
    supervisingAuthority: organization.supervisingAuthority,
    scope: organization.scope,
    baseCountry: organization.baseCountry,
    baseRegion: organization.baseRegion,
    chinaRegionFocus: organization.chinaRegionFocus,
    primaryDomain: organization.primaryDomain,
    summaryKo: organization.summaryKo,
    websiteUrl: organization.websiteUrl,
    contactUrl: organization.contactUrl,
    verificationStatus: organization.verificationStatus,
    sourceType: organization.sourceType,
    sourceUrl: organization.sourceUrl,
    lastVerifiedAt: organization.lastVerifiedAt?.toISOString() ?? null,
    nextReviewAt: organization.nextReviewAt?.toISOString() ?? null,
    isActive: organization.isActive,
    publicApproved: organization.publicApproved,
    reviewReason: organization.publicApproved
      ? (organization.nextReviewAt && organization.nextReviewAt <= new Date()
        ? "verification_expired"
        : "verification_due_soon") as ReviewReason
      : "new_submission" as ReviewReason,
    reviewNote: organization.reviewNote,
    createdAt: organization.createdAt.toISOString(),
    updatedAt: organization.updatedAt.toISOString(),
    localizations,
    import: importRow
      ? {
        id: importRow.id,
        sourceRecordKey: importRow.sourceRecordKey,
        rawData: importRow.rawData,
        status: importRow.status,
        reasonCodes: importRow.reasonCodes,
        createdAt: importRow.createdAt.toISOString(),
      }
      : null,
  };
}

async function getReviewLocalizations(organizationIds: string[]) {
  if (organizationIds.length === 0) return [];
  return db
    .select({
      organizationId: memberServiceOrganizationLocalizations.organizationId,
      locale: memberServiceOrganizationLocalizations.locale,
      officialName: memberServiceOrganizationLocalizations.officialName,
      displayName: memberServiceOrganizationLocalizations.displayName,
      summary: memberServiceOrganizationLocalizations.summary,
      isOfficial: memberServiceOrganizationLocalizations.isOfficial,
    })
    .from(memberServiceOrganizationLocalizations)
    .where(inArray(memberServiceOrganizationLocalizations.organizationId, organizationIds));
}

async function getLatestImportRows(organizationIds: string[], status?: string) {
  if (organizationIds.length === 0) return [];
  const rows = await db
    .select()
    .from(memberServiceImportRows)
    .where(and(
      inArray(memberServiceImportRows.organizationId, organizationIds),
      status ? eq(memberServiceImportRows.status, status) : undefined,
    ))
    .orderBy(desc(memberServiceImportRows.createdAt));
  const latestByOrganization = new Map<string, typeof rows[number]>();
  for (const row of rows) {
    if (row.organizationId && !latestByOrganization.has(row.organizationId)) {
      latestByOrganization.set(row.organizationId, row);
    }
  }
  return Array.from(latestByOrganization.values());
}

export async function listMemberServiceReviewQueue(filters: ReviewQueueFilters) {
  const page = Math.max(filters.page, 1);
  const limit = clampReviewPageSize(filters.limit);
  const offset = (page - 1) * limit;
  const where = reviewQueueWhere();

  const [organizations, countRows] = await Promise.all([
    db
      .select()
      .from(memberServiceOrganizations)
      .where(where)
      .orderBy(
        sql`case when ${memberServiceOrganizations.publicApproved} = true then 0 else 1 end`,
        memberServiceOrganizations.nextReviewAt,
        memberServiceOrganizations.createdAt,
        memberServiceOrganizations.id,
      )
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(memberServiceOrganizations)
      .where(where),
  ]);

  const ids = organizations.map((organization) => organization.id);
  const [localizations, importRows] = await Promise.all([
    getReviewLocalizations(ids),
    getLatestImportRows(ids, "needs_review"),
  ]);
  const importByOrganization = new Map(
    importRows
      .filter((row) => row.organizationId)
      .map((row) => [row.organizationId as string, row]),
  );
  const items = organizations.map((organization) => toReviewOrganization(
    organization,
    importByOrganization.get(organization.id) ?? null,
    localizations
      .filter((row) => row.organizationId === organization.id)
      .map(({ organizationId: _organizationId, ...row }) => row),
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

export async function getMemberServiceOrganizationReview(id: string) {
  const [organization] = await db
    .select()
    .from(memberServiceOrganizations)
    .where(eq(memberServiceOrganizations.id, id))
    .limit(1);
  if (!organization) return null;

  const [localizations, importRows] = await Promise.all([
    getReviewLocalizations([id]),
    getLatestImportRows([id]),
  ]);

  return {
    organization: toReviewOrganization(
      organization,
      importRows[0] ?? null,
      localizations
        .filter((row) => row.organizationId === organization.id)
        .map(({ organizationId: _organizationId, ...row }) => row),
    ),
  };
}

export async function listMemberServiceReviewAuditHistory(
  filters: ReviewAuditHistoryFilters,
) {
  const page = Math.max(filters.page, 1);
  const limit = clampReviewPageSize(filters.limit);
  const offset = (page - 1) * limit;
  const [audits, countRows] = await Promise.all([
    db
      .select({
        id: memberServiceReviewAudits.id,
        organizationId: memberServiceReviewAudits.organizationId,
        sourceRecordKey: memberServiceOrganizations.sourceRecordKey,
        organizationName: memberServiceOrganizationLocalizations.displayName,
        organizationOfficialName: memberServiceOrganizationLocalizations.officialName,
        decision: memberServiceReviewAudits.decision,
        reviewerId: memberServiceReviewAudits.reviewerId,
        reviewerName: users.name,
        evidenceUrl: memberServiceReviewAudits.evidenceUrl,
        verificationDate: memberServiceReviewAudits.verificationDate,
        publicApproved: memberServiceReviewAudits.publicApproved,
        note: memberServiceReviewAudits.note,
        correlationId: memberServiceReviewAudits.correlationId,
        createdAt: memberServiceReviewAudits.createdAt,
      })
      .from(memberServiceReviewAudits)
      .innerJoin(
        memberServiceOrganizations,
        eq(memberServiceReviewAudits.organizationId, memberServiceOrganizations.id),
      )
      .leftJoin(
        memberServiceOrganizationLocalizations,
        and(
          eq(memberServiceOrganizationLocalizations.organizationId, memberServiceOrganizations.id),
          eq(memberServiceOrganizationLocalizations.locale, "ko"),
        ),
      )
      .leftJoin(users, eq(memberServiceReviewAudits.reviewerId, users.id))
      .orderBy(desc(memberServiceReviewAudits.createdAt), desc(memberServiceReviewAudits.id))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(memberServiceReviewAudits),
  ]);

  return {
    audits: audits.map((audit) => ({
      ...audit,
      organizationName: audit.organizationName ?? audit.organizationOfficialName,
      verificationDate: audit.verificationDate?.toISOString() ?? null,
      createdAt: audit.createdAt.toISOString(),
    })),
    total: countRows[0]?.count ?? 0,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil((countRows[0]?.count ?? 0) / limit)),
  };
}

function nextReviewDate(verificationDate: Date, verificationStatus: string) {
  const days = verificationStatus === "verified_register" ? 365 : 180;
  return new Date(verificationDate.getTime() + days * 24 * 60 * 60 * 1000);
}

export async function reviewMemberServiceOrganization(input: MemberServiceReviewInput) {
  return db.transaction(async (tx) => {
    const reviewCutoff = new Date(
      Date.now() + REVIEW_QUEUE_LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000,
    );
    const [organization] = await tx
      .select()
      .from(memberServiceOrganizations)
      .where(and(
        eq(memberServiceOrganizations.id, input.organizationId),
        or(
          and(
            eq(memberServiceOrganizations.publicApproved, false),
            sql`exists (
              select 1
              from ${memberServiceImportRows} staged_row
              where staged_row.organization_id = ${memberServiceOrganizations.id}
                and staged_row.status = 'needs_review'
            )`,
          ),
          and(
            eq(memberServiceOrganizations.publicApproved, true),
            inArray(memberServiceOrganizations.verificationStatus, [...PUBLIC_VERIFICATION_STATUSES]),
            lte(memberServiceOrganizations.nextReviewAt, reviewCutoff),
          ),
        ),
      ))
      .limit(1);
    if (!organization) return null;

    const publicApproved = input.decision === "approve";
    const verificationStatus = input.decision === "approve"
      ? (["verified_official", "verified_register"].includes(organization.verificationStatus)
        ? organization.verificationStatus
        : "verified_official")
      : input.decision === "limit" ? "limited" : "rejected";
    const verificationDate = input.verificationDate ?? organization.lastVerifiedAt;
    const updatedValues = {
      verificationStatus,
      sourceUrl: input.evidenceUrl ?? organization.sourceUrl,
      lastVerifiedAt: verificationDate,
      nextReviewAt: publicApproved && verificationDate
        ? nextReviewDate(verificationDate, verificationStatus)
        : null,
      reviewNote: input.note ?? organization.reviewNote,
      isActive: input.decision === "reject" ? false : true,
      publicApproved,
      updatedAt: new Date(),
    };
    const [updated] = await tx
      .update(memberServiceOrganizations)
      .set(updatedValues)
      .where(eq(memberServiceOrganizations.id, organization.id))
      .returning();

    if (!organization.publicApproved) {
      await tx
        .update(memberServiceImportRows)
        .set({ status: input.decision === "approve" ? "approved" : input.decision === "limit" ? "limited" : "rejected" })
        .where(and(
          eq(memberServiceImportRows.organizationId, organization.id),
          eq(memberServiceImportRows.status, "needs_review"),
        ));
    }

    await tx.insert(memberServiceReviewAudits).values({
      organizationId: organization.id,
      reviewerId: input.reviewerId,
      decision: input.decision,
      evidenceUrl: input.evidenceUrl ?? organization.sourceUrl,
      verificationDate,
      publicApproved,
      note: input.note ?? null,
      beforeState: {
        verificationStatus: organization.verificationStatus,
        sourceUrl: organization.sourceUrl,
        lastVerifiedAt: organization.lastVerifiedAt?.toISOString() ?? null,
        isActive: organization.isActive,
        publicApproved: organization.publicApproved,
      },
      afterState: {
        verificationStatus: updated.verificationStatus,
        sourceUrl: updated.sourceUrl,
        lastVerifiedAt: updated.lastVerifiedAt?.toISOString() ?? null,
        isActive: updated.isActive,
        publicApproved: updated.publicApproved,
      },
      correlationId: input.correlationId,
    });

    return updated;
  });
}