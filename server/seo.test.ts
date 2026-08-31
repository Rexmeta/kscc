import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildLlmsTxt,
  buildRobotsTxt,
  buildSitemapXml,
  getLanguageFromUrl,
  getSeoPageKey,
} from "@shared/seo";

test("SEO language URLs resolve only supported languages", () => {
  assert.equal(getLanguageFromUrl("/news?lang=en"), "en");
  assert.equal(getLanguageFromUrl("/news?lang=zh"), "zh");
  assert.equal(getLanguageFromUrl("/news?lang=fr"), "ko");
  assert.equal(getSeoPageKey("/events/spring-networking"), "events");
  assert.equal(getSeoPageKey("/admin"), null);
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
  assert.doesNotMatch(llms, /\/admin|\/dashboard|\/api\//);
});