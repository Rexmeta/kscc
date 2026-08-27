# Threat Model

## 감사 범위와 판정 기준

- 감사 기준일: 2026-08-27
- 대상: 현재 작업 트리의 Express/React/PostgreSQL(Drizzle)/Neon/Object Storage/Resend 경계와
  프로덕션 배포 문서
- 방법: 소스 정적 추적, 라우트·저장소 호출 경로 대조, `npm audit` 및 `npm ls` 확인
- 이 문서는 공격을 운영 데이터에 수행한 결과가 아니다. 아래의 재현 흐름은 테스트 데이터와
  별도 계정으로 재현할 수 있는 논리적 요청 흐름이다.
- 심각도는 출시 차단 우선순위다. 신뢰도는 소스에서 해당 흐름을 직접 확인한 정도다.
  `확정`은 코드 경로가 끊김 없이 확인된 경우, `조건부`는 배포 설정·데이터·공격자
  전제에 따라 영향이 달라지는 경우를 뜻한다.

## Project Overview

한국 사천-충칭 총상회의 회원·기업 디렉터리, 행사 등록, 뉴스/자료/페이지 콘텐츠,
문의 및 관리자 운영 기능을 제공하는 React 18 + Vite 프론트엔드와 Express/TypeScript
REST API다. 데이터는 Drizzle ORM을 통한 PostgreSQL(Neon)에서 읽고 쓰며, 비밀번호는
bcrypt로 해시하고 Bearer JWT를 `localStorage`에 저장한다. 관리자용 게시물·미디어는
Replit Object Storage와 signed PUT URL을 사용하고, 문의 답변 알림은 Resend API를
사용한다. 브라우저는 비신뢰 입력자이고, 서버가 인증·인가와 공개 데이터 범위를
결정해야 한다.

현재 문서 기준으로 JWT에는 `id`, `email`, `role`이 들어가며 발급 수명은 7일이다.
서버에는 역할 기반 `requireAdmin`과 별도의 DB 멤버십/권한 계층이 있지만 일반 관리자
라우트는 주로 JWT의 `role`만 검사한다.

## Assets

- **계정과 인증 자료** — 이메일, bcrypt 비밀번호 해시, 7일 Bearer JWT, 관리자 역할.
  탈취·재사용되면 문의, 회원, 게시물, 업로드 등 운영 기능이 노출되거나 변조된다.
- **회원·조직 개인정보** — 이름, 이메일, 전화번호, 회사명, 주소, 담당자, WeChat ID,
  회원 상태와 회원 등급. 공개 디렉터리의 의도된 필드와 비공개 운영 필드를 구분해야 한다.
- **문의와 답변** — 문의자의 이름·연락처·회사·제목·본문, 관리자 답변, 수신 이메일.
  기밀 상담 내용이며 대량 스팸·메일 남용의 대상이 될 수 있다.
- **행사 등록 개인정보** — 참석자 이름·이메일·전화번호·회사, 등록/결제 상태.
  관리자 화면과 회원 본인 기록에만 필요한 최소 필드로 제한되어야 한다.
- **게시물과 운영 메타데이터** — 초안·보관·내부 게시물, 번역 HTML, 리소스 파일 URL,
  다운로드 수, SEO와 이벤트 메타. 공개 전 콘텐츠와 링크가 유출·변조되면 기밀성,
  무결성, 방문자 브라우저의 안전성이 손상된다.
- **Object Storage 파일과 ACL 메타데이터** — 업로드 파일, 객체 경로, `custom:aclPolicy`.
  비공개 리소스의 기밀성과 방문자에게 제공되는 이미지·문서의 콘텐츠 안전성이 핵심이다.
- **애플리케이션 비밀** — `SESSION_SECRET`, DB 연결 문자열, Resend API 키 및 Object
  Storage 설정. 소스·클라이언트·로그에 나타나면 DB/JWT/메일/파일 경계가 함께 무너진다.
- **가용성과 비용** — DB 연결 풀, 게시물 검색/페이지 조회, Object Storage 대역폭,
  Resend 호출. 인증 없는 요청과 큰 본문·파일이 서비스 비용과 응답성을 고갈시킬 수 있다.
- **감사 가능성** — 민감 작업의 수행자·시각·결과. 현재 일반 요청 로그만으로는 누가
  관리자 변경·삭제를 수행했는지 충분히 입증할 수 없다.

## Trust Boundaries

1. **브라우저 ↔ Express API** — 모든 헤더·쿼리·JSON·HTML·URL·파일 내용은
   공격자가 통제할 수 있다. 클라이언트의 페이지 필터, 접근 배지, 관리자 화면 숨김은
   보안 경계가 아니다.
2. **공개 ↔ 인증 ↔ 관리자 API** — 게시물/회원/파트너/조직 디렉터리와 문의 생성은
   공개 표면이다. 인증 표면은 `/api/auth/*`, 본인 행사 등록·취소, 회원 변경 등이고,
   관리자 표면은 사용자·게시물·문의·조직·파트너·업로드 관리다. 각 라우트가 서버에서
   호출자와 리소스 범위를 다시 판단해야 한다.
3. **Express ↔ PostgreSQL/Drizzle** — 서버가 사용자의 필터와 본문을 DB 쿼리와
   레코드로 변환한다. Drizzle의 파라미터화는 SQL 문자열 주입 위험을 낮추지만,
   `select()`의 과도한 필드 반환과 잘못된 `where`는 별개의 접근제어 문제다.
4. **Express ↔ Object Storage/sidecar** — 서버가 private object directory 아래
   객체를 해석하고 signed PUT URL을 발급한다. 버킷 메타데이터 ACL은 애플리케이션
   인가를 대신하지 않으며, 다운로드 전 서버 검사가 필요하다.
5. **Express ↔ Resend** — 관리자 입력과 문의 본문이 외부 메일 API로 전달된다.
   API 키는 서버 비밀이어야 하고, 수신자·본문·공급자 오류 응답은 로그에 남기지 않아야 한다.
6. **개발/배포 경계** — Vite dev middleware와 빌드 도구는 프로덕션 앱 코드와
   다르지만, 공개 개발 서버가 노출되면 dev dependency 취약점의 공격면이 된다.
   배포 DB에 `db:push`를 직접 수행하는 문서 지침은 운영 데이터 무결성 경계다.

## Scan Anchors

- **진입점/미들웨어**: `server/index.ts:7-85` — Helmet/CSP, proxy, rate limit,
  JSON/urlencoded 한도, 요청·오류 로그
- **인증/관리자 인가**: `server/routes.ts:15-80,86-313,315-426`,
  `server/routes/posts.ts:1-16,208-400`, `server/permissions.ts:6-198`
- **공개 데이터 표면**: `server/routes/posts.ts:47-121,318-340`,
  `server/routes.ts:428-467,526-535,662-738`
- **저장소/데이터 범위**: `server/storage.ts:142-210,222-288,311-400,
  423-515,652-860,1002-1045`, `shared/schema.ts:13-227`
- **파일 경계**: `server/routes.ts:808-892`, `server/objectStorage.ts:41-325`,
  `server/objectAcl.ts:4-124`
- **브라우저 렌더링/인증 저장**: `client/src/hooks/useAuth.tsx:29-140`,
  `client/src/lib/auth.ts:8-29`, `client/src/components/RichTextEditor.tsx:37-175`,
  `client/src/pages/NewsDetail.tsx:273-278`,
  `client/src/pages/EventDetail.tsx:352-361`,
  `client/src/pages/Resources.tsx:132-171,539-550`
- **외부 서비스/운영 문서**: `server/email.ts:8-65`,
  `INSTALLATION_DEPLOYMENT_GUIDE.md:328-363,517-550,628-661`
- **Dev-only로 분류할 부분**: Vite middleware와 Tailwind/PostCSS/Drizzle Kit은
  `server/vite.ts`, 빌드 설정과 개발·배포 작업에서 사용된다. 실제 운영 명령과
  개발 서버 노출 여부를 배포 전에 확인해야 한다.

## 공격면 개요

### 공개 표면

- `GET /api/posts`, `/api/posts/slug/:slug`, `/api/posts/:id`,
  `/api/posts/:id/meta`: 게시물·번역·메타데이터 조회
- `GET /api/members`, `/api/members/:id`: 회원 디렉터리 조회
- `GET /api/partners`, `/api/organization-members`,
  `/api/organization-members/:id`: 파트너·조직 정보 조회
- `POST /api/inquiries`: 문의 생성
- `GET /objects/*`: 업로드 객체 다운로드

### 인증 표면

- `POST /api/auth/register`, `/api/auth/login`, `GET /api/auth/me`,
  `PATCH /api/auth/profile`
- 본인 등록 목록/취소, 행사 등록, 회원 생성·수정

### 관리자 표면

- 사용자·멤버십 관리, 게시물 CRUD/번역/메타, 행사 등록 목록
- 문의 조회·수정·삭제·답변 및 Resend 발송
- 파트너·조직 구성원 관리
- signed upload URL 발급과 이미지 ACL 설정

## Findings

### P0 — 출시 전 반드시 차단

#### TM-01 공개 게시물 API가 상태·가시성 인가를 우회한다

- **판정**: 확정, **심각도** P0 / High, **신뢰도** 높음
- **근거**: `server/routes/posts.ts:47-121`의 세 GET 라우트에는 인증 미들웨어가
  없고, `postQuerySchema`는 호출자가 `status`와 `visibility`를 지정하게 한다.
  `server/storage.ts:652-683,737-751`은 전달된 조건만 적용하고 기본적으로
  `status='published'`, `visibility='public'`을 강제하지 않는다.
  slug/ID 조회도 `server/storage.ts:620-649`에서 상태·가시성을 검사하지 않는다.
  `GET /api/posts/:id/meta`(`server/routes/posts.ts:318-340`) 역시 공개다.
- **재현 흐름**: 공개 네트워크에서
  `GET /api/posts?status=draft&limit=100`,
  `GET /api/posts?visibility=internal`, 또는 초안의 유출된 ID/slug에
  `GET /api/posts/:id`를 보낸다. 응답의 번역·메타에 포함된 내부 본문, 리소스 URL,
  이벤트/운영 필드를 얻는다. `status=published`를 보내는 현재 React 화면은
  서버 인가가 아니므로 직접 요청으로 우회된다.
- **영향**: 초안·보관·members/premium/internal 콘텐츠와 메타·번역의 기밀성 상실,
  비공개 리소스 유출 및 아래 TM-02/TM-03의 공격 재료 제공.
- **권장 조치**: 공개용 쿼리와 관리자용 쿼리를 분리하고, 공개 쿼리는 서버에서
  `published`와 `public` 및 만료/예약 상태를 강제한다. members/premium은
  현재 사용자와 유효한 등급을 DB에서 확인한 경우에만 최소 필드를 반환한다.
  메타·번역도 같은 정책을 공유하고 ID/slug detail에 동일한 검사를 적용한다.

#### TM-02 Object Storage 다운로드가 ACL을 검사하지 않는다

- **판정**: 확정, **심각도** P0 / Critical, **신뢰도** 높음
- **근거**: `server/routes.ts:877-892`의 `GET /objects/*`는 인증 없이
  `getObjectEntityFile()` 후 `downloadObject()`를 호출한다.
  `server/objectStorage.ts:90-120`의 `downloadObject()`는 ACL을 읽어
  `Cache-Control`만 정하고 `canAccessObjectEntity()`를 호출하지 않은 채 스트림을
  반환한다. ACL 검사 구현은 `server/objectAcl.ts:84-123`에 있지만 이 경로에서
  사용되지 않는다. 더구나 `/api/images`는 `server/routes.ts:835-850`에서
  업로드 객체를 항상 `visibility: "public"`으로 기록한다.
- **재현 흐름**: TM-01의 리소스 응답에서 `resource.fileUrl`을 얻거나
  `/objects/uploads/<object-id>` 경로를 안다. 인증 헤더 없이 해당 경로를 GET하면
  private ACL 메타데이터가 있어도 파일이 스트리밍된다. 관리자 리소스 업로드도
  `PUT /api/images` 이후 공개 정책이 되어 리소스 접근 등급과 무관하게 노출될 수 있다.
- **영향**: 경로가 알려진 모든 private 파일의 무단 다운로드, 리소스 접근 등급
  우회, 개인정보·내부 문서 유출. `public` 캐시가 설정된 객체는 CDN/브라우저
  캐시로 회수 범위가 더 넓어질 수 있다.
- **권장 조치**: 다운로드 전에 객체 ACL과 호출자(익명은 public만)를 검사하고,
  members/premium 리소스는 애플리케이션 등급 검사를 거친 짧은 수명의 signed GET
  URL로 제공한다. 리소스와 이미지의 공개 정책을 구분하고, ACL 설정 성공 전에
  허용된 private object directory인지 검증한다. 객체 응답은 허용된 MIME과
  `Content-Disposition: attachment`를 사용한다.

#### TM-03 7일 JWT의 역할과 활성 상태가 오래된 채로 사용된다

- **판정**: 확정, **심각도** P0 / High, **신뢰도** 높음
- **근거**: JWT는 `server/routes.ts:145-146,169-170`에서 7일로 발급된다.
  `authenticateToken`(`server/routes.ts:45-71`)은 서명·만료만 검증하고,
  토큰에 `role`이 있으면 DB 사용자를 다시 조회하지 않고 `req.user = user`로
  신뢰한다. `requireAdmin`(`server/routes.ts:75-80`)는 그 토큰 role만 검사한다.
  `users.isActive`는 `shared/schema.ts:13-24`에 있으나
  `server/storage.ts:204-210`의 로그인 검증과 토큰 미들웨어 어느 쪽도 검사하지 않는다.
- **재현 흐름**: 관리자 계정으로 토큰을 받은 뒤 관리자가 계정을 demote하거나
  `isActive=false`로 바꾼다. 원래 토큰으로 최대 7일 동안 사용자 관리, 게시물,
  문의, 업로드 관리자 라우트를 계속 호출한다. 비활성 계정은 새 로그인으로도
  토큰을 다시 받을 수 있다.
- **영향**: 권한 회수 지연·계정 비활성화 무력화, 관리자 기능의 지속 사용,
  계정 탈취 시 긴 공격 창.
- **권장 조치**: 매 인증 요청(최소 관리자/민감 요청)마다 현재 DB 사용자의
  `isActive`와 역할을 재조회하거나, 짧은 access token + 서버측 revocation/version
  검사를 사용한다. `req.user`에는 검증된 최소 필드만 넣고 프론트의 JWT payload나
  `isAdmin`을 인가 근거로 사용하지 않는다. 기존 토큰 강제 폐기 전략도 정한다.

#### TM-04 저장된 게시물 HTML이 방문자 브라우저에서 그대로 실행된다

- **판정**: 확정, **심각도** P0 / High, **신뢰도** 높음
- **근거**: 관리자 번역 API `server/routes/posts.ts:290-316`와 스키마
  `shared/schema.ts:137-153`은 `content`를 임의 문자열로 저장한다.
  `NewsDetail.tsx:273-278`, `EventDetail.tsx:352-361`,
  `Resources.tsx:539-550`이 `dangerouslySetInnerHTML`로 삽입한다.
  `RichTextEditor.tsx:108-175`는 링크·이미지 URL과 에디터 HTML을 생성하지만
  서버 sanitization이 없다. CSP(`server/index.ts:13-25`)도
  `script-src`에 `'unsafe-inline'`, `'unsafe-eval'`을 허용한다.
- **재현 흐름**: 관리자 세션 또는 관리자 API 접근을 얻은 공격자가 번역 content에
  `<img src=x onerror="...">`나 악성 링크 HTML을 저장한다. 일반 방문자가 해당
  뉴스/행사/자료를 열면 저장된 HTML이 실행된다. 에디터 UI를 거치지 않고 직접
  API를 호출하면 UI 제한도 우회된다.
- **영향**: 방문자 세션·localStorage JWT 탈취, 관리자 브라우저에서의 권한 상승,
  피싱·콘텐츠 변조. `localStorage` JWT(`client/src/hooks/useAuth.tsx:31-32`,
  `client/src/lib/auth.ts:8-10`) 때문에 XSS가 곧 토큰 탈취로 이어진다.
- **권장 조치**: 저장 경계에서 허용 태그·속성·프로토콜(`http/https`)만
  allowlist하는 검증/정제를 적용하고, 저장 시점과 렌더링 시점의 회귀 테스트를
  둔다. `javascript:`, 이벤트 핸들러, 위험한 SVG/data URL을 제거하고
  `unsafe-inline`/`unsafe-eval` 없는 CSP를 nonce/hash 기반으로 전환한다.

### P1 — 출시 전에 수정하거나 명시적으로 승인

#### TM-05 회원·조직 레코드 직접 조회가 비공개 범위를 보장하지 않는다

- **판정**: 회원 detail은 확정, 조직 의도는 조건부, **심각도** P1 / High,
  **신뢰도** 높음
- **근거**: 공개 `GET /api/members/:id`(`server/routes.ts:457-467`)는
  `storage.getMember()`만 호출하고 `isPublic`을 검사하지 않는다. 반면 목록은
  `server/storage.ts:245-246`에서 `isPublic=true`를 강제한다. 따라서 비공개
  레코드의 UUID가 노출되거나 유출되면 직접 조회된다. 응답은 `select()` 전체여서
  `contactEmail`, `contactPhone`, 주소, 전화번호 등 `shared/schema.ts:27-53`의
  필드를 모두 포함한다.
- **재현 흐름**: 비공개 테스트 회원 UUID를 알고 인증 없이
  `GET /api/members/<uuid>`를 호출한다. 200 응답과 운영용 연락처/주소를 받는다.
  UUID는 비밀키가 아니므로 로그·링크·클라이언트 상태에서 얻으면 충분하다.
- **조직 변형**: `GET /api/organization-members/:id`
  (`server/routes.ts:728-738`)도 인증 없이 전체 레코드를 반환한다.
  목록은 기본 active만 조회하지만 `?isActive=false`이면 구현상 필터를 제거해
  비활성 조직 구성원도 반환할 수 있다(`:715-722`). 공개 조직 디렉터리가
  의도된 것인지 확인 전까지는 조건부 정보 노출로 판정한다.
- **영향**: 비공개 회원·비활성 조직 데이터 및 PII 노출, 대량 스크래핑.
- **권장 조치**: 목록과 detail 모두 동일한 공개 정책을 적용하고, 공개 DTO에서
  이메일·전화·주소·담당자 연락처를 제외한다. 비공개 detail은 관리자 또는 해당
  회원 소유자만 허용한다. 조직 공개 라우트는 `isActive=true`를 강제하고 관리자
  전체 조회는 별도 인증 라우트로 분리한다.

#### TM-06 회원 수정에서 소유권과 승인 필드를 호출자가 바꿀 수 있다

- **판정**: 확정, **심각도** P1 / High, **신뢰도** 높음
- **근거**: `server/routes.ts:479-493`은 소유자 또는 관리자 여부를 확인한 뒤
  `insertMemberSchema.partial()` 전체를 `storage.updateMember()`에 전달한다.
  `shared/schema.ts`의 insert 스키마는 `userId`, `membershipStatus`,
  `isPublic` 등 시스템 필드를 제외하지 않는다.
- **재현 흐름**: 자기 member 레코드에 인증한 일반 사용자가
  `PUT /api/members/<own-id>`로 다른 사용자의 `userId` 또는
  `membershipStatus: "active", isPublic: true`를 보낸다. 레코드 소유권이
  바뀌거나 회원 승인/공개 상태가 사용자 입력에 의해 변한다.
- **영향**: IDOR와 회원 승인·공개 정책 변조, 다른 사용자의 일대일 member
  레코드 충돌을 이용한 무결성/가용성 손상.
- **권장 조치**: 일반 사용자용 허용 필드를 name/contact 등으로 고정하고
  `userId`, `membershipStatus`, `isPublic`, 등급은 관리자 전용으로 분리한다.
  DB 제약과 업데이트 트랜잭션으로 소유권 변경을 금지한다.

#### TM-07 멤버십 만료·역할 상태와 권한 캐시가 회수를 지연시킨다

- **판정**: 만료/캐시는 확정, **심각도** P1 / High, **신뢰도** 높음
- **근거**: `userMemberships.expiresAt`, `roles.isActive`, `tiers.isActive`가
  `shared/schema.ts:173-227`에 있지만 `server/permissions.ts:27-39`와
  `:177-196`은 `userId`와 `isActive=true`만 검사한다. `expiresAt > now`,
  role/tier active 조건이 없다. 권한 캐시는 사용자별 5분
  (`server/permissions.ts:6-25`)이고, 명시적 clear는 멤버십 교체
  (`server/routes.ts:393-414`)에만 보인다. 역할 권한 매핑·역할 비활성화·직접
  DB 변경은 캐시를 비우지 않는다. 또한 실제 주요 관리자 라우트는
  `requirePermission`보다 JWT role 검사에 의존한다.
- **재현 흐름**: 유효 권한을 한 번 조회해 캐시를 만든 뒤 멤버십 expiresAt을
  과거로 만들거나 role/tier를 비활성화한다. 캐시가 만료될 때까지 기존 권한이
  유지되고, 캐시가 다시 채워져도 만료일 조건이 없어 계속 유지될 수 있다.
- **영향**: 멤버십 만료 후 기능 접근, 권한 회수 지연, 권한 시스템과 JWT role의
  불일치.
- **권장 조치**: 권한 쿼리에 `expiresAt IS NULL OR expiresAt > now`,
  `roles.isActive=true`, `tiers.isActive=true`를 포함한다. 캐시 무효화를 모든
  권한 변경 트랜잭션에 묶고, 민감 관리자 작업은 DB의 현재 권한을 재확인한다.
  역할 기반과 permission 기반 중 하나를 명확한 단일 정책으로 정리한다.

#### TM-08 최초 가입자 자동 관리자 승격과 등록 남용

- **판정**: 빈 DB/동시 요청 조건부이지만 코드상 확정, **심각도** P1 / High,
  **신뢰도** 높음
- **근거**: 공개 `POST /api/auth/register`에서 `storage.getUserCount()`
  (`server/routes.ts:87-105`)가 0이면 요청자를 admin으로 지정하고,
  가입과 count 확인 사이에 트랜잭션 잠금·초대·초기화 비밀이 없다.
  `:145-147`은 그 역할로 즉시 JWT를 발급한다.
- **재현 흐름**: 배포 직후 빈 DB가 외부에 노출된 동안 공격자가 먼저 회원가입하면
  관리자 토큰을 받는다. 두 가입 요청을 동시에 보내면 둘 다 count 0을 읽어
  복수 관리자 생성이 가능하다.
- **영향**: 초기 배포 관리자 탈취, 관리자 지속 권한, 가입 스팸/계정 생성.
- **권장 조치**: 배포 전 일회성 bootstrap을 완료하고 공개 등록은 member/staff
  기본 역할만 허용한다. 초대·관리자 승인 또는 별도 운영자 설정을 사용하고,
  DB unique/transaction/lock으로 bootstrap race를 막는다. IP 한도 외에
  이메일/계정·장치 기반 backoff와 이메일 검증을 추가한다.

#### TM-09 관리자 입력 링크·미디어와 업로드 파일의 정책이 없다

- **판정**: 링크/미디어 및 서버 업로드 검증 부재는 확정, 악성 파일 브라우저
  실행 영향은 조건부, **심각도** P1 / High, **신뢰도** 높음
- **근거**: `RichTextEditor.tsx:155-175`는 link/image URL을 그대로 설정하고,
  관리자 스키마와 mapper는 `client/src/components/admin/adminSchemas.ts:3-30`,
  `client/src/lib/adminPostMappers.ts:52-84,229-236`에서 URL/미디어 문자열을
  서버에 보낸다. 상세 화면은 `NewsDetail.tsx:217-223,280-341`에서 이미지와
  외부 동영상 URL을 렌더링한다. YouTube/Vimeo 정규식 분기는 상대적으로 제한되지만
  비정규 URL은 외부 링크로 남고 raw HTML 경로는 별도로 존재한다.
  `/api/objects/upload`(`server/routes.ts:808-833`)는 관리자에게
  `contentType`을 전달받아 signed PUT URL만 발급하고 서버가 파일 크기·실제 MIME을
  검증하지 않는다. 크기/유형 제한은 Uppy 브라우저 코드에만 있다.
- **재현 흐름**: 관리자 계정 또는 TM-03의 오래된 관리자 토큰으로 임의 URL을
  게시물 미디어/링크에 저장하거나, 업로드 URL을 받아 브라우저를 거치지 않고
  큰 파일·허위 MIME·HTML/SVG를 PUT한다. 이후 `/api/images`가 객체를 public으로
  표시하고 게시물에 링크한다.
- **영향**: 피싱/외부 추적, 저장공간·대역폭 고갈, 공개 악성 파일 호스팅,
  브라우저가 MIME을 해석하는 배포 설정에 따른 XSS/콘텐츠 스니핑.
- **권장 조치**: URL은 `https` allowlist와 필요한 호스트/포트 정책을 적용하고
  서버에서 재검증한다. 업로드는 허용 MIME·확장자·magic bytes·파일 크기·파일명
  정책을 서버에서 검사하고, public/private 용도를 분리하며 `nosniff`와 안전한
  다운로드 응답을 사용한다. 업로드와 게시물 저장을 별도 상태로 두고 승인 후 공개한다.

#### TM-10 문의·행사 등록 API가 스팸과 개인정보 과수집에 취약하다

- **판정**: 확정, **심각도** P1 / Medium-High, **신뢰도** 높음
- **근거**: `POST /api/inquiries`(`server/routes.ts:526-535`)는 공개이고
  `shared/schema.ts:70-84`의 필드에 유의미한 길이 제한이 없다. 일반 JSON 2MB
  제한(`server/index.ts:49-52`)이 사실상 유일한 본문 한도다. 문의 답변은
  `server/routes.ts:613-655`에서 메시지 길이 제한 없이 동기적으로 Resend를
  호출한다. 행사 등록은 `server/routes/posts.ts:123-172`에서 event 여부만
  확인하고, 요청 body의 `attendeeName/email/phone`을 신뢰한다.
  `getUserRegistrations`(`server/storage.ts:352-400`)와 관리자 행사 등록 목록
  (`:331-349`)은 페이지 제한이 없다.
- **재현 흐름**: 인증 없이 문의 생성 요청을 반복하고 2MB에 가까운 긴 필드로
  저장/메일 운영을 압박한다. 로그인한 사용자는 행사 등록 요청에 다른 참석자
  이름·이메일을 넣고, 만료/비공개/정원 초과 여부가 클라이언트 확인만이라면
  이를 우회한다.
- **영향**: DB 저장량·관리자 화면·Resend 비용 고갈, 참석자 개인정보 무결성
  훼손과 잘못된 알림, 대량 PII 노출.
- **권장 조치**: 문의 각 필드와 답변에 서버 길이·형식·빈도 제한, CAPTCHA/중복
  방지와 별도 rate limit을 둔다. 등록 시 사용자 계정의 canonical identity를
  사용하고 event status/date/deadline/capacity/active 계정을 서버에서 검사한다.
  목록과 본인 기록을 페이지화하고 응답을 최소화한다.

### P2 — 출시 전 운영 기준에 반영

#### TM-11 페이지·검색·rate limit이 대량 요청을 충분히 제한하지 않는다

- **판정**: 확정, **심각도** P2 / Medium, **신뢰도** 높음
- **근거**: 전역 API 제한은 `server/index.ts:27-47`의 IP당 15분 100회이고,
  인증은 10회지만 계정/이메일별 제한과 분산 저장소가 없다. `trust proxy=1`
  (`:9-10`)은 실제 프록시 체인과 다르면 IP 식별이 틀리거나 전달 헤더를 신뢰하게
  될 수 있다. 게시물 `offset`은 `server/routes/posts.ts:19-31`에서 상한이
  없고 저장소도 `boundedOffset`으로 음수만 막는다(`server/storage.ts:748-752`).
  검색어·태그 길이/개수도 제한이 없다.
- **Task #6과의 관계**: 문의 목록 route는 현재
  `server/routes.ts:29-34,537-554`에서 `limit <= 50`, storage fallback은
  50으로 제한되어 원래의 무제한 page-size 문제를 일부 막고 있다. 그러나
  `page <= 10000`으로 깊은 OFFSET과 매 요청 `COUNT(*)`는 남아 있다. 이 문서는
  Task #6의 제한 수정을 중복 구현하지 않는다. Task #6에서 최대 offset/cursor
  pagination과 count 비용을 처리해야 하며, 문의 외 게시물·등록·조직 목록은
  별도 범위다.
- **공격 흐름/영향**: 공개 클라이언트가 긴 `%term%` ILIKE 검색, 큰 offset,
  여러 태그와 limit 100을 반복해 DB CPU/응답·스크래핑 비용을 올린다. autoscaling
  환경에서는 각 인스턴스의 기본 in-memory limiter가 초기화된다.
- **권장 조치**: 공개/관리자/업로드/문의/메일/등록별 제한과 계정·IP 복합 key,
  중앙 rate-limit 저장소를 사용한다. offset 상한 또는 cursor를 도입하고 검색
  길이·태그 개수·timeout·인덱스 전략을 명시한다. 정확한 배포 프록시 수만
  trust하도록 설정한다.

#### TM-12 로그에 PII와 공급자 응답이 남을 수 있다

- **판정**: 조건부 운영 노출, **심각도** P2 / Medium, **신뢰도** 높음
- **근거**: 일반 요청 logger(`server/index.ts:54-67`)는 method/path/status/시간만
  기록해 request body나 query string을 직접 기록하지 않는 점은 양호하다. 그러나
  `server/routes.ts:45-68`은 token-derived user ID/role과 검증 오류를 로그하고,
  `server/email.ts:26-34`는 Resend 키가 없을 때 수신자·제목·본문 preview를
  로그한다. `server/email.ts:53-64`는 공급자의 전체 오류 응답과 성공 응답을
  로그한다. 문의 답변 라우트(`server/routes.ts:656-658`)와 전역 오류 처리
  (`server/index.ts:81-84`)도 전체 오류 객체를 기록한다.
- **재현 흐름**: 개발/잘못 구성된 배포에서 문의 메일 발송 또는 실패를 발생시키고
  로그 수집기·Replit 로그 열람 권한으로 수신자/본문 일부와 공급자 응답을 읽는다.
- **영향**: 문의 PII·메일 식별자·내부 오류의 보존/접근 범위 확대. 현재 코드에서
  Authorization 헤더나 전체 request body를 로그로 남긴다는 증거는 없으므로
  그 부분은 오탐으로 판정한다.
- **권장 조치**: email/phone/message/token/공급자 body를 구조화 로그에서
  마스킹하고, 오류에는 내부 correlation ID만 남긴다. 로그 보존·접근권한을
  제한하고, 메일 미설정 시 본문 preview를 남기지 않는다. 민감 관리자 변경에는
  별도 감사 이벤트(주체·대상·결과·시각)를 남긴다.

#### TM-13 CSP·운영 배포 문서가 실제 보안 경계와 다르다

- **판정**: 확정된 설정 격차와 조건부 배포 위험, **심각도** P2 / Medium,
  **신뢰도** 높음
- **근거**: `server/index.ts:13-25`의 CSP는 `unsafe-inline`, `unsafe-eval`,
  `img-src https:/blob:`, `connectSrc`의 broad storage/websocket을 허용한다.
  `INSTALLATION_DEPLOYMENT_GUIDE.md:328-333`은 `/api/health`를 “구현되어 있다면”
  사용하라고 하지만 현재 route에는 health endpoint가 없다. 문서는
  `:356-363,537-542`에서 프로덕션 `db:push`를 체크리스트에 두면서 개발 전용
  주의도 함께 적고 있어 운영자가 검토되지 않은 스키마 변경을 할 수 있다.
  필수 변수 목록(`:317-326,628-661`)에는 실제 코드가 사용하는
  `RESEND_API_KEY`, `EMAIL_FROM`, `PRIVATE_OBJECT_DIR`,
  `PUBLIC_OBJECT_SEARCH_PATHS`가 빠져 있다.
- **영향**: XSS 방어 심층 방어 약화, 잘못된 health 판정/배포 실패, 운영 DB
  무결성 및 메일/스토리지 설정 오류.
- **권장 조치**: CSP를 실제 리소스별 allowlist와 nonce/hash로 좁히고
  `object-src 'none'`, `base-uri 'self'`, `frame-ancestors` 등 필요한 정책을
  검토한다. readiness/liveness와 DB 의존성을 명시하고, 프로덕션은 reviewed
  migration/backup/rollback 절차만 사용하도록 문서를 고친다. 필수 환경 변수와
  Bearer JWT/localStorage 실제 인증 방식을 문서에 반영한다.

## 반박되었거나 현재 확인되지 않은 후보

- **SQL injection**: 확인된 DB 접근은 Drizzle builder와 `sql` 템플릿을 사용하며,
  문자열로 SQL을 이어 붙이는 경로는 이 감사에서 찾지 못했다. 입력 길이/인가 문제는
  여전히 존재하지만 SQL injection을 확정 보고하지 않는다.
- **Object path classic traversal**: `getObjectEntityFile()`은 `/objects/` 뒤
  문자열을 private directory에 붙이지만 GCS object name은 파일시스템 경로로
  정규화되지 않는다. `../`로 버킷 밖 파일을 읽는 고전적 traversal은 확인되지
  않았고, 알려진 object name 무단 접근 문제는 TM-02로 확정한다.
- **ACL group 규칙**: `server/objectAcl.ts:6,48-54`에 enum 값과 구현 그룹이
  없어 `aclRules`가 있는 정책은 검사 중 예외가 된다. owner/public 정책과
  다운로드 route 미검사를 통해 핵심 위험이 이미 확정되므로 별도 ACL 우회라고
  과장하지 않는다. 메타데이터가 변조될 수 있는 배포라면 500/가용성 위험이다.
- **Resend HTML injection**: `server/email.ts:8-15,112-123`은 HTML 메일에
  recipient name, 제목, 문의/답변 본문을 escape한다. 따라서 이 경로의 HTML
  injection은 현재 확인하지 않았다. 다만 plain-text 값과 본문 길이·메일 남용은
  TM-10과 TM-12 범위다.
- **로그 전체 요청 본문 노출**: 현재 `server/index.ts:54-67` 요청 logger에는
  body/Authorization이 없다. email fallback/provider logging은 실제 별도 발견이다.

## STRIDE Threat Categories

### Spoofing

JWT 서명과 만료 검증 자체는 있으나, 7일 토큰의 role과 user active 상태를 현재
DB와 대조하지 않아 회수된 관리자·비활성 사용자를 사칭할 수 있다(TM-03). JWT는
`localStorage`에 있어 stored XSS가 토큰 탈취로 연결된다(TM-04). 모든 보호 라우트는
서명·issuer/audience 정책(정한다면)·현재 계정 상태를 검증하고, 계정/메일별
로그인 backoff와 토큰 폐기 수단을 가져야 한다.

### Tampering

일반 사용자가 member의 `userId`, 승인 상태, 공개 상태를 수정할 수 있고(TM-06),
행사 등록이 요청 body의 참석자 신원을 그대로 믿는다(TM-10). 관리자 입력 URL,
번역 HTML과 메타도 서버 정책 없이 저장된다(TM-04, TM-09). 시스템은 소유권과
민감 필드를 서버 allowlist로 강제하고, 게시·행사·회원 business rule을
트랜잭션/DB 제약으로 검증해야 한다.

### Repudiation

현재 요청 로그에는 actor/target/result가 없고 관리자 변경·삭제·메일 발송에 대한
일관된 감사 이벤트가 보이지 않는다. 민감 작업은 인증 주체, 대상 ID, 변경 전후
요약, 결과, 시각을 변조 방지·접근 통제된 감사 로그에 기록해야 하며, 비밀번호·JWT·
문의 본문은 기록하지 않아야 한다.

### Information Disclosure

TM-01의 초안/비공개 게시물, TM-02의 객체, TM-05의 비공개 회원·조직과 연락처,
TM-12의 로그/메일 공급자 응답이 핵심 정보 노출 경로다. 공개 DTO는 최소 필드여야
하고, ID/slug는 비밀키가 아니며, 모든 detail/meta/file 경로가 list와 같은
서버측 visibility·membership·ownership 정책을 적용해야 한다.

### Denial of Service

문의·업로드·행사 등록의 endpoint별 제한 부재, 2MB 본문만으로 보호되는 문의,
무제한 signed upload 크기, 깊은 OFFSET과 `%term%` 검색, 분산되지 않은 IP
rate-limit이 DB/스토리지/메일 비용을 압박한다(TM-10, TM-11). 각 작업별 입력
한도, timeout, pagination, 동시성/메일 큐, 중앙 rate-limit과 저장소 quota가
필요하다. Task #6의 inquiry pagination 수정은 이 보장의 일부다.

### Elevation of Privilege

TM-03의 stale role, TM-06의 소유권 재지정, TM-07의 만료/캐시, TM-08의 최초
관리자 승격이 직접적인 상승 경로다. 프론트 route guard와 permission 표시만으로는
보장되지 않는다. 서버는 현재 active 사용자, 리소스 소유권, 만료된 membership,
민감 작업별 permission을 매 요청 검증해야 한다.

## 의존성 감사

### 실행 결과

2026-08-27 현재 lockfile에 대해 `npm audit`를 실행했다.

| 결과 | 수 |
|---|---:|
| Critical | 0 |
| High | 9 |
| Moderate | 13 |
| Low | 3 |
| 합계 | 25 |

이는 발견된 취약 패키지 수이며 25개의 서로 다른 원격 공격 가능성을 뜻한다고
단정하지 않는다. `npm audit`의 advisory 범위와 실제 import/실행 경로를 분리해
판정해야 한다.

### 직접 의존성 — 즉시 업그레이드 검토

아래는 `package.json`에 직접 선언되어 있고 현재 lockfile 버전이 audit 영향 범위에
들어간 패키지다. 승인 없이 이 감사에서 업그레이드하지 않았다. 각 패키지는
`npm audit`가 제시하는 고정 버전 이상으로 올리고, lockfile 재생성·build·test 후
확인해야 한다.

| 패키지/현재 버전 | audit | 실제 경로와 영향 | 우선 조치 |
|---|---|---|---|
| `@google-cloud/storage@7.19.0` | Moderate | `server/objectStorage.ts`, `server/objectAcl.ts`에서 실제 파일·메타데이터를 다룬다. `retry-request`, `teeny-request`, `uuid` 전이 취약점도 이 런타임 경계로 들어온다. | **즉시 업그레이드**; storage SDK와 전이 패키지 고정 버전 확인 |
| `express@4.22.1` | Moderate | 모든 API의 런타임. `qs`와 `body-parser` 전이 DoS advisory가 요청 파싱 경로에 있다. | **즉시 업그레이드**; major 변경 시 라우트 회귀 테스트 |
| `express-rate-limit@8.2.2` | Moderate | `server/index.ts` 전역/auth limiter 런타임. `ip-address` 전이 패키지 advisory가 실제 IP 파싱 경계에 있다. | **즉시 업그레이드**; proxy/limiter 회귀 테스트 |
| `ws@8.18.0` | High | `server/db.ts`에서 Neon WebSocket 연결에 사용된다. uninitialized memory disclosure와 fragment DoS advisory가 런타임 연결에 해당한다. | **즉시 업그레이드**; Neon 연결/재연결 테스트 |
| `nanoid@5.1.6` | High | `server/vite.ts` 개발 middleware에서 사용되고 Uppy/Vite 번들에도 있다. 음수/0 size custom generator advisory는 현재 호출이 기본 생성인지 확인해야 한다. | **즉시 업그레이드**; 호출부가 공격자 size를 받지 않는지 유지 |
| `vite@5.4.21` | High | `server/vite.ts`의 개발 서버/빌드 도구. 프로덕션 정적 bundle 자체와는 구분되지만 공개 dev server의 파일/경로 advisory는 실제 노출 시 중요하다. | **즉시 업그레이드**; 개발 서버를 공개 배포하지 말고 build 확인 |
| `postcss@8.5.10` | High | Tailwind/autoprefixer/Vite 빌드 경로. sourceMappingURL 기반 파일 읽기 advisory는 빌드 입력과 실행 위치에 조건부다. | **즉시 업그레이드**; production build에서 source map 정책 확인 |
| `drizzle-kit@0.31.10` | Moderate | `db:push`/개발 스키마 도구이며 웹 요청 런타임 import는 없다. `@esbuild-kit` 전이 advisory의 개발 도구 영향이다. | **즉시 업그레이드**; 운영에서는 reviewed migration 사용 |

### 전이 의존성 — 상위 패키지와 함께 고정/업그레이드

- `brace-expansion@2.1.0` (High)은 `tailwindcss -> sucrase -> glob ->
  minimatch` 경로의 dev/build dependency다. 현재 공개 API의 직접 경로는 아니지만
  build runner에 untrusted pattern이 들어가는지 확인하고 Tailwind toolchain을
  업데이트한다.
- `fast-xml-builder@1.1.5`, `form-data@2.5.5`, `gaxios@6.7.1`,
  `retry-request@7.0.2`, `teeny-request@9.0.0`, `uuid@8.3.2/9.0.1`은
  `@google-cloud/storage@7.19.0` 아래에 있다. storage SDK 업그레이드로 함께
  해소하고, XML·multipart 입력을 외부에서 직접 받는 경로가 없는지 확인한다.
- `ip-address@10.1.0`은 `express-rate-limit` 아래에 있으며 advisory에는
  XSS/SSRF trust-boundary와 관련된 동작이 포함된다. 현재 앱은 이를 rate-limit
  IP 파싱에 사용하므로 proxy 설정 검증과 함께 업그레이드한다.
- `qs@6.15.1`/`6.14.2`, `body-parser@1.20.5`는 Express 요청 파싱 런타임이다.
  `express` 업그레이드가 우선이며, `express.urlencoded`가 `extended:false`인
  점은 범위를 줄이지만 advisory를 무시할 근거는 아니다.
- `linkify-it@5.0.0`, `markdown-it@14.1.1`은 `@tiptap/pm ->
  prosemirror-markdown` 전이 dependency다. 현재 게시물 저장 경로는 HTML을 직접
  다루므로 이 패키지의 markdown parser가 공격 입력을 처리하는지 별도 확인하고
  실제 사용하지 않으면 제거를 검토한다.
- `esbuild`와 `@esbuild-kit/core-utils`/`esm-loader`는 Vite/Drizzle Kit/tsx
  개발·빌드 경로다. `server/vite.ts`가 dev에서 `allowedHosts: true`를 사용하므로
  개발 서버를 인터넷에 노출하지 않는 것이 upgrade와 별개인 필수 완화책이다.
- `@babel/core`, `@tootallnate/once` 등 Low advisory도 lockfile의 전이 결과로
  기록한다. Critical은 없지만, 보안 업데이트를 월간 작업으로 미루지 말고 위의
  직접 런타임 패키지와 함께 lockfile을 재검사한다.

## 필요한 보안 보장

1. 모든 사용자·관리자 데이터 API는 서버에서 현재 active 계정, 역할/permission,
   resource visibility와 ownership을 검증해야 한다.
2. 공개 게시물은 `published + public + 유효 기간`만 반환하고, 회원 등급 콘텐츠는
   유효한 멤버십과 등급을 서버에서 계산해야 한다.
3. 역할 변경·비활성화·멤버십 만료는 짧은 지연 없이 토큰과 권한 캐시에 반영되어야 한다.
4. 비밀번호·JWT·API 키·문의 본문·연락처는 응답/로그에 불필요하게 포함하지 않는다.
   특히 joined user 객체는 password hash를 제외한 명시적 DTO만 사용한다.
5. HTML, URL, 이미지, 동영상, 메타데이터는 서버 allowlist와 sanitization을 통과해야
   하며, 브라우저에는 unsafe inline/eval 없는 CSP와 안전한 MIME 헤더를 제공한다.
6. Object Storage 파일은 public/private 정책과 application ACL을 일치시키고,
   다운로드마다 호출자 권한을 확인한다. 업로드 타입·magic bytes·크기·quota를
   서버에서 검사한다.
7. 문의·등록·답변·업로드·검색은 작업별 요청/계정/IP 제한, 필드 길이, timeout,
   pagination과 비용 보호를 가져야 한다.
8. 관리자 생성·삭제·승인·권한 변경은 감사 이벤트와 회귀 테스트를 가져야 하며,
   최초 bootstrap에는 공개 자동 승격이 없어야 한다.
9. production은 고정된 취약점 없는 lockfile과 검토된 migration, 분리된 secret,
   실제 health/readiness 설정으로 배포되어야 한다.

## 수정 순서와 회귀 테스트 요구

### 수정 순서

1. **P0 즉시**: TM-01 게시물 공개 쿼리 분리, TM-02 Object Storage ACL 집행과
   리소스 접근 정책, TM-03 현재 사용자/활성/역할 재검증, TM-04 HTML sanitization과
   CSP 축소. 이 네 항목이 해결되기 전에는 외부 공개를 승인하지 않는다.
2. **P1 다음**: TM-05/06 DTO·소유권, TM-07 만료/캐시, TM-08 bootstrap,
   TM-09 업로드/URL 검증, TM-10 문의·행사 입력/비용 제한.
3. **P2 및 출시 게이트**: TM-11 pagination/rate limit(Task #6 포함),
   TM-12 로그 redaction/audit trail, TM-13 배포 문서·health/migration,
   그리고 직접 런타임 의존성 업그레이드.

### 반드시 추가할 회귀 테스트

- 익명 요청이 draft/archived/members/premium/internal 게시물·번역·메타를
  list, slug, ID, meta 어느 경로로도 받지 못한다. 유효한 회원 등급과 비회원의
  응답 필드도 각각 검증한다.
- 비공개 객체는 익명/낮은 등급에서 401/403이고 허용 사용자만 읽는다.
  public 객체는 읽되 ACL 메타데이터 오류가 안전한 오류로 끝나는지 검증한다.
- 관리자 토큰 발급 후 role demotion, `isActive=false`, membership expiry를
  적용하면 다음 민감 요청이 즉시 거부된다. 기존 token과 새 login 모두 시험한다.
- 저장 HTML에서 event handler, `javascript:`, 위험한 data/SVG가 제거되고,
  정상적인 허용 태그/링크는 유지된다. 실제 브라우저에서 저장형 XSS가 실행되지
  않는지 확인한다.
- 일반 사용자의 member 수정에서 `userId`, 승인/공개/등급 필드 변경이 거부되고,
  다른 UUID detail과 inactive organization detail은 공개되지 않는다.
- 빈 DB의 동시 등록은 공개 admin을 만들지 않고, bootstrap 이후 등록자는 admin이
  아니다. 이메일·IP backoff와 rate limit도 시험한다.
- 업로드 signed URL로 허위 MIME, 허용 초과 크기, HTML/SVG/실행 파일을 직접 PUT해도
  public 게시물로 승인되지 않는다.
- 문의/답변/등록 필드의 길이·빈도·수신자·이벤트 마감/정원 규칙과 페이지 제한을
  서버가 적용하고, 관리자/본인 응답에 password hash·불필요한 PII가 없다.
- 로그 snapshot에 Authorization, 비밀번호, 문의 본문, 전체 이메일 공급자 응답이
  없고, 민감 작업에는 actor/target/result 감사 이벤트만 남는다.
- `npm audit`, `npm run check`, `npm run build`, `npm test`를 clean lockfile에
  실행하고, production bundle은 Vite dev middleware를 포함하지 않는다.