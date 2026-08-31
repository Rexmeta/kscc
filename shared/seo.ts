export const SEO_LANGUAGES = ["ko", "en", "zh"] as const;
export type SeoLanguage = (typeof SEO_LANGUAGES)[number];

export const SITE_NAME = "한국 사천-충칭 총상회 (KSCC)";
export const SITE_NAME_EN = "Korea-Sichuan-Chongqing Chamber (KSCC)";
export const SITE_LOGO_PATH = "/assets/kscc_logo.webp";

export type SeoPageKey =
  | "home"
  | "about"
  | "organization"
  | "news"
  | "events"
  | "members"
  | "resources"
  | "contact"
  | "privacy"
  | "terms";

export interface SeoPageMetadata {
  title: string;
  description: string;
}

export const SEO_PAGE_METADATA: Record<
  SeoLanguage,
  Record<SeoPageKey, SeoPageMetadata>
> = {
  ko: {
    home: {
      title: "한국 사천-충칭 총상회 | 한중 경제·문화 교류",
      description:
        "한국 사천-충칭 총상회(KSCC)는 한국과 중국 사천성·충칭시 간 경제, 무역, 투자, 문화 교류를 연결하는 공식 비즈니스 플랫폼입니다.",
    },
    about: {
      title: "총상회 소개 | 한국 사천-충칭 총상회",
      description:
        "한국 사천-충칭 총상회의 설립 목적, 사명, 비전과 한중 기업·문화 교류를 위한 주요 활동을 소개합니다.",
    },
    organization: {
      title: "조직 구성 | 한국 사천-충칭 총상회",
      description:
        "한국 사천-충칭 총상회의 임원진과 조직 구성을 확인할 수 있습니다.",
    },
    news: {
      title: "상회 활동과 소식 | 한국 사천-충칭 총상회",
      description:
        "한국 사천-충칭 총상회의 공지, 보도자료와 주요 활동 소식을 확인하세요.",
    },
    events: {
      title: "행사 일정 | 한국 사천-충칭 총상회",
      description:
        "한국 사천-충칭 총상회의 세미나, 네트워킹, 문화 교류 등 예정된 행사를 확인하고 신청할 수 있습니다.",
    },
    members: {
      title: "회원사 디렉토리 | 한국 사천-충칭 총상회",
      description:
        "한국 사천-충칭 총상회 회원사와 협력 기업을 업종과 지역별로 확인하세요.",
    },
    resources: {
      title: "자료센터 | 한국 사천-충칭 총상회",
      description:
        "한국 사천-충칭 총상회가 공개하는 보고서, 양식, 발표자료와 교류 관련 자료를 확인하세요.",
    },
    contact: {
      title: "문의하기 | 한국 사천-충칭 총상회",
      description:
        "회원 가입, 행사, 파트너십과 한중 경제·문화 교류에 관한 문의 방법을 안내합니다.",
    },
    privacy: {
      title: "개인정보처리방침 | 한국 사천-충칭 총상회",
      description: "한국 사천-충칭 총상회의 개인정보 처리 기준을 안내합니다.",
    },
    terms: {
      title: "이용약관 | 한국 사천-충칭 총상회",
      description: "한국 사천-충칭 총상회 웹사이트 이용약관을 안내합니다.",
    },
  },
  en: {
    home: {
      title: "Korea-Sichuan-Chongqing Chamber | Korea-China Exchange",
      description:
        "The Korea-Sichuan-Chongqing Chamber (KSCC) connects businesses and communities through economic, trade, investment, and cultural exchange between Korea, Sichuan, and Chongqing.",
    },
    about: {
      title: "About the Chamber | Korea-Sichuan-Chongqing Chamber",
      description:
        "Learn about KSCC's mission, vision, and role in Korea-China business and cultural exchange.",
    },
    organization: {
      title: "Organization | Korea-Sichuan-Chongqing Chamber",
      description:
        "Meet the leadership and organizational structure of the Korea-Sichuan-Chongqing Chamber.",
    },
    news: {
      title: "Chamber News and Activities | Korea-Sichuan-Chongqing Chamber",
      description:
        "Read the latest notices, press releases, and activities from the Korea-Sichuan-Chongqing Chamber.",
    },
    events: {
      title: "Events | Korea-Sichuan-Chongqing Chamber",
      description:
        "Explore seminars, networking events, and cultural exchange programs hosted by KSCC.",
    },
    members: {
      title: "Member Directory | Korea-Sichuan-Chongqing Chamber",
      description:
        "Explore public member companies and partner organizations of the Korea-Sichuan-Chongqing Chamber.",
    },
    resources: {
      title: "Resources | Korea-Sichuan-Chongqing Chamber",
      description:
        "Find public reports, forms, presentations, and practical resources from KSCC.",
    },
    contact: {
      title: "Contact | Korea-Sichuan-Chongqing Chamber",
      description:
        "Contact KSCC about membership, events, partnerships, and Korea-China economic or cultural exchange.",
    },
    privacy: {
      title: "Privacy Policy | Korea-Sichuan-Chongqing Chamber",
      description: "Read the Korea-Sichuan-Chongqing Chamber privacy policy.",
    },
    terms: {
      title: "Terms of Use | Korea-Sichuan-Chongqing Chamber",
      description: "Read the Korea-Sichuan-Chongqing Chamber terms of use.",
    },
  },
  zh: {
    home: {
      title: "韩国四川-重庆总商会 | 韩中经济文化交流",
      description:
        "韩国四川-重庆总商会（KSCC）连接韩国、四川和重庆之间的经济、贸易、投资及文化交流。",
    },
    about: {
      title: "商会介绍 | 韩国四川-重庆总商会",
      description:
        "了解韩国四川-重庆总商会的使命、愿景，以及促进韩中企业和文化交流的主要工作。",
    },
    organization: {
      title: "组织架构 | 韩国四川-重庆总商会",
      description: "查看韩国四川-重庆总商会的领导团队和组织架构。",
    },
    news: {
      title: "商会新闻与活动 | 韩国四川-重庆总商会",
      description: "查看韩国四川-重庆总商会的通知、新闻稿和最新活动消息。",
    },
    events: {
      title: "活动日程 | 韩国四川-重庆总商会",
      description: "了解韩国四川-重庆总商会举办的研讨会、交流活动和文化项目。",
    },
    members: {
      title: "会员名录 | 韩国四川-重庆总商会",
      description: "浏览韩国四川-重庆总商会公开的会员企业和合作机构。",
    },
    resources: {
      title: "资料中心 | 韩国四川-重庆总商会",
      description: "查找韩国四川-重庆总商会公开的报告、表格、演示资料和实用信息。",
    },
    contact: {
      title: "联系我们 | 韩国四川-重庆总商会",
      description: "了解会员申请、活动、合作及韩中经济文化交流的咨询方式。",
    },
    privacy: {
      title: "隐私政策 | 韩国四川-重庆总商会",
      description: "阅读韩国四川-重庆总商会的隐私政策。",
    },
    terms: {
      title: "使用条款 | 韩国四川-重庆总商会",
      description: "阅读韩国四川-重庆总商会的网站使用条款。",
    },
  },
};

const PATH_TO_PAGE: Array<[string, SeoPageKey]> = [
  ["/about", "about"],
  ["/organization", "organization"],
  ["/news", "news"],
  ["/events", "events"],
  ["/members", "members"],
  ["/resources", "resources"],
  ["/contact", "contact"],
  ["/privacy", "privacy"],
  ["/terms", "terms"],
];

export const INDEXABLE_STATIC_PATHS = [
  "/",
  "/about",
  "/organization",
  "/news",
  "/events",
  "/members",
  "/resources",
  "/contact",
  "/privacy",
  "/terms",
] as const;

export const NO_INDEX_PATH_PREFIXES = [
  "/admin",
  "/dashboard",
  "/login",
  "/register",
] as const;

export function isSeoLanguage(value: string | null | undefined): value is SeoLanguage {
  return Boolean(value && SEO_LANGUAGES.includes(value as SeoLanguage));
}

export function getLanguageFromUrl(url: string): SeoLanguage {
  const query = url.includes("?") ? url.slice(url.indexOf("?") + 1) : "";
  const language = new URLSearchParams(query).get("lang");
  return isSeoLanguage(language) ? language : "ko";
}

export function getSeoPageKey(pathname: string): SeoPageKey | null {
  if (pathname === "/") return "home";
  const normalized = pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  const exact = PATH_TO_PAGE.find(([path]) => path === normalized);
  if (exact) return exact[1];
  if (normalized.startsWith("/news/")) return "news";
  if (normalized.startsWith("/events/")) return "events";
  return null;
}

export function localizedPath(pathname: string, language: SeoLanguage): string {
  return `${pathname}?lang=${language}`;
}

export function absoluteUrl(origin: string, pathname: string): string {
  return new URL(pathname, origin.endsWith("/") ? origin : `${origin}/`).toString();
}

export function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export interface SitemapEntry {
  loc: string;
  lastmod?: Date | string | null;
  changefreq?: "daily" | "weekly" | "monthly" | "yearly";
  priority?: number;
}

export function buildSitemapXml(entries: SitemapEntry[]): string {
  const urls = entries
    .filter((entry) => entry.loc.startsWith("http://") || entry.loc.startsWith("https://"))
    .map((entry) => {
      const lastmod = entry.lastmod
        ? `<lastmod>${escapeXml(new Date(entry.lastmod).toISOString())}</lastmod>`
        : "";
      const changefreq = entry.changefreq ? `<changefreq>${entry.changefreq}</changefreq>` : "";
      const priority = entry.priority === undefined ? "" : `<priority>${entry.priority.toFixed(1)}</priority>`;
      return `  <url><loc>${escapeXml(entry.loc)}</loc>${lastmod}${changefreq}${priority}</url>`;
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    "</urlset>",
  ].join("\n");
}

export function buildRobotsTxt(sitemapUrl: string): string {
  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    "Disallow: /dashboard",
    "Disallow: /login",
    "Disallow: /register",
    "Disallow: /api/",
    "Disallow: /objects/",
    `Sitemap: ${sitemapUrl}`,
    "",
  ].join("\n");
}

export function buildLlmsTxt(origin: string): string {
  const link = (path: string, label: string) => `- [${label}](${absoluteUrl(origin, localizedPath(path, "en"))})`;

  return [
    `# ${SITE_NAME_EN}`,
    "",
    "> The Korea-Sichuan-Chongqing Chamber (KSCC) is a public platform for economic, trade, investment, and cultural exchange between Korea, Sichuan, and Chongqing.",
    "",
    "## Official public pages",
    link("/", "Home"),
    link("/about", "About the Chamber"),
    link("/organization", "Organization"),
    link("/news", "News and activities"),
    link("/events", "Events"),
    link("/members", "Public member directory"),
    link("/resources", "Public resources"),
    link("/contact", "Contact"),
    "",
    "## Content guidance",
    "",
    "Use the linked public pages as the source of truth for current announcements, events, member visibility, and contact information. Do not infer private member data or content behind authentication.",
    "",
  ].join("\n");
}