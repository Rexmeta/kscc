import type { Express, Request, Response } from "express";
import {
  absoluteUrl,
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  buildEventJsonLd,
  buildLlmsTxt,
  buildRobotsTxt,
  buildSitemapXml,
  buildStaticSeoJsonLd,
  getLanguageFromUrl,
  getSeoPageKey,
  INDEXABLE_STATIC_PATHS,
  isNoIndexPath,
  localizedPath,
  normalizeSeoPathname,
  publicUrl,
  SEO_LANGUAGES,
  SEO_DETAIL_BREADCRUMB_LABELS,
  SEO_PAGE_METADATA,
  SITE_LOGO_PATH,
  SITE_NAME,
  type LlmsContentEntry,
  type SeoLanguage,
  type SitemapEntry,
} from "@shared/seo";
import type { PostMeta, PostWithTranslations } from "@shared/schema";
import { EVENT_META_KEYS } from "@shared/postMetaKeys";
import { parseEventDateTime } from "@shared/eventDateTime";
import { publicPostAccess } from "./postAccess";
import { storage } from "./storage";
import { emitOperationalEvent, getCorrelationId } from "./telemetry";
const SITEMAP_POST_TYPES = ["news", "event"] as const;
const SITEMAP_PAGE_SIZE = 100;
const SEO_HEAD_START = "<!-- SEO_HEAD_START -->";
const SEO_HEAD_END = "<!-- SEO_HEAD_END -->";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getSiteOrigin(req: Request): string {
  const configuredOrigin = process.env.PUBLIC_SITE_URL?.trim();
  if (configuredOrigin) {
    try {
      const url = new URL(configuredOrigin);
      if (url.protocol === "http:" || url.protocol === "https:") {
        return url.origin;
      }
    } catch {
      // Fall back to the current request origin when configuration is invalid.
    }
  }

  const forwardedHost = req.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || req.get("host");
  const forwardedProto = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProto || req.protocol;
  return `${protocol}://${host || "localhost:5000"}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getMetaValue(meta: PostMeta[], key: string): unknown {
  const item = meta.find((entry) => entry.key === key);
  if (!item) return undefined;
  if (item.valueText !== null) return item.valueText;
  if (item.valueNumber !== null) return item.valueNumber;
  if (item.valueBoolean !== null) return item.valueBoolean;
  if (item.valueTimestamp !== null) return item.valueTimestamp;
  return item.value ?? undefined;
}

function getTranslation(post: PostWithTranslations, locale: SeoLanguage) {
  return post.translations.find((translation) => translation.locale === locale)
    || post.translations.find((translation) => translation.locale === post.primaryLocale)
    || post.translations[0]
    || null;
}
function absoluteImageUrl(origin: string, image: string | null | undefined): string {
  return publicUrl(origin, image) || absoluteUrl(origin, SITE_LOGO_PATH);
}

function getPostImage(post: PostWithTranslations): string | null {
  if (post.coverImage) return post.coverImage;
  const imageKey = post.postType === "news" ? "news.images" : "event.images";
  const images = getMetaValue(post.meta || [], imageKey);
  return Array.isArray(images) && typeof images[0] === "string" ? images[0] : null;
}
function getDetailSeo(
  post: PostWithTranslations,
  postPath: "news" | "events",
  language: SeoLanguage,
  origin: string,
): {
  title: string;
  description: string;
  image: string;
  canonicalPath: string;
  jsonLd: Array<Record<string, unknown>>;
} {
  const translation = getTranslation(post, language);
  const titleText = translation?.title || post.slug;
  const title = translation?.seoTitle || `${titleText} | ${SITE_NAME}`;
  const description = translation?.seoDescription || translation?.excerpt || "";
  const canonicalPath = `/${postPath}/${post.slug}`;
  const canonicalUrl = absoluteUrl(origin, localizedPath(canonicalPath, language));
  const postImage = getPostImage(post);
  const postImageUrl = publicUrl(origin, postImage);
  const image = postImageUrl || absoluteUrl(origin, SITE_LOGO_PATH);
  const breadcrumb = buildBreadcrumbJsonLd([
    {
      name: SEO_DETAIL_BREADCRUMB_LABELS[language][postPath],
      url: absoluteUrl(origin, localizedPath(`/${postPath}`, language)),
    },
    { name: titleText, url: canonicalUrl },
  ]);
  const commonJsonLd = buildStaticSeoJsonLd({
    origin,
    language,
    canonicalUrl,
    name: title,
    description,
  }).filter((value) => value["@type"] !== "BreadcrumbList");

  if (post.postType === "news") {
    return {
      title,
      description,
      image,
      canonicalPath,
      jsonLd: [
        ...commonJsonLd,
        buildArticleJsonLd({
          origin,
          language,
          canonicalUrl,
          headline: translation?.seoTitle || titleText,
          description,
          image: postImageUrl,
          datePublished: post.publishedAt,
          dateModified: post.updatedAt,
        }),
        breadcrumb,
      ],
    };
  }

  const meta = post.meta || [];
  const eventDate = parseEventDateTime(getMetaValue(meta, EVENT_META_KEYS.eventDate));
  const parsedEndDate = parseEventDateTime(getMetaValue(meta, EVENT_META_KEYS.endDate));
  const endDate = eventDate && parsedEndDate && parsedEndDate >= eventDate
    ? parsedEndDate
    : null;
  const fee = getMetaValue(meta, EVENT_META_KEYS.fee);
  const eventType = getMetaValue(meta, EVENT_META_KEYS.eventType);
  const location = getMetaValue(meta, EVENT_META_KEYS.location);
  const validEventType = eventType === "online" || eventType === "offline" || eventType === "hybrid"
    ? eventType
    : null;
  const validLocation = typeof location === "string" && location.trim()
    ? { "@type": "Place", name: location.trim() }
    : undefined;
  const validFee = typeof fee === "number" && Number.isFinite(fee) && fee >= 0
    ? fee
    : undefined;
  const eventJsonLd = eventDate
    ? buildEventJsonLd({
        origin,
        language,
        canonicalUrl,
        name: translation?.seoTitle || titleText,
        description,
        image: postImageUrl,
        startDate: eventDate,
        endDate,
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: validEventType === "online"
          ? "https://schema.org/OnlineEventAttendanceMode"
          : validEventType === "hybrid"
            ? "https://schema.org/MixedEventAttendanceMode"
            : validEventType === "offline"
              ? "https://schema.org/OfflineEventAttendanceMode"
              : undefined,
        // There is no event access URL in the CMS. Do not use the article
        // URL as a made-up virtual venue.
        location: validEventType === "online" ? undefined : validLocation,
        price: validFee,
      })
    : null;

  return {
    title,
    description,
    image,
    canonicalPath,
    // An event without a valid start date is still a public page, but it is
    // not emitted as an Event entity because schema.org would be misleading.
    jsonLd: [...commonJsonLd, ...(eventJsonLd ? [eventJsonLd] : []), breadcrumb],
  };
}

function serializeJsonLd(value: Record<string, unknown>): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

function buildSeoHead(options: {
  title: string;
  description: string;
  image: string;
  type: "website" | "article";
  canonicalUrl: string;
  language: SeoLanguage;
  noIndex: boolean;
  jsonLd?: Array<Record<string, unknown>>;
}): string {
  const {
    title,
    description,
    image,
    type,
    canonicalUrl,
    language,
    noIndex,
    jsonLd = [],
  } = options;
  const locale = language === "zh" ? "zh_CN" : language === "ko" ? "ko_KR" : "en_US";
  const alternateLinks = [
    ...SEO_LANGUAGES.map((alternateLanguage) =>
      `<link rel="alternate" hreflang="${alternateLanguage}" href="${escapeHtml(
        absoluteUrl(new URL(canonicalUrl).origin, localizedPath(new URL(canonicalUrl).pathname.replace(/\/$/, ""), alternateLanguage)),
      )}" data-seo-alternate="true" />`
    ),
    `<link rel="alternate" hreflang="x-default" href="${escapeHtml(
      absoluteUrl(new URL(canonicalUrl).origin, localizedPath(new URL(canonicalUrl).pathname.replace(/\/$/, ""), "ko")),
    )}" data-seo-alternate="true" />`,
  ].join("\n");

  return [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<meta name="robots" content="${noIndex ? "noindex,nofollow" : "index,follow"}" />`,
    `<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />`,
    `<meta property="og:type" content="${type}" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`,
    `<meta property="og:locale" content="${locale}" />`,
    `<meta property="og:image" content="${escapeHtml(image)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(image)}" />`,
    `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`,
    alternateLinks,
    ...(!noIndex
      ? jsonLd.map(
          (value) =>
            `<script type="application/ld+json" data-seo-jsonld="true">${serializeJsonLd(value)}</script>`,
        )
      : []),
  ].join("\n");
}

function getRequestPathname(req: Request): string {
  const requestUrl = req.originalUrl || req.url;
  if (!requestUrl) return req.path || "/";

  try {
    return new URL(requestUrl, "http://localhost").pathname || "/";
  } catch {
    return req.path || "/";
  }
}

async function findPublicDetailPost(
  postPath: "news" | "events",
  identifier: string,
  language: SeoLanguage,
): Promise<PostWithTranslations | undefined> {
  const postType = postPath === "news" ? "news" : "event";
  const bySlug = await storage.getPostBySlugWithTranslations(identifier, language, publicPostAccess);
  if (bySlug?.postType === postType) return bySlug;

  // Existing event and a few legacy news links use the post ID instead of the
  // slug. Only query by ID when the identifier has UUID form so malformed URLs
  // cannot turn into database errors.
  if (UUID_PATTERN.test(identifier)) {
    const byId = await storage.getPostWithTranslations(identifier, language, publicPostAccess);
    if (byId?.postType === postType) return byId;
  }
  return undefined;
}

interface InitialSeo {
  title: string;
  description: string;
  image: string;
  type: "website" | "article";
  canonicalPath: string;
  language: SeoLanguage;
  noIndex: boolean;
  jsonLd?: Array<Record<string, unknown>>;
}

export async function getInitialSeo(req: Request): Promise<InitialSeo> {
  const origin = getSiteOrigin(req);
  const pathname = getRequestPathname(req);
  const language = getLanguageFromUrl(req.originalUrl);
  const page = getSeoPageKey(pathname);
  const detailMatch = pathname.match(/^\/(news|events)\/([^/]+)\/?$/);
  const detailPath = detailMatch?.[1] as "news" | "events" | undefined;
  const detailIdentifier = detailMatch?.[2];
  const metadata = page ? SEO_PAGE_METADATA[language][page] : undefined;
  const staticCanonicalUrl = absoluteUrl(origin, localizedPath(pathname, language));
  const staticJsonLd = page
    ? buildStaticSeoJsonLd({
        origin,
        language,
        canonicalUrl: staticCanonicalUrl,
        name: metadata?.title || SITE_NAME,
        description: metadata?.description,
        breadcrumbs: page === "home"
          ? []
          : [
              {
                name: SEO_PAGE_METADATA[language].home.title,
                url: absoluteUrl(origin, localizedPath("/", language)),
              },
              {
                name: metadata?.title || SITE_NAME,
                url: staticCanonicalUrl,
              },
            ],
      })
    : undefined;
  const fallback: InitialSeo = {
    title: metadata?.title || SITE_NAME,
    description: metadata?.description || "",
    image: absoluteUrl(origin, SITE_LOGO_PATH),
    type: "website",
    canonicalPath: normalizeSeoPathname(pathname),
    language,
    noIndex: !page || isNoIndexPath(pathname),
    jsonLd: staticJsonLd,
  };

  if (!detailPath || !detailIdentifier) return fallback;

  let identifier: string;
  try {
    identifier = decodeURIComponent(detailIdentifier);
  } catch {
    return { ...fallback, noIndex: true };
  }

  try {
    const post = await findPublicDetailPost(detailPath, identifier, language);
    if (!post) return { ...fallback, noIndex: true };

    const detail = getDetailSeo(post, detailPath, language, origin);
    return {
      ...detail,
      type: post.postType === "news" ? "article" : "website",
      language,
      noIndex: false,
    };
  } catch (error) {
    // A metadata lookup must never prevent the app shell from loading, and a
    // failed lookup must fail closed so an unknown page is not indexable.
    emitOperationalEvent("seo.operation", "error", {
      correlationId: getCorrelationId(req),
      operation: "detail_metadata",
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return { ...fallback, noIndex: true };
  }
}

export async function renderSeoDocument(req: Request, template: string): Promise<string> {
  const seo = await getInitialSeo(req);
  const origin = getSiteOrigin(req);
  const canonicalUrl = absoluteUrl(origin, localizedPath(seo.canonicalPath, seo.language));
  const head = buildSeoHead({
    title: seo.title,
    description: seo.description,
    image: seo.image,
    type: seo.type,
    canonicalUrl,
    language: seo.language,
    noIndex: seo.noIndex,
    jsonLd: seo.jsonLd,
  });
  const replacement = `${SEO_HEAD_START}\n${head}\n${SEO_HEAD_END}`;
  const markerPattern = new RegExp(`${SEO_HEAD_START}[\\s\\S]*?${SEO_HEAD_END}`);
  const documentWithSeoHead = markerPattern.test(template)
    ? template.replace(markerPattern, replacement)
    : template.replace("</head>", `${replacement}\n</head>`);
  return documentWithSeoHead.replace(
    /<html(\s[^>]*)?\slang="[^"]*"/i,
    (_match, attributes = "") => `<html${attributes} lang="${seo.language}"`,
  );
}

function postLocales(post: { primaryLocale: string; translations: Array<{ locale: string }> }): SeoLanguage[] {
  const available = post.translations
    .map((translation) => translation.locale)
    .filter((locale): locale is SeoLanguage =>
      SEO_LANGUAGES.includes(locale as SeoLanguage),
    );
  const locales = available.length > 0 ? available : [post.primaryLocale as SeoLanguage];
  return SEO_LANGUAGES.filter((language) => locales.includes(language));
}

async function getPublicPostEntries(origin: string): Promise<SitemapEntry[]> {
  const entries: SitemapEntry[] = [];

  for (const postType of SITEMAP_POST_TYPES) {
    let offset = 0;
    while (true) {
      const result = await storage.getPosts({
        postType,
        status: "published",
        visibility: "public",
        locale: undefined,
        compact: true,
        limit: SITEMAP_PAGE_SIZE,
        offset,
        access: publicPostAccess,
      });

      for (const post of result.posts) {
        if (!post.slug) continue;
        const postPath = postType === "news" ? "news" : "events";
        const locales = postLocales(post);
        for (const language of locales) {
          entries.push({
            loc: absoluteUrl(
              origin,
              localizedPath(`/${postPath}/${encodeURIComponent(post.slug)}`, language),
            ),
            lastmod: post.updatedAt || post.publishedAt,
            changefreq: "weekly",
            priority: 0.7,
          });
        }
      }

      offset += result.posts.length;
      if (result.posts.length === 0 || offset >= result.total) break;
    }
  }

  return entries;
}

function getStaticEntries(origin: string): SitemapEntry[] {
  return INDEXABLE_STATIC_PATHS.flatMap((pathname) =>
    SEO_LANGUAGES.map((language) => ({
      loc: absoluteUrl(origin, localizedPath(pathname, language)),
      changefreq: pathname === "/" ? "daily" as const : "weekly" as const,
      priority: pathname === "/" ? 1 : 0.6,
    })),
  );
}

const LLMS_POST_LIMIT = 3;
export function registerSeoRoutes(app: Express): void {
  app.get("/robots.txt", (req: Request, res: Response) => {
    const origin = getSiteOrigin(req);
    res
      .type("text/plain")
      .set("Cache-Control", "public, max-age=3600")
      .send(buildRobotsTxt(absoluteUrl(origin, "/sitemap.xml")));
  });

  app.get("/llms.txt", async (req: Request, res: Response) => {
    const origin = getSiteOrigin(req);
    try {
      const entries = await getPublicLlmsEntries(origin);
      res
        .type("text/plain")
        .set("Cache-Control", "no-store")
        .send(buildLlmsTxt(origin, entries));
    } catch (error) {
      // The AI guidance document remains valid and contains only official
      // static pages when a content lookup is temporarily unavailable.
      emitOperationalEvent("seo.operation", "error", {
        correlationId: getCorrelationId(req),
        operation: "llms",
        errorType: error instanceof Error ? error.name : "UnknownError",
      });
      res
        .type("text/plain")
        .set("Cache-Control", "no-store")
        .send(buildLlmsTxt(origin));
    }
  });

  app.get("/sitemap.xml", async (req: Request, res: Response) => {
    try {
      const origin = getSiteOrigin(req);
      const entries = [...getStaticEntries(origin), ...(await getPublicPostEntries(origin))];
      res
        .type("application/xml")
        .set("Cache-Control", "no-store")
        .send(buildSitemapXml(entries));
    } catch (error) {
      emitOperationalEvent("seo.operation", "error", {
        correlationId: getCorrelationId(req),
        operation: "sitemap",
        errorType: error instanceof Error ? error.name : "UnknownError",
      });
      res.status(503).type("text/plain").send("Sitemap temporarily unavailable");
    }
  });
}

async function getPublicLlmsEntries(origin: string): Promise<LlmsContentEntry[]> {
  const entries: LlmsContentEntry[] = [];

  for (const language of SEO_LANGUAGES) {
    for (const postType of SITEMAP_POST_TYPES) {
      const result = await storage.getPosts({
        postType,
        status: "published",
        visibility: "public",
        locale: language,
        compact: true,
        limit: LLMS_POST_LIMIT,
        access: publicPostAccess,
      });
      for (const post of result.posts) {
        if (!post.slug) continue;
        // Do not label a fallback-language title as if it were translated.
        // Detail pages may fall back for continuity, but llms.txt must remain
        // explicit about which language its answer-source text represents.
        const translation = post.translations.find(({ locale }) => locale === language);
        if (!translation) continue;
        const postPath = postType === "news" ? "news" : "events";
        const eventDate = postType === "event"
          ? parseEventDateTime(getMetaValue(post.meta || [], EVENT_META_KEYS.eventDate))
          : null;
        entries.push({
          kind: postType,
          language,
          title: translation.seoTitle || translation.title || post.slug,
          summary: translation.seoDescription || translation.excerpt || translation.subtitle || undefined,
          date: postType === "event" ? eventDate || post.publishedAt : post.publishedAt,
          url: absoluteUrl(
            origin,
            localizedPath(`/${postPath}/${encodeURIComponent(post.slug)}`, language),
          ),
        });
      }
    }
  }

  return entries;
}
