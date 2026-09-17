import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { and, eq } from "drizzle-orm";
import {
  memberServiceImportBatches,
  memberServiceImportRows,
  memberServiceOrganizationLocalizations,
  memberServiceOrganizations,
} from "@shared/schema";
import { db } from "../server/db";

const SOURCE_SYSTEM = "kscc_initial_seed";
const DEFAULT_INPUT = "attached_assets/KSCC_Korea_China_Organization_Initial_DB_1789554002706.xlsx";
const ALLOWED_VERIFICATION_STATUSES = new Set(["verified_official", "verified_register"]);

type SeedRow = Record<string, string | boolean | null>;

function decodeXml(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");
}

function columnNumber(reference: string) {
  const letters = reference.match(/[A-Z]+/)?.[0] ?? "";
  return letters.split("").reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

function unzipText(file: string, entry: string) {
  return execFileSync("unzip", ["-p", file, entry], { encoding: "utf8" });
}

function readSheet(file: string) {
  const xml = unzipText(file, "xl/worksheets/sheet1.xml");
  const rows = [...xml.matchAll(/<(?:[A-Za-z0-9_]+:)?row\b[^>]*>([\s\S]*?)<\/(?:[A-Za-z0-9_]+:)?row>/g)];
  const parsed = rows.map((rowMatch) => {
    const cells = [...rowMatch[1].matchAll(/<(?:[A-Za-z0-9_]+:)?c\b([^>]*)>([\s\S]*?)<\/(?:[A-Za-z0-9_]+:)?c>/g)];
    const values: string[] = [];
    for (const cell of cells) {
      const reference = cell[1].match(/\br="([^"]+)"/)?.[1] ?? "";
      const value = cell[2].match(/<(?:[A-Za-z0-9_]+:)?v>([\s\S]*?)<\/(?:[A-Za-z0-9_]+:)?v>/)?.[1] ?? "";
      values[columnNumber(reference)] = decodeXml(value);
    }
    return values;
  });

  const headerIndex = parsed.findIndex((row) => row.includes("organization_id"));
  if (headerIndex < 0) throw new Error("The workbook is missing the organization_id header.");

  const headers = parsed[headerIndex];
  return parsed
    .slice(headerIndex + 1)
    .filter((row) => row.some(Boolean))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] || null])))
    .filter((row) => typeof row.organization_id === "string");
}

function parseBoolean(value: unknown) {
  return String(value).toLowerCase() === "true";
}

function parseDate(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const numberValue = Number(value);
  if (Number.isFinite(numberValue)) {
    const excelEpoch = Date.UTC(1899, 11, 30);
    return new Date(excelEpoch + numberValue * 24 * 60 * 60 * 1000);
  }
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function nextReviewAt(lastVerifiedAt: Date | null, status: string) {
  if (!lastVerifiedAt) return null;
  const days = status === "verified_register" ? 365 : 180;
  return new Date(lastVerifiedAt.getTime() + days * 24 * 60 * 60 * 1000);
}

function normalizeRow(raw: Record<string, unknown>): SeedRow {
  const row: SeedRow = {};
  for (const [key, value] of Object.entries(raw)) {
    row[key] = typeof value === "string" ? value.trim() || null : value as SeedRow[string];
  }
  row.is_active = parseBoolean(raw.is_active);
  return row;
}

function reasonCodes(row: SeedRow) {
  const reasons = ["initial_import_requires_operator_review"];
  if (!row.name_ko || !row.organization_id || !row.organization_type || !row.base_country) {
    reasons.push("required_field_missing");
  }
  if (!ALLOWED_VERIFICATION_STATUSES.has(String(row.verification_status))) {
    reasons.push("verification_status_requires_review");
  }
  if (!parseDate(row.last_verified_at)) reasons.push("verification_date_invalid_or_missing");
  if (row.review_note) reasons.push("source_review_note_present");
  if (!row.website_url && !row.contact_url) reasons.push("official_contact_missing");
  return reasons;
}

async function main() {
  const inputArgument = process.argv.slice(2).find((argument) => argument.startsWith("--file="));
  const input = resolve(inputArgument?.slice("--file=".length) || DEFAULT_INPUT);
  const file = readFileSync(input);
  const fileHash = createHash("sha256").update(file).digest("hex");
  const rawRows = readSheet(input);
  const rows = rawRows.map(normalizeRow);

  if (rows.length === 0) throw new Error("The workbook contains no organization rows.");

  const existingBatch = await db
    .select({ id: memberServiceImportBatches.id })
    .from(memberServiceImportBatches)
    .where(and(
      eq(memberServiceImportBatches.sourceSystem, SOURCE_SYSTEM),
      eq(memberServiceImportBatches.sourceFileHash, fileHash),
    ))
    .limit(1);

  if (existingBatch.length > 0) {
    console.log(`Import already staged for ${basename(input)} (${fileHash.slice(0, 12)}).`);
    return;
  }

  await db.transaction(async (tx) => {
    const [batch] = await tx.insert(memberServiceImportBatches).values({
      sourceSystem: SOURCE_SYSTEM,
      sourceFileName: basename(input),
      sourceFileHash: fileHash,
      status: "staged",
    }).returning({ id: memberServiceImportBatches.id });

    for (const row of rows) {
      const sourceRecordKey = String(row.organization_id);
      const verifiedAt = parseDate(row.last_verified_at);
      const [organization] = await tx.insert(memberServiceOrganizations).values({
        sourceSystem: SOURCE_SYSTEM,
        sourceRecordKey,
        organizationType: String(row.organization_type || "unknown"),
        legalForm: row.legal_form as string | null,
        supervisingAuthority: row.supervising_authority as string | null,
        scope: row.scope as string | null,
        baseCountry: String(row.base_country || "UNKNOWN"),
        baseRegion: row.base_region as string | null,
        chinaRegionFocus: row.china_region_focus as string | null,
        primaryDomain: row.primary_domain as string | null,
        summaryKo: row.summary_ko as string | null,
        websiteUrl: row.website_url as string | null,
        contactUrl: row.contact_url as string | null,
        verificationStatus: String(row.verification_status || "needs_review"),
        sourceType: row.source_type as string | null,
        sourceUrl: row.source_url as string | null,
        lastVerifiedAt: verifiedAt,
        nextReviewAt: nextReviewAt(verifiedAt, String(row.verification_status)),
        reviewNote: row.review_note as string | null,
        isActive: Boolean(row.is_active),
        publicApproved: false,
      }).returning({ id: memberServiceOrganizations.id });

      await tx.insert(memberServiceOrganizationLocalizations).values({
        organizationId: organization.id,
        locale: "ko",
        officialName: String(row.name_ko),
        displayName: String(row.name_ko),
        summary: row.summary_ko as string | null,
        isOfficial: false,
      });

      for (const [locale, field] of [["zh", "name_zh"], ["en", "name_en"] as const]) {
        const name = row[field];
        if (typeof name === "string" && name) {
          await tx.insert(memberServiceOrganizationLocalizations).values({
            organizationId: organization.id,
            locale,
            officialName: name,
            displayName: name,
            summary: null,
            isOfficial: false,
          });
        }
      }

      await tx.insert(memberServiceImportRows).values({
        batchId: batch.id,
        sourceRecordKey,
        rawData: row,
        status: "needs_review",
        reasonCodes: reasonCodes(row),
        organizationId: organization.id,
      });
    }
  });

  console.log(`Staged ${rows.length} organizations from ${basename(input)}.`);
  console.log("All organizations remain publicApproved=false until operator verification.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});