import type { Express, Request, Response } from "express";
import {
  absoluteUrl,
  buildLlmsTxt,
  buildRobotsTxt,
  buildSitemapXml,
  getLanguageFromUrl,
  getSeoPageKey,
  INDEXABLE_STATIC_PATHS,
  localizedPath,
  NO_INDEX_PATH_PREFIXES,
  SEO_LANGUAGES,
  SEO_PAGE_METADATA,
  SITE_LOGO_PATH,
  SITE_NAME,
  type SeoLanguage,
  type SitemapEntry,
} from "@shared/seo";
import type { PostMeta, PostWithTranslations } from "@shared/schema";
import { EVENT_META_KEYS } from "@shared/postMetaKeys";
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

function getDateValue(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value !== "string" && typeof value !== "number") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function absoluteImageUrl(origin: string, image: string | null | undefined): string {
  return image
    ? image.startsWith("http") ? image : absoluteUrl(origin, image)
    : absoluteUrl(origin, SITE_LOGO_PATH);
}

function getPostImage(post: PostWithTranslations): string | null {
  if (post.coverImage) return post.coverImage;
  const imageKey = post.postType === "news" ? "news.images" : "event.images";
  const images = getMetaValue(post.meta || [], imageKey);
  return Array.isArray(images) && typeof images[0] === "string" ? images[0] : null;
}

const DETAIL_BREADCRUMB_LABELS: Record<SeoLanguage, { news: string; events: string }> = {
  ko: { news: "최신 소식", events: "다가오는 행사" },
  en: { news: "Latest News", events: "Upcoming Events" },
  zh: { news: "最新消息", events: "即将举行的活动" },
};

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
  const image = absoluteImageUrl(origin, postImage);
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: DETAIL_BREADCRUMB_LABELS[language][postPath],
        item: absoluteUrl(origin, localizedPath(`/${postPath}`, language)),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: titleText,
        item: canonicalUrl,
      },
    ],
  };

  if (post.postType === "news") {
    return {
      title,
      description,
      image,
      canonicalPath,
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: translation?.seoTitle || titleText,
          description,
          url: canonicalUrl,
          mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl },
          image: postImage ? [image] : undefined,
          datePublished: post.publishedAt || post.createdAt,
          dateModified: post.updatedAt,
          inLanguage: language,
          author: { "@type": "Organization", name: SITE_NAME },
          publisher: { "@type": "Organization", name: SITE_NAME },
        },
        breadcrumb,
      ],
    };
  }

  const meta = post.meta || [];
  const eventDate = getDateValue(getMetaValue(meta, EVENT_META_KEYS.eventDate));
  const endDate = getDateValue(getMetaValue(meta, EVENT_META_KEYS.endDate));
  const fee = getMetaValue(meta, EVENT_META_KEYS.fee);
  const eventType = getMetaValue(meta, EVENT_META_KEYS.eventType);
  const location = getMetaValue(meta, EVENT_META_KEYS.location);

  return {
    title,
    description,
    image,
    canonicalPath,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Event",
        name: translation?.seoTitle || titleText,
        description,
        url: canonicalUrl,
        image: postImage ? [image] : undefined,
        startDate: eventDate?.toISOString(),
        endDate: endDate?.toISOString(),
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: eventType === "online"
          ? "https://schema.org/OnlineEventAttendanceMode"
          : eventType === "hybrid"
            ? "https://schema.org/MixedEventAttendanceMode"
            : "https://schema.org/OfflineEventAttendanceMode",
        location: eventType === "online"
          ? { "@type": "VirtualLocation", url: canonicalUrl }
          : { "@type": "Place", name: typeof location === "string" && location ? location : "KSCC event venue" },
        organizer: { "@type": "Organization", name: SITE_NAME },
        offers: typeof fee === "number"
          ? { "@type": "Offer", price: fee, priceCurrency: "KRW", url: canonicalUrl }
          : undefined,
        inLanguage: language,
      },
      breadcrumb,
    ],
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
    ...(!noIndex ? jsonLd.map((value) => `<script type="application/ld+json">${serializeJsonLd(value)}</script>`) : []),
  ].join("\n");
}

function isNoIndexPath(pathname: string): boolean {
  return !pathname || NO_INDEX_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
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
  const fallback: InitialSeo = {
    title: metadata?.title || SITE_NAME,
    description: metadata?.description || "",
    image: absoluteUrl(origin, SITE_LOGO_PATH),
    type: "website",
    canonicalPath: pathname,
    language,
    noIndex: !page || isNoIndexPath(pathname),
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
  return markerPattern.test(template)
    ? template.replace(markerPattern, replacement)
    : template.replace("</head>", `${replacement}\n</head>`);
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

export function registerSeoRoutes(app: Express): void {
  app.get("/robots.txt", (req: Request, res: Response) => {
    const origin = getSiteOrigin(req);
    res
      .type("text/plain")
      .set("Cache-Control", "public, max-age=3600")
      .send(buildRobotsTxt(absoluteUrl(origin, "/sitemap.xml")));
  });

  app.get("/llms.txt", (req: Request, res: Response) => {
    res
      .type("text/plain")
      .set("Cache-Control", "public, max-age=3600")
      .send(buildLlmsTxt(getSiteOrigin(req)));
  });

  app.get("/sitemap.xml", async (req: Request, res: Response) => {
    try {
      const origin = getSiteOrigin(req);
      const entries = [...getStaticEntries(origin), ...(await getPublicPostEntries(origin))];
      res
        .type("application/xml")
        .set("Cache-Control", "public, max-age=900")
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