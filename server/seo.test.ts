import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildLlmsTxt,
  buildRobotsTxt,
  buildSitemapXml,
  getLanguageFromUrl,
  getSeoPageKey,
  INDEXABLE_STATIC_PATHS,
  isNoIndexPath,
  localizedPath,
  normalizeSeoPathname,
  SEO_LANGUAGES,
  SEO_PAGE_METADATA,
} from "@shared/seo";
import { renderSeoDocument } from "./seo";

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
  assert.equal(isNoIndexPath("/members/"), true);
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
  assert.match(llms, /https:\/\/example\.com\/partners\?lang=en/);
  assert.match(llms, /https:\/\/example\.com\/contact\?lang=en/);
  assert.doesNotMatch(llms, /\/members|\/resources|\/admin|\/dashboard|\/api\//);
});

test("SSR SEO document uses the requested language and normalized public canonical", async () => {
  const req = {
    originalUrl: "/partners/?lang=zh",
    url: "/partners/?lang=zh",
    protocol: "https",
    path: "/",
    get(name: string) {
      if (name.toLowerCase() === "host") return "example.com";
      return undefined;
    },
  } as any;
  const document = await renderSeoDocument(
    req,
    '<!doctype html><html lang="ko"><head><!-- SEO_HEAD_START --><!-- SEO_HEAD_END --></head><body></body></html>',
  );

  assert.match(document, /<html lang="zh">/);
  assert.match(document, /<title>合作伙伴 \| 韩国四川-重庆总商会<\/title>/);
  assert.match(document, /<meta name="robots" content="index,follow"/);
  assert.match(document, /<link rel="canonical" href="https:\/\/example\.com\/partners\?lang=zh"/);
  assert.match(document, /hreflang="en" href="https:\/\/example\.com\/partners\?lang=en"/);
  assert.match(document, /hreflang="x-default" href="https:\/\/example\.com\/partners\?lang=ko"/);
});

test("SSR SEO document noindexes protected route variants", async () => {
  const req = {
    originalUrl: "/resources/?lang=en",
    url: "/resources/?lang=en",
    protocol: "https",
    path: "/",
    get(name: string) {
      if (name.toLowerCase() === "host") return "example.com";
      return undefined;
    },
  } as any;
  const document = await renderSeoDocument(
    req,
    '<!doctype html><html lang="ko"><head><!-- SEO_HEAD_START --><!-- SEO_HEAD_END --></head><body></body></html>',
  );

  assert.match(document, /<html lang="en">/);
  assert.match(document, /<meta name="robots" content="noindex,nofollow"/);
});