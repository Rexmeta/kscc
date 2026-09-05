import { useEffect } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import ksccLogoPath from "@/assets/kscc_logo.webp";
import {
  absoluteUrl,
  buildStaticSeoJsonLd,
  getSeoPageKey,
  isNoIndexPath,
  localizedPath,
  normalizeSeoPathname,
  NO_INDEX_PATH_PREFIXES,
  SEO_PAGE_METADATA,
  SEO_LANGUAGES,
  SITE_NAME,
  type SeoLanguage,
  type SeoPageKey,
} from "@shared/seo";
type JsonLd = Record<string, unknown> | Array<Record<string, unknown>>;

export interface SeoBreadcrumb {
  name: string;
  path: string;
}

interface SeoProps {
  page?: SeoPageKey;
  title?: string;
  description?: string;
  image?: string | null;
  type?: "website" | "article";
  canonicalPath?: string;
  noIndex?: boolean;
  breadcrumbs?: SeoBreadcrumb[];
  jsonLd?: JsonLd;
}

function upsertMeta(attribute: "name" | "property", key: string, content: string): void {
  let element = document.head.querySelector<HTMLMetaElement>(
    `meta[${attribute}="${key}"]`,
  );
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

function upsertLink(rel: string, href: string, extra: Record<string, string> = {}): void {
  const selector = Object.entries({ rel, ...extra })
    .map(([key, value]) => `link[${key}="${value}"]`)
    .join("");
  let element = document.head.querySelector<HTMLLinkElement>(selector);
  if (!element) {
    element = document.createElement("link");
    element.rel = rel;
    Object.entries(extra).forEach(([key, value]) => element!.setAttribute(key, value));
    document.head.appendChild(element);
  }
  element.href = href;
}

function removeSeoJsonLd(): void {
  document.head.querySelectorAll("[data-seo-jsonld]").forEach((element) => element.remove());
}

function addJsonLd(value: Record<string, unknown>): void {
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.setAttribute("data-seo-jsonld", "true");
  // Prevent JSON-LD from prematurely closing the script element.
  script.textContent = JSON.stringify(value).replaceAll("<", "\\u003c");
  document.head.appendChild(script);
}

function getOrigin(): string {
  return window.location.origin;
}

export function Seo({
  page,
  title,
  description,
  image,
  type = "website",
  canonicalPath,
  noIndex = false,
  breadcrumbs = [],
  jsonLd,
}: SeoProps) {
  const { language } = useLanguage();
  const [location] = useLocation();
  const pathname = normalizeSeoPathname(canonicalPath || location.split("?")[0] || "/");
  const metadata = page ? SEO_PAGE_METADATA[language][page] : undefined;
  const resolvedTitle = title || metadata?.title || SITE_NAME;
  const resolvedDescription = description || metadata?.description || "";

  useEffect(() => {
    const origin = getOrigin();
    const canonicalUrl = absoluteUrl(origin, localizedPath(pathname, language));
    const resolvedImage = image
      ? image.startsWith("http") ? image : absoluteUrl(origin, image)
      : absoluteUrl(origin, ksccLogoPath);

    document.title = resolvedTitle;
    document.documentElement.lang = language;
    upsertMeta("name", "description", resolvedDescription);
    upsertMeta("name", "robots", noIndex ? "noindex,nofollow" : "index,follow");
    upsertMeta("property", "og:title", resolvedTitle);
    upsertMeta("property", "og:description", resolvedDescription);
    upsertMeta("property", "og:type", type);
    upsertMeta("property", "og:url", canonicalUrl);
    upsertMeta("property", "og:site_name", SITE_NAME);
    upsertMeta("property", "og:locale", language === "zh" ? "zh_CN" : language === "ko" ? "ko_KR" : "en_US");
    upsertMeta("property", "og:image", resolvedImage);
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", resolvedTitle);
    upsertMeta("name", "twitter:description", resolvedDescription);
    upsertMeta("name", "twitter:image", resolvedImage);
    upsertLink("canonical", canonicalUrl);

    document.head.querySelectorAll('link[data-seo-alternate="true"]').forEach((element) => element.remove());
    SEO_LANGUAGES.forEach((alternateLanguage) => {
      const alternate = document.createElement("link");
      alternate.rel = "alternate";
      alternate.hreflang = alternateLanguage;
      alternate.href = absoluteUrl(origin, localizedPath(pathname, alternateLanguage));
      alternate.setAttribute("data-seo-alternate", "true");
      document.head.appendChild(alternate);
    });
    const xDefault = document.createElement("link");
    xDefault.rel = "alternate";
    xDefault.hreflang = "x-default";
    xDefault.href = absoluteUrl(origin, localizedPath(pathname, "ko"));
    xDefault.setAttribute("data-seo-alternate", "true");
    document.head.appendChild(xDefault);

    removeSeoJsonLd();
    if (!noIndex) {
      const commonJsonLd = buildStaticSeoJsonLd({
        origin,
        language,
        canonicalUrl,
        name: resolvedTitle,
        description: resolvedDescription,
        breadcrumbs: breadcrumbs.map((breadcrumb) => ({
          name: breadcrumb.name,
          url: absoluteUrl(origin, localizedPath(breadcrumb.path, language)),
        })),
      });
      for (const value of commonJsonLd) addJsonLd(value);
      if (jsonLd) {
        for (const value of Array.isArray(jsonLd) ? jsonLd : [jsonLd]) addJsonLd(value);
      }
    }
  }, [
    breadcrumbs,
    description,
    image,
    jsonLd,
    language,
    noIndex,
    page,
    pathname,
    resolvedDescription,
    resolvedTitle,
    type,
  ]);

  return null;
}

export function RouteSeo() {
  const [location] = useLocation();
  const { language } = useLanguage();
  const pathname = normalizeSeoPathname(location.split("?")[0] || "/");
  const page = getSeoPageKey(pathname);
  const isDetailPage = pathname.startsWith("/news/") || pathname.startsWith("/events/");
  const noIndex =
    !page ||
    isNoIndexPath(pathname) ||
    NO_INDEX_PATH_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );

  if (isDetailPage) return null;

  return (
    <Seo
      page={page || undefined}
      canonicalPath={pathname}
      noIndex={noIndex}
      breadcrumbs={
        page && page !== "home"
          ? [
              { name: SEO_PAGE_METADATA[language].home.title, path: "/" },
              { name: SEO_PAGE_METADATA[language][page].title, path: pathname },
            ]
          : []
      }
    />
  );
}
