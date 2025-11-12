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
  'about.mission.title': string;
  'about.mission.description': string;
  'about.vision.title': string;
  'about.vision.description': string;
  'about.values.trust': string;
  'about.values.cooperation': string;
  'about.values.innovation': string;
  'about.values.growth': string;
  'about.organization.title': string;
  'about.organization.president': string;
  'about.organization.vicePresident': string;
  'about.organization.secretary': string;
  'about.organization.advisor': string;

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
    'about.mission.title': '우리의 미션',
    'about.mission.description': '한국과 중국 서부지역(사천성, 충칭시) 간의 경제·무역·문화 교류를 촉진하고, 양국 기업의 상호 이해와 협력을 강화하여 지속 가능한 성장을 지원합니다.',
    'about.vision.title': '비전과 가치',
    'about.vision.description': '한·중 경제협력의 가교 역할을 수행하며, 회원사의 성공적인 진출과 성장을 적극 지원하는 최고의 상공인 단체가 되는 것을 목표로 합니다.',
    'about.values.trust': '신뢰',
    'about.values.cooperation': '협력',
    'about.values.innovation': '혁신',
    'about.values.growth': '성장',
    'about.organization.title': '조직도',
    'about.organization.president': '회장',
    'about.organization.vicePresident': '부회장',
    'about.organization.secretary': '사무국장',
    'about.organization.advisor': '고문',

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
    'about.mission.title': 'Our Mission',
    'about.mission.description': 'To promote economic, trade and cultural exchanges between Korea and Western China (Sichuan Province, Chongqing), strengthen mutual understanding and cooperation between companies of both countries for sustainable growth.',
    'about.vision.title': 'Vision & Values',
    'about.vision.description': 'To become the leading business organization that serves as a bridge for Korea-China economic cooperation and actively supports the successful expansion and growth of member companies.',
    'about.values.trust': 'Trust',
    'about.values.cooperation': 'Cooperation',
    'about.values.innovation': 'Innovation',
    'about.values.growth': 'Growth',
    'about.organization.title': 'Organization Chart',
    'about.organization.president': 'President',
    'about.organization.vicePresident': 'Vice President',
    'about.organization.secretary': 'Secretary General',
    'about.organization.advisor': 'Advisor',

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
    'about.mission.title': '我们的使命',
    'about.mission.description': '促进韩国与中国西部地区（四川省、重庆市）之间的经贸文化交流，加强两国企业的相互理解与合作，支持可持续发展。',
    'about.vision.title': '愿景与价值',
    'about.vision.description': '成为韩中经济合作的桥梁，积极支持会员企业成功扩张和成长的顶级商业组织。',
    'about.values.trust': '信任',
    'about.values.cooperation': '合作',
    'about.values.innovation': '创新',
    'about.values.growth': '成长',
    'about.organization.title': '组织架构',
    'about.organization.president': '会长',
    'about.organization.vicePresident': '副会长',
    'about.organization.secretary': '秘书长',
    'about.organization.advisor': '顾问',

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
