WITH seed (
  source_record_key,
  organization_type,
  name_ko,
  summary_ko,
  website_url,
  source_url,
  verification_status
) AS (
  VALUES
    ('kccci', '중국계 상회', '한국중화총상회 (KCCCI)', '한국 내 화교·화상 및 중국계 기업 네트워크를 기반으로 경제·무역·문화 교류를 지원합니다.', 'https://www.kccci.kr/kr/', 'https://www.kccci.kr/kr/activity/', 'verified_official'),
    ('kscc', '지역 특화 상회', '한국 사천-충칭 총상회 (KSCC)', '한국과 중국 쓰촨성·충칭시 간 경제·무역·문화 교류, 기업 매칭 및 시장 진출을 지원합니다.', 'https://kscc.kr/', 'https://kscc.kr/', 'verified_official'),
    ('korea-china-economic-association', '경제', '사단법인 한중경제협회', '한중 경제·무역 협력과 민간 경제 교류를 지원합니다.', NULL, 'https://kr.china-embassy.gov.cn/kor/sgxx/202603/t20260303_11867901.htm', 'verified_register'),
    ('kcea', '기업', '사단법인 한중기업가협회 (KCEA)', '양국 기업 네트워크, 비즈니스 매칭, 한국 기업의 중국 진출을 지원합니다.', 'https://korchnea.com/', 'https://korchnea.com/', 'verified_official'),
    ('kapea', '경제/민관', '사단법인 한국아태경제협회', '한중민간경제협력포럼을 기반으로 중국 지방정부·기업과 경제협력포럼을 운영합니다.', 'https://kapea.kr/', 'https://kapea.kr/', 'verified_official'),
    ('korea-china-exchange-association', '종합교류', '사단법인 한중교류협회', '경제·문화 등 한중 민간교류와 협력을 추진하는 외교부 승인 비영리 외교단체입니다.', 'https://korchi.org/', 'https://korchi.org/?act=info.page&pcode=sub1_2', 'verified_official'),
    ('korea-china-global-association', '종합교류', '사단법인 한중글로벌협회', '경제·사회·문화 교류, 기업 진출, 지방정부 연결과 포럼을 운영합니다.', 'https://kcglobal.or.kr/', 'https://kcglobal.or.kr/page/about-us.php', 'verified_official'),
    ('korea-china-friendship-federation', '연합 네트워크', '한중우호연합총회', '여러 한중 우호 사회단체가 참여하는 연합 네트워크입니다.', 'https://kcglobal.or.kr/page/federation.php', 'https://kcglobal.or.kr/page/federation.php', 'verified_official'),
    ('korea-china-friendship-association', '우호/외교', '사단법인 한중우호협회', '한중 우호, 민간외교 및 청년교류를 추진하는 외교부 소관 비영리법인입니다.', 'http://www.korea-china.or.kr/', 'https://bizno.net/article/1048204717', 'verified_register'),
    ('korea-china-city-friendship-association', '지역정부', '사단법인 한중도시우호협회', '한국과 중국의 도시 및 지방정부 간 교류와 협력을 지원합니다.', NULL, 'https://www.nicebizinfo.com/ep/EP0100M002GE.nice?kiscode=HR3680', 'verified_register'),
    ('korea-china-education-exchange-association', '교육', '사단법인 한중교육교류협회', '한국·중국 대학 및 교육기관 교류와 유학·교육 네트워크를 지원합니다.', 'https://www.kochina.or.kr/', 'https://www.kochina.or.kr/', 'verified_official'),
    ('korea-china-cultural-friendship-association', '문화', '사단법인 한중문화우호협회', '한중 문화·예술·청소년·학술 교류를 추진하는 문체부 등록 비영리법인입니다.', 'https://www.mcst.go.kr/site/s_data/corpNaru/corpView.jsp?pSeq=1221', 'https://www.mcst.go.kr/site/s_data/corpNaru/corpView.jsp?pSeq=1221', 'verified_register'),
    ('kccea', '경제·문화·교육', '사단법인 한중경제문화교육협회', '한중 민간협력, 교육·문화교류 및 중국어 관련 사업을 추진합니다.', 'http://kccea.com/', 'https://www.saramin.co.kr/zf_user/company-info/view/csn/SkhmUkcvYStiR0VuMjJ4emUraWdsQT09/company_nm/%28%EC%82%AC%29%ED%95%9C%EC%A4%91%EA%B2%BD%EC%A0%9C%EB%AC%B8%ED%99%94%EA%B5%90%EC%9C%A1%ED%98%91%ED%9A%8C', 'verified_register'),
    ('korea-china-beauty-industry-association', '산업', '사단법인 한중뷰티산업협회', '한중 뷰티산업 교류, 회원사 경제교류, 중국 진출 및 투자유치를 지원합니다.', 'https://k-beauty.or.kr/', 'https://k-beauty.or.kr/aboutus', 'verified_official'),
    ('korea-china-law-association', '법률/학술', '한중법학회', '중국법 연구, 법률 전문가 교류, 중국법제포럼 및 학술활동을 수행합니다.', 'https://www.kochilaw.or.kr/', 'https://www.kochilaw.or.kr/', 'verified_official'),
    ('korean-association-contemporary-china-studies', '연구·문화', '사단법인 한국현대중국연구회', '중국 관련 학술·문화 연구와 한중 문화교류를 수행하는 문체부 등록 법인입니다.', 'https://www.mcst.go.kr/kor/s_data/corpNaru/corpView.jsp?pSeq=1188', 'https://www.mcst.go.kr/kor/s_data/corpNaru/corpView.jsp?pSeq=1188', 'verified_register'),
    ('korea-overseas-chinese-federation', '화교·화인', '한국화교화인연합총회', '한국에 거주하는 화교·화인의 교류와 협력을 위한 민간 네트워크입니다.', NULL, 'https://www.bizno.net/article/2998001182', 'verified_register')
)
INSERT INTO "member_service_organizations" (
  "source_system",
  "source_record_key",
  "organization_type",
  "base_country",
  "summary_ko",
  "website_url",
  "verification_status",
  "source_type",
  "source_url",
  "last_verified_at",
  "next_review_at",
  "review_note",
  "is_active",
  "public_approved",
  "updated_at"
)
SELECT
  'user_curated_korea_china_directory_v1',
  source_record_key,
  organization_type,
  'KR',
  summary_ko,
  website_url,
  verification_status,
  'user_supplied_reference',
  source_url,
  now(),
  CASE
    WHEN verification_status = 'verified_register' THEN now() + interval '365 days'
    ELSE now() + interval '180 days'
  END,
  '사용자가 제공한 한중기관 구성안을 바탕으로 등록',
  true,
  true,
  now()
FROM seed
ON CONFLICT ("source_system", "source_record_key") DO UPDATE SET
  "organization_type" = EXCLUDED."organization_type",
  "summary_ko" = EXCLUDED."summary_ko",
  "website_url" = EXCLUDED."website_url",
  "source_type" = EXCLUDED."source_type",
  "source_url" = EXCLUDED."source_url",
  "updated_at" = now();
--> statement-breakpoint

WITH seed (source_record_key, name_ko, summary_ko) AS (
  VALUES
    ('kccci', '한국중화총상회 (KCCCI)', '한국 내 화교·화상 및 중국계 기업 네트워크를 기반으로 경제·무역·문화 교류를 지원합니다.'),
    ('kscc', '한국 사천-충칭 총상회 (KSCC)', '한국과 중국 쓰촨성·충칭시 간 경제·무역·문화 교류, 기업 매칭 및 시장 진출을 지원합니다.'),
    ('korea-china-economic-association', '사단법인 한중경제협회', '한중 경제·무역 협력과 민간 경제 교류를 지원합니다.'),
    ('kcea', '사단법인 한중기업가협회 (KCEA)', '양국 기업 네트워크, 비즈니스 매칭, 한국 기업의 중국 진출을 지원합니다.'),
    ('kapea', '사단법인 한국아태경제협회', '한중민간경제협력포럼을 기반으로 중국 지방정부·기업과 경제협력포럼을 운영합니다.'),
    ('korea-china-exchange-association', '사단법인 한중교류협회', '경제·문화 등 한중 민간교류와 협력을 추진하는 외교부 승인 비영리 외교단체입니다.'),
    ('korea-china-global-association', '사단법인 한중글로벌협회', '경제·사회·문화 교류, 기업 진출, 지방정부 연결과 포럼을 운영합니다.'),
    ('korea-china-friendship-federation', '한중우호연합총회', '여러 한중 우호 사회단체가 참여하는 연합 네트워크입니다.'),
    ('korea-china-friendship-association', '사단법인 한중우호협회', '한중 우호, 민간외교 및 청년교류를 추진하는 외교부 소관 비영리법인입니다.'),
    ('korea-china-city-friendship-association', '사단법인 한중도시우호협회', '한국과 중국의 도시 및 지방정부 간 교류와 협력을 지원합니다.'),
    ('korea-china-education-exchange-association', '사단법인 한중교육교류협회', '한국·중국 대학 및 교육기관 교류와 유학·교육 네트워크를 지원합니다.'),
    ('korea-china-cultural-friendship-association', '사단법인 한중문화우호협회', '한중 문화·예술·청소년·학술 교류를 추진하는 문체부 등록 비영리법인입니다.'),
    ('kccea', '사단법인 한중경제문화교육협회', '한중 민간협력, 교육·문화교류 및 중국어 관련 사업을 추진합니다.'),
    ('korea-china-beauty-industry-association', '사단법인 한중뷰티산업협회', '한중 뷰티산업 교류, 회원사 경제교류, 중국 진출 및 투자유치를 지원합니다.'),
    ('korea-china-law-association', '한중법학회', '중국법 연구, 법률 전문가 교류, 중국법제포럼 및 학술활동을 수행합니다.'),
    ('korean-association-contemporary-china-studies', '사단법인 한국현대중국연구회', '중국 관련 학술·문화 연구와 한중 문화교류를 수행하는 문체부 등록 법인입니다.'),
    ('korea-overseas-chinese-federation', '한국화교화인연합총회', '한국에 거주하는 화교·화인의 교류와 협력을 위한 민간 네트워크입니다.')
)
INSERT INTO "member_service_organization_localizations" (
  "organization_id",
  "locale",
  "official_name",
  "display_name",
  "summary",
  "is_official",
  "updated_at"
)
SELECT
  organization.id,
  'ko',
  seed.name_ko,
  seed.name_ko,
  seed.summary_ko,
  true,
  now()
FROM seed
INNER JOIN "member_service_organizations" organization
  ON organization."source_system" = 'user_curated_korea_china_directory_v1'
  AND organization."source_record_key" = seed.source_record_key
ON CONFLICT ("organization_id", "locale") DO UPDATE SET
  "official_name" = EXCLUDED."official_name",
  "display_name" = EXCLUDED."display_name",
  "summary" = EXCLUDED."summary",
  "is_official" = true,
  "updated_at" = now();
--> statement-breakpoint

INSERT INTO "member_service_review_audits" (
  "organization_id",
  "decision",
  "evidence_url",
  "verification_date",
  "public_approved",
  "note",
  "before_state",
  "after_state"
)
SELECT
  organization.id,
  'seed_publish',
  organization."source_url",
  organization."last_verified_at",
  true,
  '사용자 제공 한중기관 목록 초기 공개',
  '{"publicApproved":false}'::jsonb,
  jsonb_build_object(
    'publicApproved', true,
    'isActive', true,
    'verificationStatus', organization."verification_status"
  )
FROM "member_service_organizations" organization
WHERE organization."source_system" = 'user_curated_korea_china_directory_v1'
  AND NOT EXISTS (
    SELECT 1
    FROM "member_service_review_audits" audit
    WHERE audit."organization_id" = organization.id
      AND audit."decision" = 'seed_publish'
  );