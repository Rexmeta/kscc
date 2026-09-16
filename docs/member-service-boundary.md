# 회원 서비스 경계 설계

> 상태: 구현 전 설계 기준  
> 기준일: 2026-09-16  
> 대상: 회원 서비스 개발·운영·데이터 검수 담당자  
> 근거: 현재 KSCC.KR 코드와 `KSCC KR 회원 서비스 기획서`, `KSCC Korea–China Organization Directory · Initial Seed DB`

## 1. 목적과 결론

이 문서는 기존 KSCC.KR의 공개 콘텐츠, 기존 회원사 디렉터리, 관리자 기능, 인증 세션을
그대로 보존하면서 회원 서비스 모듈을 추가하기 위한 경계를 정한다. 이 문서는 화면이나
API, migration을 구현하지 않는다. 구현 task가 기존 서비스의 의미와 데이터를 바꾸지 않도록
소유권, 읽기 전용 연동, 권한, URL, 출시·롤백 조건을 먼저 고정하는 것이 목적이다.

### 설계 결론

1. 기존 `/members`는 현재 회원사 목록 화면과 `/api/members` 계약을 위해 유지한다. 신규
   기관 디렉터리로 의미를 바꾸거나 기존 링크를 새 화면으로 전환하지 않는다.
2. 신규 회원 서비스는 `/directory`, `/connections`, `/opportunities`, `/member-home`,
   `/my-kscc`를 사용한다. `/members`가 반드시 신규 회원 홈을 뜻해야 한다는 요구가
   생기면 별도 URL 버전 또는 명시적인 호환 리디렉션을 먼저 승인하고, 기존 화면을
   조용히 대체하지 않는다.
3. 신규 API는 `/api/member-service/v1` 네임스페이스를 사용한다. 기존 `/api/auth`,
   `/api/members`, `/api/posts`, `/api/admin/*`의 응답과 권한 의미를 확장하지 않는다.
4. 기존 `users`, `members`, `posts`, `organization_members`는 신규 모듈이 수정하지
   않는다. 신규 데이터는 별도 테이블과 `user_id`/원본 식별자 링크로 소유한다.
5. 기존 `auth_session` HttpOnly 쿠키, CSRF 보호, 현재 계정 조회, 실시간 ACL 검사를
   재사용한다. 별도 JWT, localStorage 토큰, 두 번째 회원 계정 체계를 만들지 않는다.
6. 초기 기관 22개는 운영 DB에 바로 공개하지 않는다. 원본/정제/검수 상태를 보존하는
   import 단계와 검증 이력을 거쳐 공개한다.
7. 회원 서비스 전체 및 기능별 server-side flag를 두어 메뉴를 숨기는 것만으로 끝나지
   않게 한다. flag가 꺼지면 화면, API 쓰기, 업로드, 배치·알림도 함께 비활성화된다.
8. migration은 추가 전용으로 적용한다. 새 모듈을 끄기 위해 기존 테이블을 되돌리거나
   기존 데이터를 삭제하지 않는다.

## 2. 기존 서비스 인벤토리

### 2.1 보존 대상

| 영역 | 현재 계약 | 회원 서비스와의 원칙 |
| --- | --- | --- |
| 공개 화면 | `/`, `/about`, `/organization`, `/news`, `/news/:id`, `/events`, `/events/:id`, `/partners`, `/contact`, `/privacy`, `/terms` | 경로·콘텐츠 의미·기존 링크를 유지한다. 신규 서비스 메뉴를 추가하더라도 기존 메뉴의 대상을 바꾸지 않는다. |
| 계정 화면 | `/login`, `/register`, `/auth/wechat/callback`, `/dashboard` | 기존 가입·로그인·WeChat callback·기본 프로필과 행사 등록 흐름을 유지한다. 회원 서비스는 로그인 뒤 추가 프로필을 별도로 둔다. |
| 기존 회원사 화면 | `/members`, `/resources` | `/members`는 현재 회원사 목록, `/resources`는 기존 게시물 자료 화면으로 보존한다. 신규 기관 디렉터리는 `/directory`로 분리한다. |
| 기존 관리자 | `/admin` 및 뉴스·행사·자료·페이지·문의·회원·조직·파트너·설문 탭 | 새 운영자 콘솔은 기존 탭의 라우팅과 권한을 가로채지 않는다. 초기에는 `/member-service/operator` 또는 flag가 켜진 별도 콘솔을 사용한다. |
| 객체 접근 | `/objects/*` | 기존 object ownership/ACL 정책을 유지한다. 신규 첨부는 별도 prefix와 요청 소유권 검사를 사용한다. |

현재 클라이언트 라우터는 Wouter의 고정 경로를 사용하고 `LanguageProvider`의 언어가
바뀌면 라우터를 remount한다. 따라서 새 경로는 언어 prefix(`/ko/...`)를 추가하지
않고 기존 SPA 경로 규칙을 따른다. 기존 `/members`가 이미 인증된 사용자용 화면이므로
신규 서비스의 `members`라는 제품 개념과 URL 이름을 혼동하지 않는다.

### 2.2 기존 API와 데이터의 성격

| 현재 자원 | 확인된 API/테이블 | 분류 | 신규 모듈 사용 |
| --- | --- | --- | --- |
| 인증·프로필 | `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/api/auth/profile`, `/api/auth/data-export`, `/api/auth/close-account` / `users` | 보존·공통 인증 | 현재 로그인 계정과 `user_id`만 사용한다. 신규 모듈이 비밀번호, 역할, 세션 버전을 직접 쓰지 않는다. |
| WeChat 연계 | `/api/auth/wechat/start`, `/api/auth/wechat/callback`, `/api/auth/wechat/exchange` / `wechat_identities` | 보존·읽기/공통 로그인 | 공식 provider 확인 전에는 회원 서비스의 별도 가입 경로로 사용하지 않는다. |
| 기존 회원사 | `GET /api/members`, `GET /api/members/:id`, `GET /api/members/me`, `/api/admin/members/*` / `members` | 보존·신규 모듈에서는 읽기 전용 | 기존 회원사 프로필을 기관 디렉터리로 자동 승격하지 않는다. 연결 후보 표시가 필요하면 별도 link와 운영자 확인을 둔다. |
| 기존 게시물 | `/api/posts/*`, `posts`, `post_translations`, `post_meta` | 보존·읽기 전용 연동 | 기존 공개 행사·뉴스를 보여줄 때 read adapter로 참조한다. 신규 기회·기관 제출물을 기존 `posts`에 임의 생성하지 않는다. |
| 행사 신청 | `/api/auth/registrations`, `/api/user/registrations` / `event_registrations` | 보존·읽기 전용 연동 | 신규 기회 신청과 합치지 않는다. 기존 행사 신청의 개인정보를 새 요청 참가자에게 노출하지 않는다. |
| 문의 | `/api/inquiries*`, `inquiries`, `inquiry_replies`, 동의 증적 | 보존 | 연결 요청은 문의 메일의 별칭이 아니다. 새 상태·메시지·배정 이력을 별도 업무 레코드로 만든다. |
| 조직 구조 | `/api/organization-members*` / `organization_members` | 보존·읽기 전용 | 임원·사무국·단체회원 표시 데이터이며 기관 디렉터리의 `organizations`가 아니다. |
| ACL | `tiers`, `roles`, `permissions`, `role_permissions`, `user_memberships`와 `getUserPermissions` | 공통 권한 원천 | 신규 permission key를 추가하되 기존 role/permission의 의미를 바꾸지 않는다. 매 요청 현재 DB 상태를 평가한다. |

### 2.3 인증과 세션 경계

현재 `auth_session`은 7일 만료의 서명 JWT를 HttpOnly, `SameSite=Lax`, production
`Secure`, `Path=/`로 발급한다. 토큰에는 계정 ID와 `sessionVersion`만 있고, 서버는
보호 요청마다 현재 `users` 행을 읽어 active 상태와 버전을 확인한다. 상태 변경 요청은
origin/CSRF 보호와 `X-CSRF-Token`을 요구한다.

신규 모듈은 다음 middleware 순서를 그대로 따른다.

1. 공개 디렉터리 읽기: `optionalAuthenticateToken` 뒤에 public visibility를 적용한다.
2. 로그인 기능: `authenticateToken`으로 현재 계정을 로드한다.
3. 쓰기 기능: 기존 CSRF 보호와 신규 permission/소유권 검사를 모두 통과시킨다.
4. 기관 관리자·운영자 기능: 계정의 현재 활성 membership/ACL을 매 요청 평가한다.

role, 이메일, membership tier를 JWT claim으로 신뢰하거나 신규 모듈용 세션 쿠키를
추가하지 않는다. 계정 비활성화·권한 철회·세션 버전 증가가 다음 요청부터 즉시
반영되어야 한다. 기존 개인정보 내보내기와 계정 폐쇄를 확장할 때는 신규 모듈의
프로필·요청·메시지·첨부·감사 이력 중 본인 데이터와 업무상 보존 데이터를 별도
허용 목록으로 정의한다.

### 2.4 기존 관리자 권한

현재 관리자 화면은 `isAdmin` 또는 콘텐츠·문의·조직 관련 permission에 따라 탭을
노출하고 서버 route에서도 `requireAdmin`, `requireAdminOrPermission`을 적용한다.
신규 서비스는 일반 `isAdmin`만으로 기관 관리자 권한을 추론하지 않는다.

제안 permission namespace:

- `member_service.directory.read`
- `member_service.recommendation.read`
- `member_service.connection.create`, `member_service.connection.read_own`,
  `member_service.connection.manage`
- `member_service.organization.claim`, `member_service.organization.update`
- `member_service.opportunity.create`, `member_service.opportunity.review`
- `member_service.verification.read`, `member_service.verification.write`
- `member_service.audit.read`, `member_service.operator.manage`

permission seed와 role 부여는 구현 task에서 기존 ACL seed/배포 절차와 함께 승인한다.
`*` wildcard만 가진다는 이유로 기관 소유권이나 개인정보 열람 범위를 생략하지
않으며, 운영자도 대상 업무 범위와 감사 로그를 남긴다.

## 3. 데이터 소유권과 경계

### 3.1 기존 테이블 사용 원칙

| 테이블 | 신규 모듈의 사용 원칙 |
| --- | --- |
| `users` | 계정·인증·기본 이름·활성 상태의 원천. `member_service_profiles.user_id`로 참조한다. 신규 모듈이 `role`, `userType`, `membershipTier`, `sessionVersion`을 직접 변경하지 않는다. |
| `members` | 기존 회원사 프로필의 원천. 회원사 관리 화면과 기존 public DTO를 유지한다. 신규 기관으로 복사하거나 기존 행을 기관 directory record로 변환하지 않는다. |
| `posts` 및 번역/meta | 기존 뉴스·행사·자료·페이지의 원천. 신규 기회와 운영 승인 이력을 이 테이블의 `postType`이나 JSON meta로 몰아넣지 않는다. 필요하면 `source_post_id`를 통한 읽기 전용 참조만 둔다. |
| `organization_members` | KSCC 임원·조직 공개 명부의 원천. 기관 소유권·기관 담당자·디렉터리 서비스와 연결하지 않는다. |
| `user_memberships`와 ACL 테이블 | 기존 로그인 사용자의 유효 권한 원천. 신규 도메인 permission을 추가할 수는 있지만 기존 permission 의미를 재사용해 우회하지 않는다. |

기존 데이터와 신규 데이터가 같은 사업체를 가리키는 경우에도 자동 merge하지 않는다.
운영자 승인 전까지 `legacy_member_id` 또는 `candidate_link` 수준의 비파괴 링크만
허용한다. 기존 데이터 수정·삭제·일괄 마이그레이션은 이 작업 범위에 포함되지 않는다.

### 3.2 신규 도메인 소유 테이블 제안

실제 schema 이름과 migration은 구현 task에서 확정한다. 다음 경계와 관계는 그때
변경하려면 제품·운영 승인과 개인정보 검토가 필요하다.

| 도메인 | 신규 테이블/역할 | 소유자와 핵심 규칙 |
| --- | --- | --- |
| 기관 | `member_service_organizations` | 신규 기관 기준정보, 공개 상태, 원본 키, version. 기존 `members`와 별개이며 승인된 변경만 public projection에 반영한다. |
| 명칭·별칭 | `member_service_organization_localizations`, `member_service_organization_aliases` | `ko`, `zh`, `en` 명칭과 공식/통용/검색 별칭을 구분한다. 확인되지 않은 번역을 공식명으로 표시하지 않는다. |
| 분류 | `member_service_services`, `member_service_organization_services` | 서비스·산업·대상 태그의 표준 code와 근거를 관리한다. import 파이프 문자열은 raw 값으로만 보존한다. |
| 지역 | `member_service_regions`, `member_service_organization_regions` | 한국 기반지역, 중국 대응지역, inbound/outbound 관계를 정규화한다. 자유 문자열을 검색 code로 영구 사용하지 않는다. |
| 업무 연락처 | `member_service_organization_contacts` | 공개 근거가 있는 대표 전화·업무용 이메일·공식 접점만 저장한다. 개인 담당자 정보는 동의·공개범위·보존기간을 별도로 기록한다. |
| 회원 서비스 프로필 | `member_service_profiles`, `member_service_preferences` | `user_id` 1:1의 목적·언어·관심 산업/지역. 계정 비밀번호나 기존 `members` 연락처를 복제하지 않는다. |
| 소속·소유권 | `member_service_organization_memberships` | 회원-기관 관계, 대표성 검수 상태, 기관 관리자 역할. 한 회원이 여러 기관을 가질 수 있으며 기관별 scope를 검사한다. |
| 저장 | `member_service_saved_items` | 회원 본인의 기관·기회 저장. 다른 회원의 저장 목록은 읽을 수 없다. |
| 연결 | `member_service_connection_requests` | 요청자, 대상 기관/전문가, 목적, 공개범위, 상태, 담당자, SLA 시각. 요청자 또는 현재 담당자 외 조회를 허용하지 않는다. |
| 요청 대화·첨부 | `member_service_connection_messages`, `member_service_attachments` | 참가자·운영자만 읽는다. object storage key는 별도 prefix와 소유권 검사를 사용하며 public ACL을 사용하지 않는다. |
| 기회 | `member_service_opportunities`, 필요시 `member_service_opportunity_applications` | 회원 서비스가 소유하는 사업기회·지원사업·대표단·신규 행사 제출. 기존 `posts`의 행사와 합치지 않는다. |
| 검증 | `member_service_verification_records` | 대상, 근거 유형/URL, 검수자, 확인일, 결과, 다음 만료일, 변경 전후를 기록한다. |
| 감사 | `member_service_audit_logs` | actor, action, entity, before/after 허용 필드, timestamp, correlation id. 메시지 원문·첨부·비밀번호·토큰은 저장하지 않는다. 열람 감사는 별도 event type으로 남긴다. |
| flag/rollout | 환경 flag 또는 별도 운영 설정 | 사용자별 pilot allowlist와 기능별 on/off를 분리한다. 설정 변경도 감사 대상이다. |

권장 삭제 정책은 기관 기준정보와 검증 이력을 업무상 보존하고, 회원이 입력한
연락처·첨부·메시지는 목적과 법무가 정한 보존기간 뒤 삭제 또는 익명화하는 것이다.
최종 기간, 법적 보존 의무, 계정 폐쇄 시 연결 요청을 어떻게 익명화할지는 미결정
항목으로 남긴다.

## 4. 초기 22개 기관 import 계약

### 4.1 import 원칙

- XLSX의 `organization_id`는 외부 원본의 불변 `source_record_key`로 보존하되 신규 DB
  primary key로 사용하거나 기존 ID와 재사용하지 않는다.
- 원본 행, import batch, 정제 결과, 운영자 판정을 분리해 재실행·감사를 가능하게
  한다. 승인된 public record를 같은 파일로 덮어쓰지 않는다.
- 빈 값은 `null`/미확인으로 둔다. 이름·번역·주무부처·법인형태를 추측하거나
  자동 번역해 채우지 않는다.
- `is_active=TRUE`는 공개 승인이라는 뜻이 아니라 “검토 대상 후보”라는 뜻이다.
- 현재 파일은 22개 기관의 초기 집합일 뿐 완전한 네트워크 목록이 아니다.

### 4.2 25개 필드별 매핑

| 원본 필드 | 신규 매핑 | 정제·공개 규칙 |
| --- | --- | --- |
| `organization_id` | `source_system`, `source_record_key` | source key는 불변 원본 식별자. 신규 PK와 절대 재사용하지 않는다. |
| `name_ko` | ko localization의 `official_name` 또는 `display_name` | 필수. 공식/통용 여부를 확인하고 Unicode NFKC, 앞뒤·연속 공백만 정규화한다. |
| `name_zh` | zh localization | 선택. 확인된 공식 중국어명만 공식명으로 표시한다. |
| `name_en` | en localization | 선택. 공식 영문명만 저장하고 임의 약칭을 만들지 않는다. |
| `short_name` | alias(`short_name`) | 빈 값은 null. 약칭과 공식명은 검색에는 함께 쓰되 표시 유형을 구분한다. |
| `organization_type` | organization type code | codebook의 허용값을 검증한다. 미등록 값은 import 실패가 아니라 `needs_review`로 격리한다. |
| `legal_form` | legal form code | `needs_review`를 실제 법적 형태로 변환하지 않는다. |
| `supervising_authority` | claimed authority + review evidence | 자유문장·`needs_review`는 주장으로만 저장한다. 정부 인가 사실처럼 공개하지 않는다. |
| `scope` | organization-region relation의 scope | `domestic`, `inbound`, `outbound` 등 표준 code를 검증한다. |
| `base_country` | base region의 country code | `KR`, `CN` 등 ISO 계열 내부 code로 정규화하고 표시명은 locale 사전에서 만든다. |
| `base_region` | base region relation | 한국/중국 행정구역 표준화 전에는 원문을 raw 값으로 보존한다. |
| `china_region_focus` | 대응지역 relation | `전국/중화권`, `쓰촨성\|충칭시`처럼 구분자를 split하되 지역 사전 매칭 실패는 검수로 보낸다. |
| `primary_domain` | primary service/domain code 또는 raw pending value | 표준 분류와 일치할 때만 추천 점수에 사용한다. |
| `service_tags` | raw import tags + organization-services 후보 | `|` 구분을 trim/split한다. 운영 검색은 승인된 표준 service code만 사용한다. |
| `audience_tags` | audience taxonomy 후보 | 회원·기업·공공기관 등 표준 code 매핑 후 공개한다. 원문과 표준값을 모두 감사 가능하게 둔다. |
| `languages` | organization language capability relation | `ko\|zh\|en`을 허용 code로 변환한다. UI 언어와 기관 대응 언어를 혼동하지 않는다. |
| `website_url` | official website contact point | URL syntax와 domain을 검증한다. 이 값만으로 공식성/접속 가능성을 확정하지 않는다. |
| `contact_url` | official contact point | 개인 연락처가 아닌 공식 문의 페이지로 취급한다. 공개는 verification rule을 따른다. |
| `summary_ko` | ko localization `summary` | 원문을 보존하고 HTML/스크립트는 허용하지 않는다. zh/en 요약을 추측 생성하지 않는다. |
| `verification_status` | organization public/verification status | codebook 그대로 import하고 `verified_*`도 evidence와 만료일 검증 전에는 공개하지 않는다. |
| `source_type` | verification record `source_type` | official website, government registry 등 허용값을 검증한다. |
| `source_url` | verification record `source_url` | 검증 근거 URL. 원본 website와 다를 수 있으며 변경 전후를 감사한다. |
| `last_verified_at` | verification record `checked_at` 및 `next_review_at` 계산 기준 | XLSX 날짜 serial `46281`은 기준일 2026-09-16으로 해석한다. 날짜 파싱 실패는 공개 금지·검수 큐다. |
| `review_note` | internal review queue note | 일반 회원 DTO와 검색 색인에 포함하지 않는다. |
| `is_active` | `is_active` 후보 상태 | true여도 public approval이 아니다. false는 숨기고 원본 이력은 보존한다. |

### 4.3 중복 판정과 기존 데이터 후보 연결

1. 비교 전에 문자열을 Unicode NFKC, trim, 연속 공백 축약, 대소문자/구두점 규칙으로
   정규화한다. 중국어·한글 문자를 임의 음역해 같은 이름으로 만들지 않는다.
2. 1차 기준은 `normalized(name_ko) + registrable website domain`이다.
3. 같은 공식 domain과 같은/유사한 이름, 또는 같은 normalized name과 같은 연락
   접점을 중복 후보로 만든다.
4. domain만 같고 이름이 다르면 하위 조직·대표부 여부를 `possible_duplicate`로
   운영자 검수한다. 이름만 같고 domain이 다르면 자동 병합하지 않는다.
5. fuzzy similarity, 번역명, `organization_id` 일치만으로 자동 merge하지 않는다.
6. 기존 `members.companyName + website`와 일치해도 기존 회원사 행을 변경하지 않고
   `legacy_member_candidate` 링크와 근거를 생성해 운영자가 확인한다.
7. 병합 판정은 원본 두 record, 판정자, 판정일, 사유, 승계된 source keys를 감사 이력에
   남긴다. 삭제 대신 canonical/duplicate 상태를 사용한다.

### 4.4 검증 상태와 공개 조건

| 상태 | 일반 회원 공개 | 운영 처리 |
| --- | --- | --- |
| `verified_official` | 공개 가능. 검증 배지와 확인일(필요한 경우 월 단위)을 표시 | 공식 사이트·공식 접점 확인 후 180일 내 재검증 |
| `verified_register` | 공개 가능. 등록 근거 배지와 확인일을 표시 | 정부/법인 등록 자료 확인 후 365일 내 재검증 |
| `official_site_needs_check` | 일반 검색에서 확정 기관으로 표시하지 않는다. 필요하면 “검수 중” 제한 카드만 노출 | 사이트 접속, 현재 명칭·활동·대표 접점을 확인 |
| `activity_verified_site_missing` | 공식 website·대표 연락처가 확보되기 전에는 기본정보도 제한 공개 | 활동 근거와 대표 접점을 확보하고 별도 근거를 남긴다 |
| `needs_review` | 비공개. 일반 검색·추천 색인에 넣지 않는다 | 법인 형태, 주무부처, 이름, 연락처, 중복 등 note의 미결 사유를 해결 |

`verified_*` 행도 다음을 모두 만족할 때만 public projection에 들어간다.

- `is_active=true`
- 허용된 verification status와 source record가 존재한다.
- 근거 URL이 문법상 유효하고, 검수 결과·검수자·확인일이 있다.
- 이름, 기관 유형, 공개 summary, 최소 한 개의 공식 접점이 정합하다.
- verification 주기가 지나지 않았다. 만료된 행은 공개 badge를 유지한 채 방치하지
  않고 재검증 큐로 보내며, 정책에 따라 검색 제외 또는 “재확인 필요”로 낮춘다.
- 내부 `review_note`, 원본 raw 값, 개인 연락처, 중복 후보는 public DTO에 없다.

기관 대표 전화·업무용 이메일은 공개 근거가 있을 때만 기본 공개한다. 개인 담당자
연락처, 연결 요청의 회사 정보, 첨부파일은 요청자가 선택한 공개 대상과 KSCC 운영자
범위에서만 읽을 수 있다. 각 상태 변경뿐 아니라 민감 연락처·첨부 열람도 감사 이벤트다.

### 4.5 `needs_review` 큐 전환 기준

다음 중 하나면 import 승인 대신 검수 큐로 보낸다.

- codebook 필수값 누락, 허용되지 않은 code, 날짜 파싱 실패
- `needs_review` 상태 또는 `review_note`에 법적 형태·주무부처·공식 명칭 확인이 남아 있음
- website/contact/source URL 누락·유효성 실패·공식성 충돌
- normalized 이름/domain 중복 후보 또는 기존 `members` 후보 link 발생
- 번역명이 공식명인지 확인되지 않거나 이름 간 의미가 충돌
- 지역·서비스·대상 tag를 표준 사전에 매칭할 수 없음
- `is_active=false`, 검증일 만료, 최근 활동·대표 접점 확인 실패

큐에는 `reason_code`, 원본 행/배치, 담당자, due date, 판정(승인·제한공개·반려·
중복병합)을 둔다. 검수 완료 전에는 공개 projection과 추천 색인에 쓰지 않는다.

## 5. 권한과 기능 flag

### 5.1 권한 매트릭스

여기서 “인증 회원”은 계정 로그인과 필요한 이메일/소속 확인을 통과한 회원 서비스
프로필을 뜻한다. 기존 `users.role`의 `user`/`operator` 문자열을 제품 등급으로
재해석하지 않는다.

| 주체 | 읽기 | 쓰기 | 금지/추가 조건 |
| --- | --- | --- | --- |
| 방문자 | 공개 승인 기관·기회·공개 행사 | 없음 | `needs_review`, 내부 연락처, 요청·메시지·추천 개인화는 차단 |
| 일반 로그인 회원 | 공개 디렉터리, 본인 추천, 공개 기회 | 본인 profile/preferences, 저장, 본인 연결 요청 draft/submit, 공개 기회 신청 | 다른 회원·기관의 private 데이터와 운영 큐는 차단 |
| 인증 회원 | 일반 회원 범위 + 제한된 담당 창구/회원 공개 콘텐츠 | 우선 연결, 허용된 첨부, 본인 결과·만족도 | 인증 근거와 공개범위 동의가 확인되어야 한다 |
| 기관 관리자 | 자기 기관의 승인된 공개값과 자기 기관 관련 요청 | 수정안·서비스·기회 제출, 자기 기관 담당자 관리 | organization membership의 `active` 대표성 + `organization.update` 필요. 제출은 운영 승인 전 비공개 |
| 운영자 | 검증 큐, 요청 큐, 배정 범위, 운영 지표, 감사 요약 | 검증·승인·제한공개, 담당자 배정, 상태 변경, 콘텐츠 승인 | `member_service.*` permission과 업무 scope를 모두 검사. 필요 이상 개인정보 열람 금지 |
| 시스템 관리자 | 운영자 범위와 flag/permission 설정 | 운영자 배정, flag, ACL seed 관리 | 기존 마지막 관리자 보호와 sessionVersion 규칙을 유지. 업무 데이터 일괄 삭제 권한은 별도 승인 |

연결 요청은 요청자·현재 담당자·선택된 기관 담당자·허용된 운영자만 본다. 메시지
본문, 첨부, 연락처 공개범위가 서로 다른 권한을 우회하지 않도록 response DTO를
분리한다. ID를 바꾼 요청 조회, 다른 기관의 수정, 운영자 전환 후 이전 담당자의
읽기는 모두 403/404 정책으로 검증한다.

### 5.2 flag와 pilot 노출

최소 flag는 다음과 같다.

- `MEMBER_SERVICE_ENABLED`
- `MEMBER_SERVICE_DIRECTORY_ENABLED`
- `MEMBER_SERVICE_RECOMMENDATION_ENABLED`
- `MEMBER_SERVICE_CONNECTIONS_ENABLED`
- `MEMBER_SERVICE_OPPORTUNITIES_ENABLED`
- `MEMBER_SERVICE_OPERATOR_ENABLED`
- `MEMBER_SERVICE_PILOT_ALLOWLIST`

실제 이름은 환경 설정 convention에 맞추되 의미는 유지한다. 모든 flag는 다음 지점에
적용한다.

1. server route와 service layer: flag off면 읽기·쓰기·upload presign·operator action을
   동일하게 차단한다.
2. client route와 Header: flag와 세션을 확인한 뒤에만 메뉴/페이지를 보여준다.
3. 추천/검색 색인 및 import·재검증 작업: off면 실행하지 않거나 신규 projection을
   만들지 않는다.
4. object download: module flag와 request attachment authorization을 함께 검사한다.
5. notification/metrics: off 상태에서 신규 요청을 만들지 않고 기존 legacy 알림은
   중단하지 않는다.

pilot은 기존 정상 계정으로 가입한 뒤 UUID allowlist와 신규 모듈 permission을
운영자가 부여하는 절차로 한다. 이메일 주소를 코드에 하드코딩하거나 계정의
기존 role을 admin으로 올려 시험하지 않는다. 운영자 1명과 시험 회원을 먼저 등록하고
회원 서비스 flag만 켠다. 시험 회원 공개 전 개인정보 동의·기관 대표성 확인·테스트
데이터 정리 책임자를 기록한다.

## 6. URL·메뉴·다국어 계약

### 6.1 경로 충돌 판정

| 제품 기능 | 신규 경로 | 충돌/결정 |
| --- | --- | --- |
| 회원 홈 | `/member-home` | 기존 `/dashboard`는 계정·행사 등록·프로필 화면으로 보존한다. 로그인 후 자동 이동은 pilot 이후 별도 결정한다. |
| 기관 디렉터리 | `/directory`, `/directory/:id`, `/directory/compare` | 기존 `/members`와 의미가 다르므로 새 경로를 사용한다. |
| 연결 요청 | `/connections`, `/connections/new`, `/connections/:id` | 기존 `/contact` 문의와 분리한다. |
| 기회·행사 | `/opportunities`, `/opportunities/:id` | 기존 `/events`·`/events/:id`는 공개 게시물 행사로 보존한다. 신규 opportunity가 기존 행사 내용을 복제하지 않는다. |
| 내 KSCC | `/my-kscc` | 기존 `/dashboard`의 계정 설정과 링크할 수 있지만 경로를 대체하지 않는다. |
| 운영자 콘솔 | `/member-service/operator` | 기존 `/admin` 탭과 별도. 초기에는 `MEMBER_SERVICE_OPERATOR_ENABLED`가 켜진 운영자에게만 노출한다. |
| 기존 회원사 | `/members` | 보존 대상. 신규 디렉터리의 alias로 사용하지 않는다. |

API도 같은 원칙으로 `/api/member-service/v1/...`에 둔다. 기존 `/api/members/:id`
응답의 개인정보 필터나 기존 관리자 route를 신규 DTO에 재사용해 의미를 섞지 않는다.

### 6.2 언어와 검색

- UI 언어는 기존 `ko`, `en`, `zh` context와 `LanguageSwitcher`를 사용한다. URL
  prefix를 도입하지 않고 `?lang=ko|en|zh`가 필요한 SEO/공유 계약은 기존 언어
  처리와 일치시킨다.
- MVP 콘텐츠는 한국어·중국어 우선이고 영어는 optional fallback이다. locale이
  없으면 요청 locale → `ko` → 존재하는 다른 locale 순으로 fallback한다.
- 기관 공식명과 통용명, 번역명, 검색 alias를 구분한다. UI가 중국어여도 한국어
  공식명이 중국어로 자동 변환되었다고 표시하지 않는다.
- 기관명·alias·service·region은 다국어 표준 사전과 함께 검색한다. 동일 기관의
  한글·중국어·영문·약칭이 한 결과로 합쳐져야 하며, 원문 검색어를 감사 로그에
  남기지 않는 현재 telemetry 원칙을 지킨다.
- 태그·상태·권한 label은 코드로 API에 보내고 번역 문자열은 client에서 표시한다.
  API가 한국어 label을 권한 판단이나 저장 key로 사용하지 않는다.

## 7. API 계약 초안

모든 응답은 신규 version namespace의 DTO를 사용한다. 오류는 기존 API의 status
convention을 따르되 내부 review note, stack, 타인의 존재 여부를 노출하지 않는다.
목록은 cursor 또는 bounded `page`/`limit`를 사용하며 무제한 collection을 허용하지
않는다.

### 7.1 회원용 API

| Method | Endpoint | 권한 | 계약 요지 |
| --- | --- | --- | --- |
| `GET` | `/api/member-service/v1/bootstrap` | flag + 선택적 로그인 | module flag, locale, 사용 가능한 filter code, 현재 profile completion만 반환. 권한을 client가 결정하지 않는다. |
| `GET` | `/api/member-service/v1/directory` | visitor | `q`, `purpose`, `service`, `region`, `organizationType`, `language`, `verification`, `page`, `limit`을 받는다. public projection만 반환하고 `needs_review`를 숨긴다. |
| `GET` | `/api/member-service/v1/directory/:id` | visitor | 승인된 이름·summary·서비스·지역·공식 접점·검증 badge만 반환한다. 내부 note/source raw/contact 개인 정보는 제외한다. |
| `POST` | `/api/member-service/v1/recommendations` | 로그인 회원 | 목적·산업·지역·언어 입력을 검증하고 최대 5개 결과와 `reasons[]`를 반환한다. MVP는 규칙 기반 가중치(목적/서비스 35, 산업 25, 지역 15, 언어 10, 검증 15)를 사용하며 점수만 근거로 노출하지 않는다. |
| `GET` | `/api/member-service/v1/saved-items` | 본인 | 본인 기관·기회 저장만 반환한다. |
| `PUT/DELETE` | `/api/member-service/v1/saved-items/:type/:id` | 본인 | idempotent 저장/해제. 대상이 public이 아니면 존재 여부를 숨긴다. |
| `GET/PATCH` | `/api/member-service/v1/me/profile` | 본인 | 회원 서비스 profile/preferences만 읽고 수정한다. 계정 이메일·비밀번호는 `/api/auth/profile` 계약을 사용한다. |
| `GET/POST` | `/api/member-service/v1/connections` | 본인 | 본인 요청 목록/초안을 만들며 `requestType`, purpose/background, industry/item, regions, desired date, language, disclosure scope, consent를 받는다. `requester_id`는 session에서 정한다. |
| `GET/PATCH` | `/api/member-service/v1/connections/:id` | participant/담당자/허용 운영자 | 상태·timeline·다음 행동을 반환한다. 수정 가능한 상태 전이는 서버 state machine으로 제한한다. |
| `POST` | `/api/member-service/v1/connections/:id/submit` | 본인 | 필수값·동의·첨부 공개범위를 검증하고 `draft → submitted`를 원자적으로 만든다. idempotency key로 중복 제출을 막는다. |
| `POST` | `/api/member-service/v1/connections/:id/messages` | participant/담당자 | 메시지와 선택 첨부를 생성한다. 본문은 private이고 열람자 범위를 별도 계산한다. |
| `GET` | `/api/member-service/v1/opportunities` | visitor/회원 | public opportunity/event만 기간·지역·산업·언어로 필터링한다. 기존 `/api/posts`와 다른 소유 도메인이다. |
| `GET` | `/api/member-service/v1/opportunities/:id` | visitor/회원 | 공개 상세와 공식 신청 링크/조건을 반환한다. private submission data는 제외한다. |
| `POST` | `/api/member-service/v1/opportunities/:id/applications` | 로그인 회원 | 신청 또는 참가의향을 본인 명의로 만든다. 기존 `event_registrations`와 자동 합치지 않는다. |

### 7.2 운영자 API

운영자 API는 `/api/member-service/v1/operator` 아래에 두며, 각 route에서
`authenticateToken`, 신규 permission, 대상 scope, audit write를 모두 적용한다.

- `GET /review-queue`: 검증·중복·기관 수정·만료 항목을 bounded 목록으로 조회
- `GET /organizations/:id/review`: 내부 원본·현재 public 값·pending 변경·근거 목록을
  운영자 DTO로 조회
- `POST /organizations/:id/verify`: 결과, source type/url, checkedAt, nextReviewAt,
  public decision을 원자적으로 저장
- `POST /organizations/:id/claim/decide`: 기관 대표성 신청 승인/반려
- `POST /connections/:id/assign`: 담당자 또는 기관 담당자를 지정하고 assignment
  event와 알림을 함께 생성
- `POST /connections/:id/status`: `submitted → reviewing → assigned → in_progress
  → completed/closed` 등 허용 전이와 사유를 저장
- `GET /audit`: module audit만 조회. 메시지 원문과 첨부 파일은 audit response에
  넣지 않고 별도 권한·열람 event로 확인
- `GET /metrics`: 요청 처리시간, 배정률, 검증 만료율 등 집계값만 제공

상태 변경·검증 승인·공개범위 변경·첨부/연락처 열람·flag 변경은 성공 여부와
무관하게 actor, action, entity, timestamp, correlation id를 남긴다. before/after는
허용 필드의 구조화 값만 기록하고 메시지 원문·토큰·비밀번호·민감 첨부를 직렬화하지
않는다.

### 7.3 상태 전이와 공개

연결 요청의 기본 상태는 다음과 같다.

`draft → submitted → reviewing → assigned → in_progress → completed → closed`

취소·반려·중복·무응답 종료의 사유 code를 별도 둔다. 사용자가 `submitted` 요청의
목적·수신자·첨부 공개범위를 임의 변경하거나 운영자 배정을 건너뛰지 못한다. 예상
응답일, 최근 업데이트, 다음 행동은 participant에게만 노출한다.

## 8. 사용자 흐름과 화면 책임

1. **회원 홈**: 로그인 후 목적 선택, 최대 5개 추천, 진행 중 요청, 최근 기회를
   보여준다. 기존 `/dashboard`의 계정·행사 기능을 복사하지 않는다.
2. **기관 찾기**: 검색·목적·산업·지역·기관 유형·언어·검증 필터를 제공한다.
   결과는 public projection이며 비교는 최대 3개다.
3. **기관 상세**: 소개, 서비스, 대상 지역, 언어, 공식 링크, 검증 badge와
   `정보 수정 제보`를 보여준다. 수정 제보는 운영자 검수 큐로 들어가며 즉시 public
   값을 바꾸지 않는다.
4. **추천 질문**: 목적·산업·지역·언어·일정을 입력받아 규칙 기반 결과와 각
   추천 이유를 보여준다. 자연어/생성형 AI 추천은 MVP에 포함하지 않는다.
5. **연결 요청**: 필수 정보, 공유 대상, 동의, 첨부를 확인하고 draft를 저장할 수
   있다. 제출 후 운영자 큐에 생성되고 처리 상태가 보인다.
6. **요청 상세**: timeline, 담당자(공개 허용 범위), 메시지, 첨부, 다음 행동,
   취소/결과/만족도 입력을 제공한다. 실시간 채팅·화상회의는 제공하지 않는다.
7. **기회와 행사**: public 목록·상세·저장·신청 링크를 제공한다. 결제·좌석 관리와
   기존 행사 등록의 재구축은 제외한다.
8. **내 KSCC**: 회원 서비스 profile, 관심 조건, 저장 목록, 요청·신청·알림,
   기관 소유권/정보 수정 상태를 보여준다. 계정 보안·탈퇴·동의내역은 기존 account
   화면과 연결한다.
9. **운영자 콘솔**: 검증 큐, 요청 큐, 콘텐츠 큐, 지표와 감사 요약을 별도 화면으로
   제공한다. 승인·반려·병합·배정 버튼은 서버 permission과 대상 scope가 없으면
   렌더링 여부와 관계없이 거부한다.

## 9. 배포·migration·롤백

### 9.1 적용 원칙

현재 Drizzle 설정은 `shared/schema.ts`를 기준으로 `migrations`에 SQL을 생성하고
`db:migrate`로 적용한다. `db:push`는 개발 확인 용도에 한정한다. 신규 schema는
다음 순서로 적용한다.

1. schema/API contract와 개인정보·보존기간·ACL seed를 검토한다.
2. additive migration과 migration journal tag를 생성·검토한다. 기존 table column
   변경, rename, delete, data rewrite를 이번 모듈의 초기 migration에 넣지 않는다.
3. 개발 DB에서 empty/partial/duplicate import, ACL, object prefix, rollback flag를
   검증한다.
4. 백업·잠금 시간·index plan·production schema를 확인한 후 승인된 migration만
   운영 DB에 `npm run db:migrate`로 적용한다.
5. migration 뒤에도 모든 module flag는 off로 배포하고, 기존 URL/API·기존 관리자
   smoke를 먼저 통과시킨다.

### 9.2 독립 비활성화와 롤백

- 장애·개인정보 노출·검수 지연이 발생하면 `MEMBER_SERVICE_ENABLED=false`로
  신규 module route, 메뉴, write, upload, import/notification job을 끈다. 기존
  공개 콘텐츠·인증·관리자·`/members`는 계속 제공한다.
- 기능 하나만 문제면 directory/recommendation/connections/opportunities/operator
  flag 중 해당 기능만 끈다. 이미 생성된 요청은 read-only 상태 조회와 운영자
  처리 여부를 별도 runbook으로 결정한다.
- 이전 앱 build로 되돌릴 때 새 additive table은 남긴다. 새 build가 해당 table을
  읽지 않아도 기존 서비스가 동작하도록 모든 새 참조는 optional이어야 한다.
- 이미 공개된 기관/요청을 SQL로 일괄 삭제하는 down migration은 롤백 방법이 아니다.
  잘못된 import는 module table의 import batch/version을 비공개 처리하고 운영자
  재검수한다. 복구가 필요하면 승인된 백업 절차를 사용한다.
- 기존 URL/API의 응답, auth cookie, ACL, 게시물·회원사 데이터에 회귀가 생기면
  신규 module을 먼저 끄고 기존 build/DB를 안정화한다. 기존 데이터 migration을
  시도하지 않는다.

## 10. 단계별 출시 순서와 통과 조건

| 단계 | 범위 | 통과 조건 |
| --- | --- | --- |
| 0. 준비 | 분류체계 v1, 개인정보·약관·공개범위, 운영 owner, wireframe, API/테이블 review | service/industry/region/language/verification code와 연락처·첨부 보존기간 승인 |
| 1. 기반 | additive schema, ACL seed, flag, read-only legacy adapters, audit contract | flag off에서 기존 전체 smoke 통과, 새 table이 기존 table을 변경하지 않음 |
| 2. 데이터 검수 | 22개 원본을 staging에 import, 중복 후보·공개 가능/제한/비공개 판정 | 22행 field mapping 검수, 공개 기관 전수 evidence 확인, `needs_review` 0건의 공개 누락 |
| 3. 내부 시험 | 운영자 console, 디렉터리, 추천, 요청 상태·메시지 | 대표 시나리오 E2E, 권한/BOLA/첨부 접근 테스트, 운영 SLA와 책임자 확인 |
| 4. 비공개 pilot | 실제 회원 10명, 기관 담당자 5명에 allowlist 공개 | 치명 오류 없음, 요청 제출·배정·종료 처리, 한국어·중국어·모바일 검수, 개인정보 사고 없음 |
| 5. 공개 beta | directory/recommendation/connections 후 opportunities 순서 | 검색 성공·요청 전환·첫 응답·검증 만료 지표 기준선 확보, 기존 기능 회귀 없음 |
| 6. 확장 | 기관 self-service, 고급 추천, 추가 지역/전문가 | 운영 처리량과 품질이 기준을 충족하고 법무·지원 책임이 확정된 경우에만 진행 |

초기 운영 기준은 요청 확인 1영업일, 담당자 배정 3영업일, 기관 정보 수정
판정 5영업일, 만료 검증 30일 이내, 회원 문의 1차 답변 2영업일이다. 이 기준은
제품 SLA가 아니라 운영자와 측정 지표가 승인한 뒤 적용한다.

## 11. 테스트와 운영 책임

### 11.1 구현 task에 넘길 테스트 범위

- 기존 경로 `/members`, `/dashboard`, `/admin`, `/events`, `/contact`와 기존
  `/api/auth`, `/api/members`, `/api/posts`, `/api/inquiries` 회귀 테스트
- flag off/on, pilot allowlist, 비로그인/일반/인증/기관 관리자/운영자/관리자 ACL matrix
- sessionVersion 변경·로그아웃·계정 비활성화 뒤 신규 API 차단, CSRF/origin 검사
- 다른 user/request/organization ID를 바꾼 조회·수정·첨부 다운로드의 403/404 테스트
- 상태 전이, 중복 submit/idempotency, 배정 변경, 감사 event의 actor/before/after
- 22개 fixture의 25개 field mapping, empty/invalid code, Excel date, rerun idempotency
- 이름·domain 중복 후보와 fuzzy 후보의 자동 병합 금지, 기존 `members` 비변경 보장
- verification status별 public projection, 만료/재검수, source/review note 비공개
- ko/zh/en fallback, 기관명/alias 통합검색, 번역되지 않은 공식명 표시 규칙
- 첨부 MIME/파일 크기/object prefix/만료 URL/XSS·HTML 실행 방지와 열람 audit
- mobile 핵심 흐름, 접근성, 로딩/실패/빈 상태, pagination 상한, 운영자 지표
- 기존 `npm run check`, `npm test`, build와 production migration/schema health check

### 11.2 책임 분리

| 책임 | 담당 |
| --- | --- |
| 분류 code, 기관 중복·공개 판정, 검증 SLA | KSCC 데이터 steward/운영자 |
| 인증·ACL·API·migration·flag·object access | 백엔드/플랫폼 개발 |
| 핵심 화면·모바일·다국어 fallback | 프론트엔드/UX |
| 개인정보 동의·공개범위·보존·삭제/익명화 문구 | 개인정보·법무 owner |
| 한국어·중국어 기관명·용어집 검수 | 언어 검수자 |
| 요청 배정·응답·종료와 장애 시 flag off | 회원 서비스 운영 on-call |
| 지표 정의·주간 품질 review | 제품 owner + 운영 owner |

지표는 추천 클릭률만으로 성공을 판단하지 않는다. 검색 후 상세 도달, 요청 제출,
배정률, 첫 응답시간, 완료율, 만족도, 공개 기관의 검증 만료율, 저장 재조회율,
30일 재방문을 회원 유형별로 집계한다. 요청 본문·연락처·검색어 원문은 운영
telemetry에 넣지 않는다.

## 12. 미결정 항목과 선행 조건

다음은 구현 전에 product/운영/법무가 결정해야 한다.

1. 기관의 canonical ID 규칙과 기존 `members` 후보 link를 승인할 주체
2. 기관 대표성 확인에 사용할 이메일 domain, 등록증, 위임장 등 증빙 종류
3. 개인 담당자 연락처의 공개 등급, 보존기간, 동의 철회 처리
4. service/industry/region/audience code와 한국·중국 행정구역 용어집
5. 기존 `/events` 게시물과 신규 opportunities의 노출·신청을 연결할지 여부
6. 연결 요청을 받을 기관 담당자 계정이 없는 경우의 KSCC 내부 배정 절차
7. 메시지·첨부·연결 결과·감사 이력의 보존 및 계정 폐쇄 시 익명화 기준
8. 이메일·알림의 운영 channel과 실패 시 재처리 책임
9. 영어 UI/콘텐츠의 베타 범위와 공식명 fallback 문구
10. 회원 서비스가 WeChat 계정을 지원하는 시점. WeChat 자체 hub는 이 문서 범위가
    아니며, 공식 provider sign-in 확인과 기존 identity/session 회귀 검증이 선행돼야 한다.

## 13. 후속 구현 task 순서

1. **분류·개인정보 계약**: codebook, 공개 DTO, 보존·동의 문구, permission seed를
   확정한다.
2. **신규 schema와 import staging**: 제안한 소유 테이블, batch/idempotency,
   verification/audit를 additive migration으로 구현하고 22행 fixture를 검증한다.
3. **public directory/read adapter**: `/directory`와 `/api/member-service/v1/directory`
   를 flag off 기본값으로 만들고 public projection·검색·다국어 테스트를 작성한다.
4. **profile/recommendation/connections**: 본인 scope, 첨부, 상태 machine, 운영자
   배정과 SLA metric을 구현한다.
5. **operator console**: 검수·중복·기관 claim·요청 큐·감사 조회를 별도 화면으로
   구현한다. 기존 `/admin` 탭 권한과 route는 수정하지 않는다.
6. **opportunities와 pilot 운영**: 기존 events read adapter 여부를 결정한 뒤 기회
   submission/approval과 10명·5기관 pilot을 진행한다.

이 순서에서 기존 서비스의 공개 URL, 인증 세션, 기존 회원/관리자 화면, 기존
테이블의 쓰기 의미가 변경되면 해당 task를 중단하고 이 경계 문서를 먼저 갱신한다.