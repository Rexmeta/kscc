import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildArticleJsonLd,
  buildEventJsonLd,
  buildLlmsTxt,
  buildRobotsTxt,
  buildSitemapXml,
  buildStaticSeoJsonLd,
  getLanguageFromUrl,
  getSeoPageKey,
  INDEXABLE_STATIC_PATHS,
  isPubliclyIndexablePost,
  isNoIndexPath,
  localizedPath,
  normalizeSeoPathname,
  organizationId,
  SEO_LANGUAGES,
  SEO_PAGE_METADATA,
  SITE_NAME,
} from "@shared/seo";
import type { PostWithTranslations } from "@shared/schema";
import { publicPostAccess } from "./postAccess";
import { storage } from "./storage";
import { getInitialSeo, renderSeoDocument } from "./seo";

test("SEO language URLs resolve only supported languages", () => {
  assert.equal(getLanguageFromUrl("/news?lang=en"), "en");
  assert.equal(getLanguageFromUrl("/news?lang=zh"), "zh");
  assert.equal(getLanguageFromUrl("/news?lang=fr"), "ko");
  assert.equal(getLanguageFromUrl("/news"), "ko");
  assert.equal(localizedPath("/partners/", "en"), "/partners?lang=en");
  assert.equal(getSeoPageKey("/events/spring-networking"), "events");
  assert.equal(getSeoPageKey("/partners/"), "partners");
  assert.equal(getSeoPageKey("/admin"), null);
});

test("SEO route matrix keeps public and protected paths aligned", () => {
  assert.deepEqual(INDEXABLE_STATIC_PATHS, [
    "/",
    "/about",
    "/organization",
    "/news",
    "/events",
    "/partners",
    "/contact",
    "/privacy",
    "/terms",
  ]);
  assert.equal(isNoIndexPath("/members"), true);
  assert.equal(isNoIndexPath("/members/filter"), true);
  assert.equal(isNoIndexPath("/resources"), true);
  assert.equal(isNoIndexPath("/dashboard"), true);
  assert.equal(isNoIndexPath("/partners"), false);
  assert.equal(normalizeSeoPathname("/partners///"), "/partners");
  assert.deepEqual(SEO_LANGUAGES.map((language) => SEO_PAGE_METADATA[language].partners.title), [
    "협력 파트너 | 한국 사천-충칭 총상회",
    "Partners | Korea-Sichuan-Chongqing Chamber",
    "合作伙伴 | 韩国四川-重庆总商会",
  ]);
});

test("shared JSON-LD contract describes every supported public language", () => {
  for (const language of ["ko", "en", "zh"] as const) {
    const canonicalUrl = `https://example.com/about?lang=${language}`;
    const graph = buildStaticSeoJsonLd({
      origin: "https://example.com",
      language,
      canonicalUrl,
      name: "About the Chamber",
      description: "Public description",
      breadcrumbs: [{ name: "Home", url: `https://example.com/?lang=${language}` }],
    });

    assert.deepEqual(graph.map((item) => item["@type"]), [
      "Organization",
      "WebSite",
      "WebPage",
      "BreadcrumbList",
    ]);
    assert.equal(graph[0]["@id"], organizationId("https://example.com"));
    assert.equal(graph[1].publisher["@id"], organizationId("https://example.com"));
    assert.equal(graph[2].url, canonicalUrl);
    assert.equal(graph[2].inLanguage, language);
  }
});

test("Article and Event JSON-LD omit guesses and keep the organization identity", () => {
  const origin = "https://example.com";
  const canonicalUrl = "https://example.com/news/hello?lang=en";
  const article = buildArticleJsonLd({
    origin,
    language: "en",
    canonicalUrl,
    headline: "Hello",
    datePublished: null,
    dateModified: "not-a-date",
  });
  assert.equal(article.datePublished, undefined);
  assert.equal(article.dateModified, undefined);
  assert.equal(article.author["@id"], organizationId(origin));
  assert.equal(article.publisher["@id"], organizationId(origin));

  const event = buildEventJsonLd({
    origin,
    language: "en",
    canonicalUrl: "https://example.com/events/hello?lang=en",
    name: "Event",
    startDate: "not-a-date",
    endDate: "also-not-a-date",
    eventAttendanceMode: undefined,
    location: undefined,
    price: -1,
  });
  assert.equal(event.startDate, undefined);
  assert.equal(event.endDate, undefined);
  assert.equal(event.eventAttendanceMode, undefined);
  assert.equal(event.location, undefined);
  assert.equal(event.offers, undefined);
});

test("public indexability excludes drafts, member content, scheduled, and expired posts", () => {
  const now = Date.parse("2026-09-04T00:00:00.000Z");
  const base = { status: "published", visibility: "public" };
  assert.equal(isPubliclyIndexablePost(base, now), true);
  assert.equal(isPubliclyIndexablePost({ ...base, status: "draft" }, now), false);
  assert.equal(isPubliclyIndexablePost({ ...base, visibility: "members" }, now), false);
  assert.equal(
    isPubliclyIndexablePost({ ...base, publishedAt: "2026-09-05T00:00:00.000Z" }, now),
    false,
  );
  assert.equal(
    isPubliclyIndexablePost({ ...base, expiresAt: "2026-09-04T00:00:00.000Z" }, now),
    false,
  );
});

test("sitemap XML keeps absolute URLs and escapes URL content", () => {
  const xml = buildSitemapXml([
    { loc: "https://example.com/news/hello?lang=en&view=full", lastmod: "2026-08-31T00:00:00.000Z" },
    { loc: "javascript:alert(1)" },
  ]);

  assert.match(xml, /<loc>https:\/\/example\.com\/news\/hello\?lang=en&amp;view=full<\/loc>/);
  assert.match(xml, /<lastmod>2026-08-31T00:00:00.000Z<\/lastmod>/);
  assert.doesNotMatch(xml, /javascript:/);
});

test("robots and AI guidance only advertise public entry points", () => {
  const robots = buildRobotsTxt("https://example.com/sitemap.xml");
  const llms = buildLlmsTxt("https://example.com");

  assert.match(robots, /Sitemap: https:\/\/example\.com\/sitemap\.xml/);
  assert.match(robots, /Disallow: \/admin/);
  assert.match(robots, /Disallow: \/api\//);
  assert.match(llms, /https:\/\/example\.com\/about\?lang=en/);
  assert.match(llms, /https:\/\/example\.com\/contact\?lang=en/);
  assert.match(llms, /https:\/\/example\.com\/partners\?lang=en/);
  assert.doesNotMatch(llms, /\/admin|\/dashboard|\/api\/|\/members|\/resources/);
});

test("SSR SEO uses the selected language and normalized public canonical", async () => {
  const req = {
    originalUrl: "/partners/?lang=zh",
    url: "/partners/?lang=zh",
    protocol: "https",
    path: "/",
    get(name: string) {
      return name.toLowerCase() === "host" ? "example.com" : undefined;
    },
  } as any;
  const document = await renderSeoDocument(
    req,
    '<!doctype html><html lang="ko"><head><!-- SEO_HEAD_START --><!-- SEO_HEAD_END --></head></html>',
  );

  assert.match(document, /<html lang="zh">/);
  assert.match(document, /<title>合作伙伴 \| 韩国四川-重庆总商会<\/title>/);
  assert.match(document, /<meta name="robots" content="index,follow"/);
  assert.match(document, /<link rel="canonical" href="https:\/\/example\.com\/partners\?lang=zh"/);
  assert.match(document, /hreflang="en" href="https:\/\/example\.com\/partners\?lang=en"/);
});

test("SSR SEO noindexes protected route variants", async () => {
  const req = {
    originalUrl: "/resources/?lang=en",
    url: "/resources/?lang=en",
    protocol: "https",
    path: "/",
    get(name: string) {
      return name.toLowerCase() === "host" ? "example.com" : undefined;
    },
  } as any;
  const document = await renderSeoDocument(
    req,
    '<!doctype html><html lang="ko"><head><!-- SEO_HEAD_START --><!-- SEO_HEAD_END --></head></html>',
  );

  assert.match(document, /<html lang="en">/);
  assert.match(document, /<meta name="robots" content="noindex,nofollow"/);
});

test("llms guidance includes bounded, language-specific public content only", () => {
  const llms = buildLlmsTxt("https://example.com", [
    {
      kind: "news",
      language: "ko",
      title: "공개 뉴스",
      summary: "한 줄 요약\n두 번째 줄",
      date: "2026-09-01T12:00:00.000Z",
      url: "https://example.com/news/public?lang=ko",
    },
    {
      kind: "event",
      language: "en",
      title: "Public event",
      summary: "Event summary",
      date: "2026-10-01T00:00:00.000Z",
      url: "https://example.com/events/public?lang=en",
    },
  ]);

  assert.match(llms, /## Latest public news \(ko\)/);
  assert.match(llms, /공개 뉴스.*2026-09-01.*한 줄 요약 두 번째 줄/);
  assert.match(llms, /## Current public events \(en\)/);
  assert.match(llms, /https:\/\/example\.com\/events\/public\?lang=en/);
  assert.doesNotMatch(llms, /## Latest public news \(en\)/);
  assert.doesNotMatch(llms, /\/admin|\/dashboard|\/api\//);
});

test("server HTML uses the public access policy and one marked JSON-LD set", async () => {
  const publicPost = {
    id: "00000000-0000-4000-8000-000000000001",
    postType: "news",
    status: "published",
    visibility: "public",
    slug: "public-news",
    primaryLocale: "en",
    authorId: null,
    coverImage: null,
    listImage: null,
    isFeatured: false,
    tags: null,
    publishedAt: new Date("2026-09-01T00:00:00.000Z"),
    scheduledAt: null,
    expiresAt: null,
    createdAt: new Date("2026-08-31T00:00:00.000Z"),
    updatedAt: new Date("2026-09-02T00:00:00.000Z"),
    translations: [{
      id: "00000000-0000-4000-8000-000000000002",
      postId: "00000000-0000-4000-8000-000000000001",
      locale: "en",
      title: "Public news",
      subtitle: null,
      excerpt: "Public summary",
      content: null,
      seoTitle: null,
      seoDescription: null,
      seoKeywords: null,
      createdAt: new Date("2026-08-31T00:00:00.000Z"),
      updatedAt: new Date("2026-09-02T00:00:00.000Z"),
    }],
    meta: [],
  } as PostWithTranslations;
  const request = {
    originalUrl: "/news/public-news?lang=en",
    url: "/news/public-news?lang=en",
    path: "/news/public-news",
    protocol: "https",
    get: (name: string) => name === "host" ? "example.com" : undefined,
  } as any;
  const originalLookup = storage.getPostBySlugWithTranslations;
  let receivedAccess: unknown;
  storage.getPostBySlugWithTranslations = async (...args) => {
    receivedAccess = args[2];
    return publicPost;
  };

  try {
    const seo = await getInitialSeo(request);
    assert.equal(receivedAccess, publicPostAccess);
    assert.equal(seo.noIndex, false);
    assert.deepEqual(seo.jsonLd?.map((item) => item["@type"]), [
      "Organization",
      "WebSite",
      "WebPage",
      "Article",
      "BreadcrumbList",
    ]);

    const html = await renderSeoDocument(
      request,
      "<html><head><!-- SEO_HEAD_START --><!-- SEO_HEAD_END --></head></html>",
    );
    const scripts = [...html.matchAll(
      /<script type="application\/ld\+json" data-seo-jsonld="true">([\s\S]*?)<\/script>/g,
    )];
    assert.equal(scripts.length, 5);
    assert.equal((html.match(/application\/ld\+json/g) || []).length, 5);
    assert.match(html, /rel="canonical" href="https:\/\/example\.com\/news\/public-news\?lang=en"/);
  } finally {
    storage.getPostBySlugWithTranslations = originalLookup;
  }
});