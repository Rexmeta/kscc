export const HOME_LOCALES = ["ko", "en", "zh"] as const;
export type HomeLocale = (typeof HOME_LOCALES)[number];

type HomeCtaContent = {
  member: string;
  event: string;
  contact: string;
};

type HomeSectionContent = {
  title: string;
  subtitle: string;
  viewAll: string;
  empty: string;
};

type HomeBenefit = {
  title: string;
  description: string;
};

export interface HomeContent {
  hero: {
    title: string;
    subtitle: string;
    description: string;
    cta: HomeCtaContent;
  };
  events: HomeSectionContent;
  news: HomeSectionContent & {
    readMore: string;
  };
  surveys: {
    title: string;
    subtitle: string;
    period: string;
    participate: string;
  };
  partners: {
    title: string;
    subtitle: string;
    empty: string;
    viewAll: string;
  };
  about: {
    eyebrow: string;
    heading: string;
    missionDescription: string;
    benefits: [HomeBenefit, HomeBenefit, HomeBenefit];
    downloadBrochure: string;
    viewOrgChart: string;
    statsMembers: string;
    statsEvents: string;
  };
  benefits: {
    title: string;
    subtitle: string;
    cards: [HomeBenefit, HomeBenefit, HomeBenefit];
    login: string;
    register: string;
  };
}

type HomeStructuredContent = Omit<HomeContent, "hero"> & {
  hero: Pick<HomeContent["hero"], "cta">;
};

export type HomeTranslationInput = {
  title?: unknown;
  subtitle?: unknown;
  excerpt?: unknown;
  content?: unknown;
};

const defaults: Record<HomeLocale, HomeContent> = {
  ko: {
    hero: {
      title: "한·사천·충칭 경제문화 교류의 중심",
      subtitle: "Korea-Sichuan-Chongqing Economic & Cultural Exchange Hub",
      description:
        "한국과 중국 서부지역(사천성, 충칭시) 간의 경제·무역·문화 교류를 촉진하고, 양국 기업의 상호 이해와 협력을 강화하여 지속 가능한 성장을 지원합니다.",
      cta: { member: "회원 가입", event: "행사 신청", contact: "문의하기" },
    },
    events: {
      title: "예정된 행사",
      subtitle: "최신 네트워킹 이벤트와 세미나에 참여하세요",
      viewAll: "모든 행사 보기",
      empty: "현재 예정된 행사가 없습니다.",
    },
    news: {
      title: "최신 뉴스",
      subtitle: "총상회의 주요 소식과 활동을 확인하세요",
      viewAll: "전체 뉴스",
      empty: "최근 뉴스가 없습니다.",
      readMore: "자세히 보기",
    },
    surveys: {
      title: "회원 설문",
      subtitle: "회원 여러분의 소중한 의견을 들려주세요",
      period: "설문 기간",
      participate: "설문 참여하기",
    },
    partners: {
      title: "협력 파트너",
      subtitle: "함께 성장하는 회원사 및 협력 파트너",
      empty: "협력 파트너를 준비 중입니다.",
      viewAll: "전체 파트너",
    },
    about: {
      eyebrow: "총상회 소개",
      heading: "한국과 중국을 잇는 신뢰의 비즈니스 플랫폼",
      missionDescription: "'한·사·윈'을 합심으로 중한 경제교류의 가교 역할 기능.",
      benefits: [
        { title: "경제·무역 교류 활성화", description: "양국 기업 간 효율적인 파트너 발굴과 협력 기회 창출" },
        { title: "시장 진출 지원 및 컨설팅", description: "현지 시장 정보 제공 및 진출 전략 수립 지원" },
        { title: "정기 세미나 및 교류 행사", description: "산업별 전문 세미나와 문화 교류 프로그램 운영" },
      ],
      downloadBrochure: "총상회 소개서 다운로드",
      viewOrgChart: "조직도 보기",
      statsMembers: "회원사",
      statsEvents: "연간 행사",
    },
    benefits: {
      title: "회원 전용 혜택",
      subtitle: "로그인하시면 더 많은 정보와 서비스를 이용하실 수 있습니다",
      cards: [
        { title: "심화 자료", description: "회원 전용 리포트 및 정책 브리핑" },
        { title: "멤버 네트워크", description: "회원사 상세 연락처 및 매칭" },
        { title: "행사 우대", description: "우선 등록 및 할인 혜택" },
      ],
      login: "로그인",
      register: "회원가입",
    },
  },
  en: {
    hero: {
      title: "Korea-Sichuan-Chongqing Economic & Cultural Exchange Hub",
      subtitle: "한·사천·충칭 경제문화 교류의 중심",
      description:
        "Promoting economic, trade and cultural exchanges between Korea and Western China (Sichuan Province, Chongqing), strengthening mutual understanding and cooperation between companies of both countries for sustainable growth.",
      cta: { member: "Join as Member", event: "Register for Events", contact: "Contact Us" },
    },
    events: {
      title: "Scheduled Events",
      subtitle: "Join our latest networking events and seminars",
      viewAll: "View All Events",
      empty: "No upcoming events at this time.",
    },
    news: {
      title: "Recent News",
      subtitle: "Stay updated with the Chamber's latest news and activities",
      viewAll: "All News",
      empty: "No recent news available.",
      readMore: "Read More",
    },
    surveys: {
      title: "Member Surveys",
      subtitle: "Share your valuable feedback with us",
      period: "Survey period",
      participate: "Take the survey",
    },
    partners: {
      title: "Partner Members",
      subtitle: "Member companies and partners growing together",
      empty: "Partner information coming soon.",
      viewAll: "All Partners",
    },
    about: {
      eyebrow: "About KSCC",
      heading: "A Trusted Business Platform Bridging Korea and China",
      missionDescription: 'With "Korea-Sichuan-Win" as the core, building bridges for China-Korea economic exchange.',
      benefits: [
        { title: "Economic & Trade Exchange", description: "Efficient partner discovery and cooperation opportunities between companies of both countries" },
        { title: "Market Entry Support & Consulting", description: "Local market information and market entry strategy support" },
        { title: "Regular Seminars & Exchange Events", description: "Industry-specific professional seminars and cultural exchange programs" },
      ],
      downloadBrochure: "Download Chamber Brochure",
      viewOrgChart: "View Organization Chart",
      statsMembers: "Members",
      statsEvents: "Annual Events",
    },
    benefits: {
      title: "Member Exclusive Benefits",
      subtitle: "Log in to access more information and services",
      cards: [
        { title: "In-Depth Resources", description: "Member-only reports and policy briefings" },
        { title: "Member Network", description: "Detailed member contact and matching services" },
        { title: "Event Privileges", description: "Priority registration and discount benefits" },
      ],
      login: "Login",
      register: "Register",
    },
  },
  zh: {
    hero: {
      title: "韩国·四川·重庆经济文化交流中心",
      subtitle: "Korea-Sichuan-Chongqing Economic & Cultural Exchange Hub",
      description:
        "促进韩国与中国西部地区（四川省、重庆市）之间的经贸文化交流，加强两国企业的相互理解与合作，支持可持续发展。",
      cta: { member: "加入会员", event: "活动报名", contact: "联系我们" },
    },
    events: {
      title: "预定活动",
      subtitle: "参加最新的网络交流活动和研讨会",
      viewAll: "查看所有活动",
      empty: "目前没有预定的活动。",
    },
    news: {
      title: "最新新闻",
      subtitle: "了解商会的最新消息和活动",
      viewAll: "全部新闻",
      empty: "暂无最新新闻。",
      readMore: "阅读更多",
    },
    surveys: {
      title: "会员调查",
      subtitle: "请分享您宝贵的意见",
      period: "调查时间",
      participate: "参加调查",
    },
    partners: {
      title: "合作伙伴",
      subtitle: "共同成长的会员企业和合作伙伴",
      empty: "合作伙伴信息即将上线。",
      viewAll: "全部合作伙伴",
    },
    about: {
      eyebrow: "商会介绍",
      heading: "连接韩中两国的可信赖商务平台",
      missionDescription: '以"韩·川·赢"为核心，搭建中韩经济交流的桥梁作用。',
      benefits: [
        { title: "经济贸易交流促进", description: "高效发掘两国企业合作伙伴，创造合作机会" },
        { title: "市场进入支持与咨询", description: "提供本地市场信息及市场进入策略支持" },
        { title: "定期研讨会及交流活动", description: "举办各行业专业研讨会及文化交流项目" },
      ],
      downloadBrochure: "下载商会简介",
      viewOrgChart: "查看组织架构",
      statsMembers: "会员企业",
      statsEvents: "年度活动",
    },
    benefits: {
      title: "会员专属福利",
      subtitle: "登录后可享受更多信息和服务",
      cards: [
        { title: "深度资料", description: "会员专属报告及政策简报" },
        { title: "会员网络", description: "详细会员联系方式及匹配服务" },
        { title: "活动优惠", description: "优先报名及折扣优惠" },
      ],
      login: "登录",
      register: "注册",
    },
  },
};

export const DEFAULT_HOME_CONTENT = defaults;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function benefitValue(value: unknown, fallback: HomeBenefit): HomeBenefit {
  if (!isRecord(value)) return fallback;
  return {
    title: stringValue(value.title, fallback.title),
    description: stringValue(value.description, fallback.description),
  };
}

function benefitsValue(value: unknown, fallback: [HomeBenefit, HomeBenefit, HomeBenefit]) {
  if (!Array.isArray(value) || value.length !== fallback.length) return fallback;
  return value.map((item, index) => benefitValue(item, fallback[index])) as [
    HomeBenefit,
    HomeBenefit,
    HomeBenefit,
  ];
}

function parseStructuredContent(value: unknown, fallback: HomeContent): HomeStructuredContent {
  if (!isRecord(value)) {
    return {
      hero: { cta: fallback.hero.cta },
      events: fallback.events,
      news: fallback.news,
      surveys: fallback.surveys,
      partners: fallback.partners,
      about: fallback.about,
      benefits: fallback.benefits,
    };
  }

  const hero = isRecord(value.hero) ? value.hero : {};
  const cta = isRecord(hero.cta) ? hero.cta : {};
  const events = isRecord(value.events) ? value.events : {};
  const news = isRecord(value.news) ? value.news : {};
  const surveys = isRecord(value.surveys) ? value.surveys : {};
  const partners = isRecord(value.partners) ? value.partners : {};
  const about = isRecord(value.about) ? value.about : {};
  const benefits = isRecord(value.benefits) ? value.benefits : {};

  return {
    hero: {
      cta: {
        member: stringValue(cta.member, fallback.hero.cta.member),
        event: stringValue(cta.event, fallback.hero.cta.event),
        contact: stringValue(cta.contact, fallback.hero.cta.contact),
      },
    },
    events: {
      title: stringValue(events.title, fallback.events.title),
      subtitle: stringValue(events.subtitle, fallback.events.subtitle),
      viewAll: stringValue(events.viewAll, fallback.events.viewAll),
      empty: stringValue(events.empty, fallback.events.empty),
    },
    news: {
      title: stringValue(news.title, fallback.news.title),
      subtitle: stringValue(news.subtitle, fallback.news.subtitle),
      viewAll: stringValue(news.viewAll, fallback.news.viewAll),
      empty: stringValue(news.empty, fallback.news.empty),
      readMore: stringValue(news.readMore, fallback.news.readMore),
    },
    surveys: {
      title: stringValue(surveys.title, fallback.surveys.title),
      subtitle: stringValue(surveys.subtitle, fallback.surveys.subtitle),
      period: stringValue(surveys.period, fallback.surveys.period),
      participate: stringValue(surveys.participate, fallback.surveys.participate),
    },
    partners: {
      title: stringValue(partners.title, fallback.partners.title),
      subtitle: stringValue(partners.subtitle, fallback.partners.subtitle),
      empty: stringValue(partners.empty, fallback.partners.empty),
      viewAll: stringValue(partners.viewAll, fallback.partners.viewAll),
    },
    about: {
      eyebrow: stringValue(about.eyebrow, fallback.about.eyebrow),
      heading: stringValue(about.heading, fallback.about.heading),
      missionDescription: stringValue(about.missionDescription, fallback.about.missionDescription),
      benefits: benefitsValue(about.benefits, fallback.about.benefits),
      downloadBrochure: stringValue(about.downloadBrochure, fallback.about.downloadBrochure),
      viewOrgChart: stringValue(about.viewOrgChart, fallback.about.viewOrgChart),
      statsMembers: stringValue(about.statsMembers, fallback.about.statsMembers),
      statsEvents: stringValue(about.statsEvents, fallback.about.statsEvents),
    },
    benefits: {
      title: stringValue(benefits.title, fallback.benefits.title),
      subtitle: stringValue(benefits.subtitle, fallback.benefits.subtitle),
      cards: benefitsValue(benefits.cards, fallback.benefits.cards),
      login: stringValue(benefits.login, fallback.benefits.login),
      register: stringValue(benefits.register, fallback.benefits.register),
    },
  };
}

export function getHomeStructuredContent(content: HomeContent): HomeStructuredContent {
  return {
    hero: { cta: content.hero.cta },
    events: content.events,
    news: content.news,
    surveys: content.surveys,
    partners: content.partners,
    about: content.about,
    benefits: content.benefits,
  };
}

export function getDefaultHomeTranslation(locale: HomeLocale) {
  const content = DEFAULT_HOME_CONTENT[locale];
  return {
    title: content.hero.title,
    subtitle: content.hero.subtitle,
    excerpt: content.hero.description,
    content: JSON.stringify(getHomeStructuredContent(content), null, 2),
  };
}

export function parseHomeTranslation(
  translation: HomeTranslationInput | undefined,
  locale: HomeLocale,
): HomeContent {
  const fallback = DEFAULT_HOME_CONTENT[locale];
  let parsedContent: unknown;
  if (typeof translation?.content === "string" && translation.content.trim()) {
    try {
      parsedContent = JSON.parse(translation.content);
    } catch {
      parsedContent = undefined;
    }
  } else {
    parsedContent = translation?.content;
  }

  const structured = parseStructuredContent(parsedContent, fallback);
  return {
    ...structured,
    hero: {
      ...fallback.hero,
      ...structured.hero,
      title: stringValue(translation?.title, fallback.hero.title),
      subtitle: stringValue(translation?.subtitle, fallback.hero.subtitle),
      description: stringValue(translation?.excerpt, fallback.hero.description),
    },
  };
}