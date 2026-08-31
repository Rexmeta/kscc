import type { Express, Request, Response } from "express";
import {
  absoluteUrl,
  buildLlmsTxt,
  buildRobotsTxt,
  buildSitemapXml,
  INDEXABLE_STATIC_PATHS,
  localizedPath,
  SEO_LANGUAGES,
  type SeoLanguage,
  type SitemapEntry,
} from "@shared/seo";
import { publicPostAccess } from "./postAccess";
import { storage } from "./storage";

const SITEMAP_POST_TYPES = ["news", "event"] as const;
const SITEMAP_PAGE_SIZE = 100;

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
      console.error("[SEO] Failed to build sitemap:", error);
      res.status(503).type("text/plain").send("Sitemap temporarily unavailable");
    }
  });
}