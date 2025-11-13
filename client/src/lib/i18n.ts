export type Language = 'ko' | 'en' | 'zh';

export interface TranslationKeys {
  // Navigation
  'nav.home': string;
  'nav.about': string;
  'nav.news': string;
  'nav.events': string;
  'nav.members': string;
  'nav.resources': string;
  'nav.contact': string;
  'nav.login': string;
  'nav.register': string;
  'nav.dashboard': string;
  'nav.admin': string;
  'nav.logout': string;

  // Common
  'common.loading': string;
  'common.error': string;
  'common.save': string;
  'common.cancel': string;
  'common.submit': string;
  'common.search': string;
  'common.filter': string;
  'common.all': string;
  'common.page': string;
  'common.of': string;
  'common.next': string;
  'common.previous': string;
  'common.more': string;
  'common.less': string;
  'common.download': string;
  'common.share': string;
  'common.contact': string;
  'common.date': string;
  'common.location': string;
  'common.category': string;
  'common.status': string;

  // Hero Section
  'hero.title': string;
  'hero.subtitle': string;
  'hero.description': string;
  'hero.cta.member': string;
  'hero.cta.event': string;
  'hero.cta.contact': string;
  'hero.stats.members': string;
  'hero.stats.events': string;
  'hero.stats.partnerships': string;
  'hero.stats.years': string;

  // About
  'about.title': string;
  'about.hero.title': string;
  'about.hero.intro': string;
  'about.intro.description': string;
  'about.mission.title': string;
  'about.mission.description': string;
  'about.mission.objective1': string;
  'about.mission.objective2': string;
  'about.mission.objective3': string;
  'about.mission.objective4': string;
  'about.vision.title': string;
  'about.vision.description': string;
  'about.vision.objective1': string;
  'about.vision.objective2': string;
  'about.functions.title': string;
  'about.functions.trade.title': string;
  'about.functions.trade.item1': string;
  'about.functions.trade.item2': string;
  'about.functions.trade.item3': string;
  'about.functions.industry.title': string;
  'about.functions.industry.item1': string;
  'about.functions.industry.item2': string;
  'about.functions.industry.item3': string;
  'about.functions.innovation.title': string;
  'about.functions.innovation.item1': string;
  'about.functions.innovation.item2': string;
  'about.functions.innovation.item3': string;
  'about.functions.culture.title': string;
  'about.functions.culture.item1': string;
  'about.functions.culture.item2': string;
  'about.functions.culture.item3': string;
  'about.organization.title': string;
  'about.organization.description1': string;
  'about.organization.description2': string;
  'about.organization.description3': string;
  'about.organization.president': string;
  'about.organization.vicePresident': string;
  'about.organization.secretary': string;
  'about.organization.advisor': string;
  'about.future.title': string;
  'about.future.description1': string;
  'about.future.description2': string;
  'about.pillars.business.title': string;
  'about.pillars.business.description': string;
  'about.pillars.culture.title': string;
  'about.pillars.culture.description': string;
  'about.pillars.legal.title': string;
  'about.pillars.legal.description': string;

  // News
  'news.title': string;
  'news.latest': string;
  'news.categories.notice': string;
  'news.categories.press': string;
  'news.categories.activity': string;
  'news.readMore': string;
  'news.viewAll': string;

  // Events
  'events.title': string;
  'events.upcoming': string;
  'events.register': string;
  'events.categories.networking': string;
  'events.categories.seminar': string;
  'events.categories.workshop': string;
  'events.categories.cultural': string;
  'events.type.offline': string;
  'events.type.online': string;
  'events.type.hybrid': string;
  'events.seatsRemaining': string;
  'events.unlimited': string;
  'events.full': string;

  // Members
  'members.title': string;
  'members.directory': string;
  'members.search.company': string;
  'members.search.country': string;
  'members.search.industry': string;
  'members.search.level': string;
  'members.levels.regular': string;
  'members.levels.premium': string;
  'members.levels.sponsor': string;
  'members.contact': string;
  'members.viewProfile': string;

  // Resources
  'resources.title': string;
  'resources.categories.reports': string;
  'resources.categories.forms': string;
  'resources.categories.presentations': string;
  'resources.categories.guides': string;
  'resources.access.public': string;
  'resources.access.members': string;
  'resources.access.premium': string;
  'resources.loginRequired': string;

  // Contact
  'contact.title': string;
  'contact.form.title': string;
  'contact.form.category': string;
  'contact.form.categories.membership': string;
  'contact.form.categories.event': string;
  'contact.form.categories.partnership': string;
  'contact.form.categories.other': string;
  'contact.form.name': string;
  'contact.form.company': string;
  'contact.form.email': string;
  'contact.form.phone': string;
  'contact.form.subject': string;
  'contact.form.message': string;
  'contact.form.privacy': string;
  'contact.form.send': string;
  'contact.office.title': string;
  'contact.office.address': string;
  'contact.office.phone': string;
  'contact.office.email': string;
  'contact.office.hours': string;
  'contact.office.weekdays': string;
  'contact.office.lunch': string;
  'contact.office.weekend': string;

  // Auth
  'auth.login.title': string;
  'auth.login.email': string;
  'auth.login.password': string;
  'auth.login.submit': string;
  'auth.login.register': string;
  'auth.register.title': string;
  'auth.register.name': string;
  'auth.register.email': string;
  'auth.register.password': string;
  'auth.register.confirmPassword': string;
  'auth.register.submit': string;
  'auth.register.login': string;
  'auth.logout': string;

  // Dashboard
  'dashboard.title': string;
  'dashboard.profile': string;
  'dashboard.membership': string;
  'dashboard.events': string;
  'dashboard.resources': string;

  // Admin
  'admin.title': string;
  'admin.dashboard': string;
  'admin.members': string;
  'admin.events': string;
  'admin.news': string;
  'admin.resources': string;
  'admin.inquiries': string;
  'admin.partners': string;
}

const translations: Record<Language, TranslationKeys> = {
  ko: {
    // Navigation
    'nav.home': '홈',
    'nav.about': '소개',
    'nav.news': '뉴스',
    'nav.events': '행사',
    'nav.members': '회원사',
    'nav.resources': '자료센터',
    'nav.contact': '연락처',
    'nav.login': '로그인',
    'nav.register': '회원가입',
    'nav.dashboard': 'My Page',
    'nav.admin': '관리자',
    'nav.logout': '로그아웃',

    // Common
    'common.loading': '로딩 중...',
    'common.error': '오류가 발생했습니다',
    'common.save': '저장',
    'common.cancel': '취소',
    'common.submit': '제출',
    'common.search': '검색',
    'common.filter': '필터',
    'common.all': '전체',
    'common.page': '페이지',
    'common.of': '의',
    'common.next': '다음',
    'common.previous': '이전',
    'common.more': '더보기',
    'common.less': '접기',
    'common.download': '다운로드',
    'common.share': '공유',
    'common.contact': '연락하기',
    'common.date': '일시',
    'common.location': '장소',
    'common.category': '분류',
    'common.status': '상태',

    // Hero Section
    'hero.title': '한·사천·충칭 경제문화 교류의 중심',
    'hero.subtitle': 'Korea-Sichuan-Chongqing Economic & Cultural Exchange Hub',
    'hero.description': '한국과 중국 서부지역(사천성, 충칭시) 간의 경제·무역·문화 교류를 촉진하고, 양국 기업의 상호 이해와 협력을 강화하여 지속 가능한 성장을 지원합니다.',
    'hero.cta.member': '회원 가입',
    'hero.cta.event': '행사 신청',
    'hero.cta.contact': '문의하기',
    'hero.stats.members': '회원사',
    'hero.stats.events': '연간 행사',
    'hero.stats.partnerships': '파트너십',
    'hero.stats.years': '운영 년수',

    // About
    'about.title': '총상회 소개',
    'about.hero.title': '한국 사천-충칭 총상회',
    'about.hero.intro': '한국 사천-충칭 총상회(KSCC)는 한·사천·충칭 재한국의 사천·충칭 총 상회, 전문인사 및 한중 경제교류 인사가 공동 창립한 창업 및 무역 플랫폼입니다.',
    'about.intro.description': '상회는 "한국, 사천, 윈-윈"을 핵심 이념으로 하여, 중국 사천 지역(사천성, 충칭시)의 한국 민간교류, 무역, 투자, 과학기술 및 문화 등 다양한 분야의 심도 있는 협력을 촉진하고, 양국 간 가장 영향력 있는 교류 협력 플랫폼 중 하나가 되고자 합니다.',
    'about.mission.title': '사명',
    'about.mission.description': '\'한·사·윈\'을 합심으로 중한 경제교류의 가교 역할 기능.',
    'about.mission.objective1': '사천·충칭 지역과 한국의 경제무역 교류 및 쌍방향 투자 촉진',
    'about.mission.objective2': '재한 사천·충칭 상회의 상호협력 교류 플랫폼 조성',
    'about.mission.objective3': '문화, 교육, 과학기술, 경제 등 분야의 민간 교류 촉진',
    'about.mission.objective4': '한중 민간 협력의 지속가능한 발전 전략 구축',
    'about.vision.title': '비전',
    'about.vision.description': '한중 양국의 가교가 되어 협력 파트너십을 구축.',
    'about.vision.objective1': '양국의 힘을 결집하는 가교 및 협력 파트너 플랫폼 구축',
    'about.vision.objective2': '한중 기업과 사회 각계각층에 전방위적 가치 제공',
    'about.functions.title': '핵심 기능',
    'about.functions.trade.title': '무역 및 투자 촉진 플랫폼',
    'about.functions.trade.item1': '한국과 사천·충칭 기업에 원스톱 무역 촉진 및 제품 소개 제공',
    'about.functions.trade.item2': '기업의 무역 장벽 및 물류 난제 극복 지원',
    'about.functions.trade.item3': '무역 컨설팅, 정책 해석, 투자유치 및 무역 전시 지원 제공',
    'about.functions.industry.title': '산업 연계 및 전문 컨설팅',
    'about.functions.industry.item1': '한·사천·충칭 문화제 "한국-사천·충칭 문화 및 사천 비즈니스 기회" 개최',
    'about.functions.industry.item2': '한중 양측 조직위원회의 신뢰 관계 촉진',
    'about.functions.industry.item3': '문화, 과학기술 및 공익활동을 통해 이해 증진 및 민족 우호와 발전 도모',
    'about.functions.innovation.title': '혁신 및 종합 서비스',
    'about.functions.innovation.item1': '기업의 혁신 브랜드 발전 전략 전면 촉진',
    'about.functions.innovation.item2': '비즈니스 교류, 비즈니스 미팅, 업계 동맹 회의 조직',
    'about.functions.innovation.item3': '양국 기업 간 협력 기회 모색 및 협력 구축',
    'about.functions.culture.title': '문화 교류 및 사회 발전',
    'about.functions.culture.item1': '기업의 브랜드 및 제품 발전 업무 전시 플랫폼 제공',
    'about.functions.culture.item2': '전문 포럼, 투자 설명회 등 플랫폼 서비스 조직',
    'about.functions.culture.item3': '신생 기업과 중국 우수 기업 간 협력 가치 촉진',
    'about.organization.title': '조직 구조',
    'about.organization.description1': '한국 사천-충칭 총상회는 총회장, 부회장, 사무총장 및 이사회를 두고 있으며, 여러 전문위원회(경제무역, 문화, 과학기술, 청년, 부녀, 공익 등)를 산하에 두고 있습니다.',
    'about.organization.description2': '전문화된 관리와 협력적 조직을 통해 상회의 효율적인 운영과 서비스 제공을 보장합니다.',
    'about.organization.description3': '한중 무역 가교의 다층적이고 역동적인 발전을 지속적으로 추진합니다.',
    'about.organization.president': '회장',
    'about.organization.vicePresident': '부회장',
    'about.organization.secretary': '사무국장',
    'about.organization.advisor': '고문',
    'about.future.title': '손잡고 동행하며 미래를 함께 창조',
    'about.future.description1': '미래를 전망하며, 한국 사천-충칭 총상회는 교류 심화와 한중 무역 가교의 양방향 투자 발전에 확고히 전념하며, 혁신적인 자세로 산업 구조를 구축하고 육성할 것입니다.',
    'about.future.description2': '앞으로 상회는 무역 교류 영역을 지속적으로 확대하고, 새로운 자원을 발굴하며, 지식 이전, 문화 무역, 의료 건강, 교육 훈련 등 혁신 분야의 조직 협력을 강화하여, "사천-충칭 인연"과 "한국 연분"이 글로벌 무대에서 빛나도록 할 것입니다!',
    'about.pillars.business.title': '기업 연계',
    'about.pillars.business.description': '한중 기업 간 비즈니스 협력 및 교류 촉진',
    'about.pillars.culture.title': '문화 교류',
    'about.pillars.culture.description': '한중 문화, 교육, 과학기술 교류 추진',
    'about.pillars.legal.title': '법률 서비스',
    'about.pillars.legal.description': '전문적인 법률 컨설팅 및 지원 서비스 제공',

    // News
    'news.title': '최신 소식',
    'news.latest': '최신 뉴스',
    'news.categories.notice': '공지사항',
    'news.categories.press': '보도자료',
    'news.categories.activity': '활동소식',
    'news.readMore': '자세히 보기',
    'news.viewAll': '전체 뉴스',

    // Events
    'events.title': '다가오는 행사',
    'events.upcoming': '예정된 행사',
    'events.register': '신청하기',
    'events.categories.networking': '네트워킹',
    'events.categories.seminar': '세미나',
    'events.categories.workshop': '워크샵',
    'events.categories.cultural': '문화',
    'events.type.offline': '대면',
    'events.type.online': '온라인',
    'events.type.hybrid': '하이브리드',
    'events.seatsRemaining': '잔여 좌석',
    'events.unlimited': '무제한',
    'events.full': '마감',

    // Members
    'members.title': '회원사 디렉토리',
    'members.directory': '회원사 목록',
    'members.search.company': '회사명 검색',
    'members.search.country': '국가',
    'members.search.industry': '업종',
    'members.search.level': '회원등급',
    'members.levels.regular': '정회원',
    'members.levels.premium': '프리미엄',
    'members.levels.sponsor': '후원회원',
    'members.contact': '연락하기',
    'members.viewProfile': '프로필 보기',

    // Resources
    'resources.title': '자료센터',
    'resources.categories.reports': '보고서',
    'resources.categories.forms': '양식',
    'resources.categories.presentations': '발표자료',
    'resources.categories.guides': '가이드북',
    'resources.access.public': '공개',
    'resources.access.members': '회원전용',
    'resources.access.premium': '프리미엄',
    'resources.loginRequired': '로그인 필요',

    // Contact
    'contact.title': '연락처',
    'contact.form.title': '문의하기',
    'contact.form.category': '문의 분류',
    'contact.form.categories.membership': '회원 가입 문의',
    'contact.form.categories.event': '행사 문의',
    'contact.form.categories.partnership': '파트너십 문의',
    'contact.form.categories.other': '기타',
    'contact.form.name': '이름',
    'contact.form.company': '회사명',
    'contact.form.email': '이메일',
    'contact.form.phone': '전화번호',
    'contact.form.subject': '제목',
    'contact.form.message': '내용',
    'contact.form.privacy': '개인정보 수집 및 이용에 동의합니다',
    'contact.form.send': '문의 보내기',
    'contact.office.title': '사무국 정보',
    'contact.office.address': '주소',
    'contact.office.phone': '전화',
    'contact.office.email': '이메일',
    'contact.office.hours': '운영 시간',
    'contact.office.weekdays': '평일 09:00-18:00',
    'contact.office.lunch': '점심시간 12:00-13:00',
    'contact.office.weekend': '주말 및 공휴일 휴무',

    // Auth
    'auth.login.title': '로그인',
    'auth.login.email': '이메일',
    'auth.login.password': '비밀번호',
    'auth.login.submit': '로그인',
    'auth.login.register': '회원가입',
    'auth.register.title': '회원가입',
    'auth.register.name': '이름',
    'auth.register.email': '이메일',
    'auth.register.password': '비밀번호',
    'auth.register.confirmPassword': '비밀번호 확인',
    'auth.register.submit': '회원가입',
    'auth.register.login': '로그인',
    'auth.logout': '로그아웃',

    // Dashboard
    'dashboard.title': 'My Page',
    'dashboard.profile': '프로필',
    'dashboard.membership': '멤버십',
    'dashboard.events': '내 행사',
    'dashboard.resources': '리소스',

    // Admin
    'admin.title': '관리자 패널',
    'admin.dashboard': '대시보드',
    'admin.members': '회원 관리',
    'admin.events': '행사 관리',
    'admin.news': '뉴스 관리',
    'admin.resources': '자료 관리',
    'admin.inquiries': '문의 관리',
    'admin.partners': '파트너 관리',
  },
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.about': 'About',
    'nav.news': 'News',
    'nav.events': 'Events',
    'nav.members': 'Members',
    'nav.resources': 'Resources',
    'nav.contact': 'Contact',
    'nav.login': 'Login',
    'nav.register': 'Register',
    'nav.dashboard': 'My Page',
    'nav.admin': 'Admin',
    'nav.logout': 'Logout',

    // Common
    'common.loading': 'Loading...',
    'common.error': 'An error occurred',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.submit': 'Submit',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.all': 'All',
    'common.page': 'Page',
    'common.of': 'of',
    'common.next': 'Next',
    'common.previous': 'Previous',
    'common.more': 'More',
    'common.less': 'Less',
    'common.download': 'Download',
    'common.share': 'Share',
    'common.contact': 'Contact',
    'common.date': 'Date',
    'common.location': 'Location',
    'common.category': 'Category',
    'common.status': 'Status',

    // Hero Section
    'hero.title': 'Korea-Sichuan-Chongqing Economic & Cultural Exchange Hub',
    'hero.subtitle': '한·사천·충칭 경제문화 교류의 중심',
    'hero.description': 'Promoting economic, trade and cultural exchanges between Korea and Western China (Sichuan Province, Chongqing), strengthening mutual understanding and cooperation between companies of both countries for sustainable growth.',
    'hero.cta.member': 'Join as Member',
    'hero.cta.event': 'Register for Events',
    'hero.cta.contact': 'Contact Us',
    'hero.stats.members': 'Members',
    'hero.stats.events': 'Annual Events',
    'hero.stats.partnerships': 'Partnerships',
    'hero.stats.years': 'Years of Service',

    // About
    'about.title': 'About KSCC',
    'about.hero.title': 'Korea Sichuan-Chongqing Chamber of Commerce',
    'about.hero.intro': 'The Korea Sichuan-Chongqing Chamber of Commerce (KSCC) is an entrepreneurship and trade platform jointly established by Korean-Sichuan-Chongqing professionals and China-Korea economic exchange professionals in Korea.',
    'about.intro.description': 'The Chamber operates with the core philosophy of "Korea, Sichuan, Win-Win", promoting in-depth cooperation between Korea and China\'s Sichuan region (Sichuan Province, Chongqing Municipality) in various fields including trade, investment, technology, and culture, aiming to become one of the most influential exchange and cooperation platforms between the two countries.',
    'about.mission.title': 'Mission',
    'about.mission.description': 'With "Korea-Sichuan-Win" as the core, building bridges for China-Korea economic exchange.',
    'about.mission.objective1': 'Promote economic and trade exchange and bilateral investment between Sichuan-Chongqing region and Korea',
    'about.mission.objective2': 'Create mutual cooperation and exchange platform for Sichuan-Chongqing chambers in Korea',
    'about.mission.objective3': 'Facilitate civil exchange in culture, education, technology, and economy',
    'about.mission.objective4': 'Build sustainable development strategy for China-Korea civil cooperation',
    'about.vision.title': 'Vision',
    'about.vision.description': 'Becoming a bridge between two countries to establish cooperative partnership.',
    'about.vision.objective1': 'Build a platform that brings together forces from both countries as a bridge and cooperative partner',
    'about.vision.objective2': 'Provide comprehensive value to companies and all sectors of Korean and Chinese society',
    'about.functions.title': 'Core Functions',
    'about.functions.trade.title': 'Trade and Investment Promotion Platform',
    'about.functions.trade.item1': 'Provide one-stop trade promotion and product introduction for Korean and Sichuan-Chongqing companies',
    'about.functions.trade.item2': 'Help companies overcome trade barriers and logistics challenges',
    'about.functions.trade.item3': 'Provide trade consulting, policy interpretation, investment attraction and trade exhibition support',
    'about.functions.industry.title': 'Industry Matching & Professional Consulting',
    'about.functions.industry.item1': 'Host Korea-Sichuan-Chongqing Cultural Festival "Korea-Sichuan-Chongqing Culture and Sichuan Business Opportunities"',
    'about.functions.industry.item2': 'Promote trust relationship between Korea-China organizing committees',
    'about.functions.industry.item3': 'Enhance understanding and promote national friendship and development through culture, technology and charity activities',
    'about.functions.innovation.title': 'Innovation & Comprehensive Services',
    'about.functions.innovation.item1': 'Fully promote enterprise innovation brand development strategy',
    'about.functions.innovation.item2': 'Organize business exchanges, business meetings, industry alliance conferences',
    'about.functions.innovation.item3': 'Explore cooperation opportunities and build partnerships between companies from both countries',
    'about.functions.culture.title': 'Cultural Exchange & Social Development',
    'about.functions.culture.item1': 'Provide platform for companies to display brands and product development work',
    'about.functions.culture.item2': 'Organize specialized forums, investment presentations and other platform services',
    'about.functions.culture.item3': 'Promote cooperation value between startups and excellent Chinese companies',
    'about.organization.title': 'Organization Structure',
    'about.organization.description1': 'Korea Sichuan-Chongqing Chamber of Commerce has a President, Vice Presidents, Secretary General and Board of Directors, with several specialized committees (economic trade, culture, technology, youth, women, public welfare, etc.).',
    'about.organization.description2': 'Through specialized management and collaborative organization, ensure efficient operation and service delivery of the Chamber.',
    'about.organization.description3': 'Continuously promote multi-level and dynamic development of the China-Korea trade bridge.',
    'about.organization.president': 'President',
    'about.organization.vicePresident': 'Vice President',
    'about.organization.secretary': 'Secretary General',
    'about.organization.advisor': 'Advisor',
    'about.future.title': 'Together Towards a Shared Future',
    'about.future.description1': 'Looking to the future, Korea Sichuan-Chongqing Chamber of Commerce is firmly committed to deepening exchanges and developing bilateral investment in the China-Korea trade bridge, building and nurturing industrial structures with an innovative attitude.',
    'about.future.description2': 'In the future, the Chamber will continuously expand trade exchange areas, unlock new resources, transfer knowledge, and strengthen organizational cooperation in innovative fields such as cultural trade, healthcare, and educational training, making "Sichuan-Chongqing connection" and "Korea connection" shine on the global stage!',
    'about.pillars.business.title': 'Business Matching',
    'about.pillars.business.description': 'Promote business cooperation and exchange between Korean and Chinese enterprises',
    'about.pillars.culture.title': 'Cultural Exchange',
    'about.pillars.culture.description': 'Advance Korean-Chinese cultural, educational, and technological exchange',
    'about.pillars.legal.title': 'Legal Services',
    'about.pillars.legal.description': 'Provide professional legal consulting and support services',

    // News
    'news.title': 'Latest News',
    'news.latest': 'Recent News',
    'news.categories.notice': 'Notices',
    'news.categories.press': 'Press Releases',
    'news.categories.activity': 'Activities',
    'news.readMore': 'Read More',
    'news.viewAll': 'All News',

    // Events
    'events.title': 'Upcoming Events',
    'events.upcoming': 'Scheduled Events',
    'events.register': 'Register',
    'events.categories.networking': 'Networking',
    'events.categories.seminar': 'Seminar',
    'events.categories.workshop': 'Workshop',
    'events.categories.cultural': 'Cultural',
    'events.type.offline': 'In-Person',
    'events.type.online': 'Online',
    'events.type.hybrid': 'Hybrid',
    'events.seatsRemaining': 'Seats Remaining',
    'events.unlimited': 'Unlimited',
    'events.full': 'Full',

    // Members
    'members.title': 'Member Directory',
    'members.directory': 'Member List',
    'members.search.company': 'Search Company',
    'members.search.country': 'Country',
    'members.search.industry': 'Industry',
    'members.search.level': 'Membership Level',
    'members.levels.regular': 'Regular',
    'members.levels.premium': 'Premium',
    'members.levels.sponsor': 'Sponsor',
    'members.contact': 'Contact',
    'members.viewProfile': 'View Profile',

    // Resources
    'resources.title': 'Resource Center',
    'resources.categories.reports': 'Reports',
    'resources.categories.forms': 'Forms',
    'resources.categories.presentations': 'Presentations',
    'resources.categories.guides': 'Guides',
    'resources.access.public': 'Public',
    'resources.access.members': 'Members Only',
    'resources.access.premium': 'Premium',
    'resources.loginRequired': 'Login Required',

    // Contact
    'contact.title': 'Contact Us',
    'contact.form.title': 'Send Inquiry',
    'contact.form.category': 'Inquiry Category',
    'contact.form.categories.membership': 'Membership Inquiry',
    'contact.form.categories.event': 'Event Inquiry',
    'contact.form.categories.partnership': 'Partnership Inquiry',
    'contact.form.categories.other': 'Other',
    'contact.form.name': 'Name',
    'contact.form.company': 'Company',
    'contact.form.email': 'Email',
    'contact.form.phone': 'Phone',
    'contact.form.subject': 'Subject',
    'contact.form.message': 'Message',
    'contact.form.privacy': 'I agree to the collection and use of personal information',
    'contact.form.send': 'Send Inquiry',
    'contact.office.title': 'Office Information',
    'contact.office.address': 'Address',
    'contact.office.phone': 'Phone',
    'contact.office.email': 'Email',
    'contact.office.hours': 'Operating Hours',
    'contact.office.weekdays': 'Weekdays 09:00-18:00',
    'contact.office.lunch': 'Lunch 12:00-13:00',
    'contact.office.weekend': 'Closed on weekends and holidays',

    // Auth
    'auth.login.title': 'Login',
    'auth.login.email': 'Email',
    'auth.login.password': 'Password',
    'auth.login.submit': 'Login',
    'auth.login.register': 'Register',
    'auth.register.title': 'Register',
    'auth.register.name': 'Name',
    'auth.register.email': 'Email',
    'auth.register.password': 'Password',
    'auth.register.confirmPassword': 'Confirm Password',
    'auth.register.submit': 'Register',
    'auth.register.login': 'Login',
    'auth.logout': 'Logout',

    // Dashboard
    'dashboard.title': 'My Page',
    'dashboard.profile': 'Profile',
    'dashboard.membership': 'Membership',
    'dashboard.events': 'My Events',
    'dashboard.resources': 'Resources',

    // Admin
    'admin.title': 'Admin Panel',
    'admin.dashboard': 'Dashboard',
    'admin.members': 'Member Management',
    'admin.events': 'Event Management',
    'admin.news': 'News Management',
    'admin.resources': 'Resource Management',
    'admin.inquiries': 'Inquiry Management',
    'admin.partners': 'Partner Management',
  },
  zh: {
    // Navigation
    'nav.home': '首页',
    'nav.about': '关于我们',
    'nav.news': '新闻',
    'nav.events': '活动',
    'nav.members': '会员',
    'nav.resources': '资料中心',
    'nav.contact': '联系我们',
    'nav.login': '登录',
    'nav.register': '注册',
    'nav.dashboard': 'My Page',
    'nav.admin': '管理员',
    'nav.logout': '登出',

    // Common
    'common.loading': '加载中...',
    'common.error': '发生错误',
    'common.save': '保存',
    'common.cancel': '取消',
    'common.submit': '提交',
    'common.search': '搜索',
    'common.filter': '筛选',
    'common.all': '全部',
    'common.page': '页面',
    'common.of': '的',
    'common.next': '下一页',
    'common.previous': '上一页',
    'common.more': '更多',
    'common.less': '收起',
    'common.download': '下载',
    'common.share': '分享',
    'common.contact': '联系',
    'common.date': '日期',
    'common.location': '地点',
    'common.category': '分类',
    'common.status': '状态',

    // Hero Section
    'hero.title': '韩国·四川·重庆经济文化交流中心',
    'hero.subtitle': 'Korea-Sichuan-Chongqing Economic & Cultural Exchange Hub',
    'hero.description': '促进韩国与中国西部地区（四川省、重庆市）之间的经贸文化交流，加强两国企业的相互理解与合作，支持可持续发展。',
    'hero.cta.member': '加入会员',
    'hero.cta.event': '活动报名',
    'hero.cta.contact': '联系我们',
    'hero.stats.members': '会员企业',
    'hero.stats.events': '年度活动',
    'hero.stats.partnerships': '合作伙伴',
    'hero.stats.years': '运营年数',

    // About
    'about.title': '商会介绍',
    'about.hero.title': '韩国川渝总商会',
    'about.hero.intro': '韩国川渝总商会（KSCC）是韩·川渝在韩国的川渝总商会，专业人士及中韩经济交流人士共同创立的创业及贸易平台。',
    'about.intro.description': '商会以"韩国、四川、共赢"为核心理念，致力于推动中国四川地区（四川省、重庆市）的韩国民间交流、贸易、投资、科技及文化等多领域的深度合作，成为两国之间最具影响力的交流合作平台之一。',
    'about.mission.title': '使命',
    'about.mission.description': '以"韩·川·赢"为核心，搭建中韩经济交流的桥梁作用。',
    'about.mission.objective1': '促进川渝地区与韩国的经济贸易往来与双向投资',
    'about.mission.objective2': '创造在韩川渝商会的互助交流平台',
    'about.mission.objective3': '促进文化、教育、科技、经济等领域的民间交流',
    'about.mission.objective4': '构建中韩民间合作的可持续发展长远战略',
    'about.vision.title': '愿景',
    'about.vision.description': '成为撮合两国力量的桥梁和推力合作伙伴平台。',
    'about.vision.objective1': '成为撮合两国力量的桥梁和推力合作伙伴平台',
    'about.vision.objective2': '为中韩企业、社会各个人员提供全知识互在价值',
    'about.functions.title': '核心功能',
    'about.functions.trade.title': '贸易与投资促进平台',
    'about.functions.trade.item1': '为韩国与韩国企业提供一站式贸易促销与产品推介',
    'about.functions.trade.item2': '协助企业克服贸易壁垒及流通难题',
    'about.functions.trade.item3': '提供贸易咨询、政策解读、投融资及贸易展览支持',
    'about.functions.industry.title': '产业对接与专业咨询',
    'about.functions.industry.item1': '韩方川渝文化节"韩国-座韩国文化与四川"贵族商机"举办',
    'about.functions.industry.item2': '推动中韩双方组委会诚信关系',
    'about.functions.industry.item3': '通过文化、科技及公益活动，增进理解与民族友谊与发展',
    'about.functions.innovation.title': '创新与综合服务',
    'about.functions.innovation.item1': '全面促进企业积极创新品牌发展战略',
    'about.functions.innovation.item2': '组织商考察、商务对接、行业联盟会议',
    'about.functions.innovation.item3': '构建两国企业共商机遇、协商野合作',
    'about.functions.culture.title': '文化交流与社会发展',
    'about.functions.culture.item1': '为企业企业展示企业品牌及产品发展业务',
    'about.functions.culture.item2': '组织专题论坛、投资推介等平台服务',
    'about.functions.culture.item3': '推动新创企与中国在优质企业合作价值',
    'about.organization.title': '组织架构',
    'about.organization.description1': '韩国川渝总商会设立总会长、副会长、秘书长及理事会，并下设多个专业委员会（经贸、文化、科技、青年、妇女、公益等）。',
    'about.organization.description2': '通过专业化管理与协同化组织，确保商会高效运作服务开展。',
    'about.organization.description3': '持续推进在中韩贸易桥梁多层次及动态力。',
    'about.organization.president': '会长',
    'about.organization.vicePresident': '副会长',
    'about.organization.secretary': '秘书长',
    'about.organization.advisor': '顾问',
    'about.future.title': '携手同行 共创未来',
    'about.future.description1': '展望未来，韩国川渝总商会将坚定地致力于深化交流与韩国贸易桥梁双向投资发展，韩国川渝总商会正以开拓创新的姿态融通产业构建与培育。',
    'about.future.description2': '未来，商会将持续拓展贸易交流领域，解锁新资源、转移知能，转化知能，文化贸易、医疗健康、教育培训创新领域的组织架构合作，让"川渝情缘"与"韩国缘"在全球格局上交相辉映！',
    'about.pillars.business.title': '企业对接',
    'about.pillars.business.description': '促进中韩企业间的商务合作与交流',
    'about.pillars.culture.title': '文化交流',
    'about.pillars.culture.description': '推动中韩文化、教育、科技交流',
    'about.pillars.legal.title': '法律服务',
    'about.pillars.legal.description': '提供专业的法律咨询和支持服务',

    // News
    'news.title': '最新消息',
    'news.latest': '最新新闻',
    'news.categories.notice': '通知',
    'news.categories.press': '新闻发布',
    'news.categories.activity': '活动资讯',
    'news.readMore': '阅读更多',
    'news.viewAll': '全部新闻',

    // Events
    'events.title': '即将举行的活动',
    'events.upcoming': '预定活动',
    'events.register': '报名',
    'events.categories.networking': '网络交流',
    'events.categories.seminar': '研讨会',
    'events.categories.workshop': '工作坊',
    'events.categories.cultural': '文化',
    'events.type.offline': '线下',
    'events.type.online': '线上',
    'events.type.hybrid': '混合',
    'events.seatsRemaining': '剩余座位',
    'events.unlimited': '无限制',
    'events.full': '已满',

    // Members
    'members.title': '会员目录',
    'members.directory': '会员列表',
    'members.search.company': '搜索公司',
    'members.search.country': '国家',
    'members.search.industry': '行业',
    'members.search.level': '会员级别',
    'members.levels.regular': '正式会员',
    'members.levels.premium': '高级会员',
    'members.levels.sponsor': '赞助会员',
    'members.contact': '联系',
    'members.viewProfile': '查看资料',

    // Resources
    'resources.title': '资料中心',
    'resources.categories.reports': '报告',
    'resources.categories.forms': '表格',
    'resources.categories.presentations': '演示文稿',
    'resources.categories.guides': '指南',
    'resources.access.public': '公开',
    'resources.access.members': '会员专用',
    'resources.access.premium': '高级会员',
    'resources.loginRequired': '需要登录',

    // Contact
    'contact.title': '联系我们',
    'contact.form.title': '发送咨询',
    'contact.form.category': '咨询分类',
    'contact.form.categories.membership': '会员咨询',
    'contact.form.categories.event': '活动咨询',
    'contact.form.categories.partnership': '合作咨询',
    'contact.form.categories.other': '其他',
    'contact.form.name': '姓名',
    'contact.form.company': '公司',
    'contact.form.email': '邮箱',
    'contact.form.phone': '电话',
    'contact.form.subject': '主题',
    'contact.form.message': '留言',
    'contact.form.privacy': '我同意个人信息收集和使用',
    'contact.form.send': '发送咨询',
    'contact.office.title': '办公室信息',
    'contact.office.address': '地址',
    'contact.office.phone': '电话',
    'contact.office.email': '邮箱',
    'contact.office.hours': '营业时间',
    'contact.office.weekdays': '工作日 09:00-18:00',
    'contact.office.lunch': '午休 12:00-13:00',
    'contact.office.weekend': '周末和节假日休息',

    // Auth
    'auth.login.title': '登录',
    'auth.login.email': '邮箱',
    'auth.login.password': '密码',
    'auth.login.submit': '登录',
    'auth.login.register': '注册',
    'auth.register.title': '注册',
    'auth.register.name': '姓名',
    'auth.register.email': '邮箱',
    'auth.register.password': '密码',
    'auth.register.confirmPassword': '确认密码',
    'auth.register.submit': '注册',
    'auth.register.login': '登录',
    'auth.logout': '登出',

    // Dashboard
    'dashboard.title': 'My Page',
    'dashboard.profile': '个人资料',
    'dashboard.membership': '会员资格',
    'dashboard.events': '我的活动',
    'dashboard.resources': '资源',

    // Admin
    'admin.title': '管理面板',
    'admin.dashboard': '控制面板',
    'admin.members': '会员管理',
    'admin.events': '活动管理',
    'admin.news': '新闻管理',
    'admin.resources': '资源管理',
    'admin.inquiries': '咨询管理',
    'admin.partners': '合作伙伴管理',
  },
};

let currentLanguage: Language = 'ko';

export function getCurrentLanguage(): Language {
  return currentLanguage;
}

export function setLanguage(lang: Language): void {
  currentLanguage = lang;
  localStorage.setItem('language', lang);
  document.documentElement.lang = lang;
  document.documentElement.className = `lang-${lang}`;
}

export function initializeLanguage(): void {
  const saved = localStorage.getItem('language') as Language;
  const browser = navigator.language.split('-')[0] as Language;
  const detected = saved || (translations[browser] ? browser : 'ko');
  setLanguage(detected);
}

export function t(key: keyof TranslationKeys): string {
  return translations[currentLanguage][key] || key;
}
