# 설치 및 배포 가이드

이 문서는 한중총상회 웹사이트의 설치, 개발, 배포에 대한 상세 가이드입니다.

## 목차

1. [시스템 요구사항](#시스템-요구사항)
2. [로컬 개발 환경 설정](#로컬-개발-환경-설정)
3. [프로젝트 구조](#프로젝트-구조)
4. [데이터베이스 설정](#데이터베이스-설정)
5. [개발 서버 실행](#개발-서버-실행)
6. [배포 가이드](#배포-가이드)
7. [환경 변수 설정](#환경-변수-설정)
8. [문제 해결](#문제-해결)

---

## 시스템 요구사항

### 필수 요구사항
- **Node.js**: v22 이상 (`package.json`의 `engines` 기준)
- **npm**: v10 이상
- **PostgreSQL**: v14 이상 (또는 Replit 내장 데이터베이스)

### 권장 사양
- RAM: 최소 4GB
- 디스크 공간: 최소 1GB

---

## 로컬 개발 환경 설정

### 1. 프로젝트 클론

```bash
# Replit에서 프로젝트를 포크하거나
# Git 저장소에서 클론
git clone <repository-url>
cd <project-directory>
```

### 2. 의존성 설치

Replit 환경에서는 자동으로 패키지가 설치됩니다. 로컬 환경에서는:

```bash
npm install
```

설치되는 주요 패키지:
- **프론트엔드**: React, Vite, TailwindCSS, shadcn/ui
- **백엔드**: Express, Drizzle ORM
- **인증**: Passport.js, bcrypt
- **상태관리**: TanStack Query
- **라우팅**: Wouter
- **유효성 검사**: Zod

### 3. 개발 도구 설정

프로젝트는 TypeScript로 작성되었으며, 다음 도구들이 설정되어 있습니다:

- **ESLint**: 코드 품질 관리
- **TypeScript**: 타입 안정성
- **Drizzle Kit**: 데이터베이스 마이그레이션
- **tsx**: TypeScript 실행 환경

---

## 프로젝트 구조

```
project-root/
├── client/                 # 프론트엔드 코드
│   ├── src/
│   │   ├── components/    # React 컴포넌트
│   │   ├── pages/        # 페이지 컴포넌트
│   │   ├── lib/          # 유틸리티 함수
│   │   └── hooks/        # 커스텀 React Hooks
│   ├── index.html
│   └── public/
│
├── server/                # 백엔드 코드
│   ├── index.ts          # Express 서버 진입점
│   ├── routes.ts         # API 라우트 정의
│   ├── storage.ts        # 데이터 저장소 인터페이스
│   └── vite.ts           # Vite 개발 서버 설정
│
├── shared/               # 공유 코드
│   └── schema.ts         # 데이터베이스 스키마 및 타입
│
├── attached_assets/      # 정적 파일
├── drizzle.config.ts     # Drizzle ORM 설정
├── vite.config.ts        # Vite 번들러 설정
├── tailwind.config.ts    # TailwindCSS 설정
└── package.json          # 프로젝트 의존성
```

### 주요 디렉토리 설명

#### `/client` - 프론트엔드
- **components/**: 재사용 가능한 UI 컴포넌트
- **pages/**: 라우트별 페이지 컴포넌트
- **lib/**: 헬퍼 함수, API 클라이언트, i18n 설정
- **hooks/**: 커스텀 React Hooks

#### `/server` - 백엔드
- **index.ts**: Express 애플리케이션 설정 및 시작
- **routes.ts**: REST API 엔드포인트 정의
- **storage.ts**: 데이터 액세스 레이어

#### `/shared` - 공유 모듈
- **schema.ts**: Drizzle ORM 스키마, Zod 유효성 검사 스키마

---

## 데이터베이스 설정

### Replit 환경

Replit에서는 내장 PostgreSQL 데이터베이스를 사용합니다:

1. **데이터베이스 생성**
   - Replit 대시보드에서 "Database" 도구 선택
   - PostgreSQL 데이터베이스 생성
   - 자동으로 `DATABASE_URL` 환경 변수가 설정됩니다

2. **개발 데이터베이스에 스키마 적용**
   ```bash
   npm run db:push
   ```

   `db:push`는 개발 데이터베이스에서 빠르게 확인할 때만 사용합니다.

### 로컬 환경

1. **PostgreSQL 설치**
   ```bash
   # Ubuntu/Debian
   sudo apt-get install postgresql
   
   # macOS (Homebrew)
   brew install postgresql
   ```

2. **데이터베이스 생성**
   ```bash
   createdb korcham_db
   ```

3. **환경 변수 설정**
   `.env` 파일 생성:
   ```
   DATABASE_URL=<development-database-url>
   ```

4. **개발 스키마 적용**
   ```bash
   npm run db:push
   ```

### 데이터베이스 스키마 수정

스키마를 수정할 때:

1. `shared/schema.ts` 파일 수정
2. 마이그레이션 SQL 생성:
   ```bash
   npm run db:generate
   ```
3. 생성된 `migrations/` SQL을 검토하고 개발 데이터베이스에 적용:
   ```bash
   npm run db:migrate
   ```

⚠️ **주의**: `db:push`는 개발 환경용입니다. 프로덕션에서는 백업하고 검토한
마이그레이션만 적용합니다. 운영 데이터베이스에 `--force` 또는 무검토
`db:push`를 실행하지 마세요.

---

## 개발 서버 실행

### Replit 환경

1. "Run" 버튼 클릭 또는
2. Shell에서:
   ```bash
   npm run dev
   ```

서버는 자동으로 시작되며 다음을 제공합니다:
- **포트 5000**: 프론트엔드 + 백엔드 (통합)
- 자동 리로드: 코드 변경 시 자동 재시작

### 로컬 환경

```bash
npm run dev
```

브라우저에서 `http://localhost:5000` 접속

### 개발 스크립트

```bash
# 개발 서버 실행
npm run dev

# TypeScript 타입 체크
npm run check

# 개발 데이터베이스 스키마 푸시 (프로덕션에서는 사용하지 않음)
npm run db:push

# 마이그레이션 SQL 생성 및 적용
npm run db:generate
npm run db:migrate

# 강제 푸시 (개발 데이터베이스에서도 데이터 손실 가능)
npm run db:push -- --force
```

---

## 배포 가이드

### 프로덕션 빌드

모든 플랫폼에 배포하기 전에 프로덕션 빌드가 필요합니다.

#### 빌드 프로세스

```bash
# 프로덕션 빌드
npm run build
```

이 명령어는:
1. **프론트엔드**: Vite로 React 앱을 빌드하여 최적화된 정적 파일 생성
2. **백엔드**: esbuild로 TypeScript 서버 코드를 번들링하여 `dist/` 디렉토리에 저장

#### 프로덕션 실행

```bash
# 프로덕션 모드로 실행
npm start
```

이 명령어는 빌드된 서버 (`dist/index.js`)를 Node.js로 실행합니다.

#### 로컬 프로덕션 테스트

배포 전 로컬에서 프로덕션 빌드를 테스트하세요:

```bash
# 1. 빌드
npm run build

# 2. 프로덕션 환경 변수 설정
export NODE_ENV=production
export DATABASE_URL=<your-production-db-url>
export SESSION_SECRET=<strong-random-secret>

# 3. 실행
npm start
```

브라우저에서 `http://localhost:5000` 접속하여 확인

### Replit 배포 (Deployments)

Replit에서는 **Deployments** 기능을 통해 앱을 배포합니다.

#### 1. 배포 준비 체크리스트

배포 전 필수 확인 사항:
- [ ] 프로덕션 빌드가 로컬에서 정상 작동하는지 테스트
- [ ] 프로덕션 환경 변수와 Object Storage·메일 설정이 준비되었는지 확인
- [ ] 프로덕션 데이터베이스 설정 완료
- [ ] 검토된 마이그레이션과 백업·복구 계획 확인

#### 2. 배포 유형 선택

Replit은 여러 배포 옵션을 제공합니다:

##### A. **Autoscale Deployment** (권장)
- **용도**: 트래픽이 변동하는 웹 애플리케이션
- **특징**:
  - 트래픽에 따라 자동 확장/축소
  - 유휴 시 0으로 축소 (비용 절감)
  - 요청이 있을 때만 과금
  - Google Cloud Platform에서 호스팅

##### B. **Reserved VM Deployment**
- **용도**: 항상 실행되어야 하는 애플리케이션
- **특징**:
  - 전용 가상 머신에서 실행
  - 예측 가능한 성능
  - 고정 비용
  - 24/7 실행 보장

##### C. **Static Deployment**
- **용도**: 정적 파일만 호스팅
- **참고**: 현재 프로젝트는 백엔드 API가 있어 Static Deployment는 부적합

#### 3. Replit Deployments 설정

1. **Deployments 탭 열기**
   - Replit 워크스페이스 상단의 "Deployments" 탭 클릭
   - 또는 Command Bar에서 "Deployments" 검색

2. **배포 유형 선택**
   - "Autoscale" 또는 "Reserved VM" 선택 (Autoscale 권장)

3. **빌드 및 실행 명령 설정**
   
   **Build Command:**
   ```bash
   npm run build
   ```
   
   **Run Command:**
   ```bash
   npm start
   ```

4. **환경 변수 설정**
   
   배포 환경에는 아래 [환경 변수 설정](#환경-변수-설정)의 프로덕션
   목록을 설정합니다. `DATABASE_URL`, `SESSION_SECRET`, `NODE_ENV`,
   Object Storage 설정, 문의 답변 메일을 사용하는 경우의 Resend 설정을
   누락하지 마세요.
   
   설정 방법:
   - Deployments 탭에서 "Environment Variables" 섹션
   - 또는 Replit Secrets에서 설정한 변수가 자동으로 주입됨

5. **Health Check 설정** (필수)
   
   Autoscale 배포의 경우:
   - **Liveness Path**: `/healthz`
   - **Readiness Path**: `/readyz`
   - **Port**: `5000`
   - **Timeout**: 5초 (readiness 내부 데이터베이스 확인 제한은 2초)
   - `/healthz`는 프로세스가 응답하는지만 확인하며 데이터베이스를 조회하지
     않습니다. `/readyz`가 200일 때만 트래픽을 전달하세요.

6. **배포 시작**
   - "Deploy" 버튼 클릭
   - 빌드 및 배포 진행 상황 모니터링

#### Reverse proxy와 요청 IP

서버는 `app.set("trust proxy", 1)`로 **바로 앞의 reverse proxy 한 홉만**
신뢰합니다. 따라서 Express의 `req.ip`와 `express-rate-limit`의 IP별 제한은
배포 플랫폼의 프록시가 전달한 클라이언트 IP를 기준으로 동작합니다. Replit
Deployment처럼 애플리케이션 앞에 프록시가 정확히 한 개 있는 환경에서만
그대로 사용하세요.

- TLS 종료와 `X-Forwarded-For` 추가는 신뢰하는 배포 프록시가 담당해야 합니다.
- 앱을 프록시 없이 직접 인터넷에 노출하거나 프록시를 여러 홉 거치게 바꾸면
  `trust proxy` 값을 코드와 함께 검토합니다. 임의의 클라이언트가
  `X-Forwarded-For`를 주입할 수 있는 구성에서는 rate limit의 IP 식별을
  신뢰할 수 없습니다.
- 기본 rate limit 저장소는 프로세스 메모리입니다. 여러 인스턴스에서는 제한이
  인스턴스별로 적용되므로, 전역 IP 제한이 필요한 경우 별도 작업으로
  공유 저장소 도입을 검토해야 합니다.

#### 4. 프로덕션 데이터베이스 설정

⚠️ **중요**: 개발 데이터베이스와 프로덕션 데이터베이스를 반드시 분리하세요.

**프로덕션 데이터베이스 옵션:**

1. **Replit PostgreSQL** (권장)
   - Replit에서 제공하는 Neon 기반 관리형 데이터베이스
   - 자동 백업 및 확장
   - Deployments 탭에서 "Add PostgreSQL" 클릭

2. **외부 데이터베이스**
   - Neon.tech
   - Supabase
   - AWS RDS
   - Digital Ocean Managed Databases

**프로덕션 데이터베이스 스키마 변경 절차:**

`db:push`는 프로덕션 운영 절차가 아닙니다. 스키마 변경은 아래 순서를
지키고, 담당자의 검토와 승인 없이 실행하지 마세요.

1. 개발 또는 스테이징 데이터베이스에서 변경을 만들고 마이그레이션 SQL을
   생성합니다.
   ```bash
   npm run db:generate
   ```
2. 생성된 `migrations/` SQL을 코드 리뷰하고, 스테이징에서 먼저
   `npm run db:migrate`로 적용합니다. 호환성, 인덱스/잠금 시간, 애플리케이션
   배포 순서를 확인합니다.
3. 운영 변경 직전에 운영 데이터베이스를 백업합니다. 백업 파일은 저장소에
   커밋하지 말고 접근이 제한된 별도 보관소에서 복구 가능 여부를 확인합니다.
   ```bash
   pg_dump --format=custom --file=korcham-$(date +%Y%m%d-%H%M%S).dump "$DATABASE_URL"
   ```
4. 승인된 동일 마이그레이션만 운영 데이터베이스에 적용합니다.
   ```bash
   npm run db:migrate
   ```
5. 애플리케이션을 배포하고 `/healthz`와 `/readyz`를 확인합니다. readiness가
   503이면 트래픽을 열지 말고 로그에서 원인을 확인합니다.

`npm run db:push`와 `--force`는 운영 데이터베이스에서 실행하지 않습니다.
이 프로젝트에는 자동으로 안전한 down migration을 생성하는 절차가 없으므로,
롤백은 먼저 검토한 역방향 마이그레이션을 사용하고, 그것이 없으면 승인된
점검 시간에 검증된 백업을 복구합니다. 백업 복구는 이후 데이터가 사라질 수
있으므로 현재 쓰기를 중지하고 담당자 승인을 받은 뒤 수행해야 합니다.

#### 5. 도메인 설정

**기본 도메인:**
- 자동 할당: `<your-app-name>.replit.app`

**커스텀 도메인 설정:**

1. Deployments 탭에서 "Domains" 섹션 선택
2. "Add Custom Domain" 클릭
3. 도메인 입력 (예: `www.example.com`)
4. DNS 레코드 설정:
   - **Type**: CNAME
   - **Name**: `www` (또는 서브도메인)
   - **Value**: Replit이 제공하는 CNAME 값
5. TLS/SSL 인증서 자동 생성 및 적용

#### 6. 배포 모니터링 및 관리

**로그 확인:**
- Deployments 탭 → "Logs" 섹션
- 실시간 서버 로그 및 에러 추적

**성능 메트릭:**
- CPU 사용률
- 메모리 사용량
- 요청 수 및 응답 시간
- 자동 스케일링 이벤트 (Autoscale의 경우)

**재배포:**
- 코드 변경 후 "Redeploy" 버튼 클릭
- 자동으로 새 빌드 및 배포 진행

**롤백:**
- 이전 배포 버전으로 롤백 가능
- Deployments 탭에서 배포 기록 확인

### 운영 관측성 및 로그 계약

애플리케이션 로그는 외부 모니터링 제품에 종속되지 않는 JSON Lines 형식의
운영 이벤트입니다. 모든 API 요청에는 `X-Request-ID` 응답 헤더와
`correlationId`/`requestId` 필드가 함께 기록됩니다. 요청이 보낸 ID가
영숫자·`.`, `_`, `:`, `-`로만 구성되고 128자 이하이면 재사용하고, 그 외에는
새 ID를 생성합니다.

요청 이벤트(`http.request`)에는 `method`, `route`, `status`, `durationMs`,
`outcome` 및 correlation ID만 기록됩니다. `outcome`은 `success`,
`client_error`, `server_error` 중 하나입니다. 메모리 메트릭은 전체 요청/오류/
누적 시간, outcome별 수, 최대 100개 정규화 route로 제한되어 프로세스 메모리
이상으로 노출되지 않습니다.

인증(`auth.failure`), 관리자 변경(`admin.change`), 메일(`email.delivery`),
오브젝트 스토리지(`storage.failure`) 및 도메인 작업 이벤트는 `severity`
(`info`, `warn`, `error`), 작업 종류, 결과, 오류 타입처럼 조사에 필요한
최소 필드만 기록합니다. 요청 본문, Authorization 헤더, 비밀번호,
이메일·전화번호, 문의 내용, 파일 경로/내용, 외부 provider 응답은 로그에
기록하지 않습니다. 운영 로그의 보존 기간과 접근 권한은 조직의 사고 대응
정책에 맞추고, 필요 기간이 지나면 삭제합니다. 장기 감사 저장소로 복사할
때도 같은 필드 제한과 보존 기간을 적용합니다.

#### API 장애·지연 경보 기준

`http.alert` 경고는 외부 모니터링 제품과 무관하게 애플리케이션 프로세스
내부에서 계산됩니다. 다음 기준은 최근 5분의 최대 1,000건 API 요청이
최소 20건일 때만 적용됩니다.

- **서버 오류율**: HTTP 5xx가 5% 이상이면 `reason: "server_error_rate"` 경고를
  한 번 기록합니다. 4xx는 이 비율에 포함하지 않습니다.
- **지연 시간**: 전체 API 요청의 p95가 1,000ms 이상이면
  `reason: "latency_p95"` 경고를 한 번 기록합니다.
- 각 경고에는 기준을 넘긴 요청의 `correlationId`/`requestId`, 측정 건수 및
  기준값만 포함됩니다. 경로, 사용자, 요청 내용, 인증 정보는 포함하지
  않습니다. JSON Lines 수집기에서는 `event=http.alert` 및
  `severity=warn`으로 필터링합니다.

경보는 기준을 넘긴 동안 반복하지 않습니다. 최근 5분 창에서 해당 지표가
기준 아래로 내려가면 다음 초과 시 다시 기록할 수 있도록 자동으로
재무장됩니다. 요청이 없는 동안에는 별도 복구 로그를 만들지 않으며 다음
API 요청에서 창을 정리하고 상태를 갱신합니다. 메트릭과 경보 상태는
프로세스 메모리에 있으므로 재배포·재시작 시 초기화됩니다. Autoscale을
사용하면 각 실행 인스턴스가 독립적으로 계산하므로 로그 수집기에서 같은
경보를 합치지 말고 인스턴스별 경보로 처리해야 합니다.

`/healthz`는 프로세스 생존만 확인하며 데이터베이스나 오브젝트 스토리지를
조회하지 않습니다. `/readyz`는 요청 처리에 필요한 데이터베이스 연결만
최대 2초 동안 확인하고, 외부에는 `{"status":"ready"}` 또는
`{"status":"not_ready"}`만 반환합니다. 연결 문자열·오류 상세·환경 변수는
상태 응답에 포함하지 않습니다.

### 다른 플랫폼에 배포

#### Vercel 배포

Vercel은 프론트엔드와 서버리스 함수에 최적화되어 있습니다. Express 백엔드를 사용하는 이 프로젝트는 Vercel보다 다른 플랫폼이 더 적합합니다.

#### Heroku 배포

1. **Procfile 생성**
   
   프로젝트 루트에 `Procfile` 생성:
   ```
   web: npm start
   ```

2. **Heroku 프로젝트 생성 및 설정**
   
   ```bash
   # Heroku CLI 로그인
   heroku login
   
   # 앱 생성
   heroku create <app-name>
   
   # PostgreSQL 추가
   heroku addons:create heroku-postgresql:essential-0
   
   # 환경 변수 설정
   heroku config:set NODE_ENV=production
   heroku config:set SESSION_SECRET=$(openssl rand -base64 32)
   
   # DATABASE_URL은 PostgreSQL 애드온이 자동 설정
   ```

3. **빌드팩 설정**
   
   ```bash
   # Node.js 빌드팩 (자동 감지됨)
   heroku buildpacks:add heroku/nodejs
   ```
   
   **참고**: Node.js 빌드팩은 배포 시 자동으로 `npm run build` 스크립트를 실행합니다 (package.json에 정의된 경우).

4. **배포**
   
   ```bash
   # Git 저장소에서 Heroku로 푸시
   git push heroku main
   
   # 사전에 검토하고 승인한 마이그레이션 적용
   heroku run npm run db:migrate
   ```

5. **로그 확인**
   
   ```bash
   heroku logs --tail
   ```

#### Railway 배포

1. **Railway 프로젝트 생성**
   - https://railway.app 접속
   - GitHub 저장소 연결

2. **PostgreSQL 추가**
   - "New" → "Database" → "PostgreSQL" 선택
   - 자동으로 `DATABASE_URL` 환경 변수 설정

3. **환경 변수 설정**
   - Settings → Variables 탭
   - `NODE_ENV=production` 추가
   - `SESSION_SECRET` 추가 (랜덤 문자열)

4. **빌드 및 실행 명령 설정**
   
   Settings → Deploy 탭:
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`

5. **도메인 설정**
   - Settings → Networking 탭
   - "Generate Domain" 클릭
   - 또는 커스텀 도메인 추가

6. **배포**
   - GitHub 푸시 시 자동 배포
   - 또는 Railway 대시보드에서 수동 배포

#### Render 배포

1. **Render 웹 서비스 생성**
   - https://render.com 접속
   - "New" → "Web Service" 선택
   - GitHub 저장소 연결

2. **설정**
   - **Environment**: Node
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Port**: 5000 (자동 감지)

3. **PostgreSQL 추가**
   - "New" → "PostgreSQL" 선택
   - 데이터베이스 생성
   - 웹 서비스에 연결 (환경 변수로 DATABASE_URL 자동 추가)

4. **환경 변수**
   - `NODE_ENV=production`
   - `SESSION_SECRET=<강력한-랜덤-문자열>`
   - `DATABASE_URL` (PostgreSQL 연결 시 자동)

5. **배포**
   - "Create Web Service" 클릭
   - Git 푸시 시 자동 재배포

### 프로덕션 배포 체크리스트

모든 플랫폼에 배포하기 전 반드시 확인해야 할 사항입니다.

#### 배포 전 필수 체크

##### 1. 빌드 검증
- [ ] 로컬에서 `npm run build` 성공 확인
- [ ] 빌드된 파일 (`dist/`) 생성 확인
- [ ] 로컬에서 `npm start`로 프로덕션 빌드 실행 및 테스트
- [ ] 모든 페이지가 정상 작동하는지 확인
- [ ] API 엔드포인트 정상 응답 확인
- [ ] 실행 중 `/healthz`가 200 (`{"status":"ok"}`)인지 확인
- [ ] 실행 중 `/readyz`가 200 (`{"status":"ready"}`)인지 확인

##### 2. 환경 변수
- [ ] `NODE_ENV=production` 설정
- [ ] `DATABASE_URL` 프로덕션 데이터베이스 URL 설정
- [ ] `SESSION_SECRET` 강력한 랜덤 문자열 설정 (최소 32자)
- [ ] `PRIVATE_OBJECT_DIR`와 `PUBLIC_OBJECT_SEARCH_PATHS` 설정 및 버킷 권한 확인
- [ ] 메일을 발송하는 운영 환경에 `RESEND_API_KEY`와 검증된 `EMAIL_FROM` 설정
- [ ] `PORT`와 DB pool 설정을 배포 플랫폼의 실행 방식에 맞게 확인
- [ ] 개발용 환경 변수와 프로덕션 환경 변수가 분리되었는지 확인

##### 3. 데이터베이스
- [ ] 프로덕션 데이터베이스 생성 완료
- [ ] 개발 DB와 프로덕션 DB 분리 확인
- [ ] 마이그레이션 SQL 생성·리뷰·스테이징 적용 완료
- [ ] 운영 변경 직전 백업 생성 및 복구 가능 여부 확인
- [ ] 승인된 마이그레이션만 운영 DB에 적용 (`npm run db:migrate`)
- [ ] `/readyz`로 데이터베이스 연결 테스트 완료

##### 4. 보안
- [ ] 모든 시크릿 키가 환경 변수로 관리되는지 확인
- [ ] 코드에 하드코딩된 비밀번호/API 키가 없는지 확인
- [ ] `.env` 파일이 `.gitignore`에 포함되었는지 확인
- [ ] CORS 설정이 프로덕션에 맞게 구성되었는지 확인
- [ ] 세션 설정이 프로덕션 환경에 적합한지 확인

##### 5. 성능 및 최적화
- [ ] 프로덕션 빌드가 최적화되었는지 확인 (minification, tree-shaking)
- [ ] 이미지 및 정적 파일 최적화
- [ ] 데이터베이스 쿼리 최적화 확인
- [ ] 불필요한 로그 제거 또는 로그 레벨 조정

##### 6. 모니터링 및 로깅
- [ ] 에러 로깅 설정
- [ ] 성능 모니터링 도구 설정 (선택사항)
- [ ] 배포 후 로그 확인 방법 숙지

##### 7. 재현 가능한 출시 명령

잠금 파일을 기준으로 같은 의존성을 설치한 뒤 아래 순서로 실행합니다.
마이그레이션 적용은 이 목록과 별도로 승인된 변경 창에서 수행합니다.

```bash
set -euo pipefail
npm ci
npm run release:verify
```

`release:verify`는 타입 체크, 테스트, 운영 의존성 감사, Drizzle
스키마/마이그레이션 일관성 검사, 프로덕션 빌드, 임시 프로덕션 서버를
대상으로 한 liveness/readiness 및 대표 API smoke 검사를 순서대로 수행합니다.
어느 단계에서든 실패하면 0이 아닌 코드로 즉시 종료하며 단계명과 수정
방향을 출력합니다. 마이그레이션 적용은 이 검증과 별도로 승인된 변경 창에서
`npm run db:migrate`를 실행합니다.

배포 후에는 배포 플랫폼이 제공한 실제 URL로 health와 대표 API를 확인합니다.
URL을 저장소나 환경 변수에 기록하지 마세요.

```bash
curl --fail --silent --show-error https://<deployed-host>/healthz
curl --fail --silent --show-error https://<deployed-host>/readyz
SMOKE_BASE_URL=https://<deployed-host> npm run smoke:api
```

#### 배포 후 검증

##### 1. 기능 테스트
- [ ] 배포된 URL에 접속 확인
- [ ] 주요 페이지 정상 작동 확인
  - [ ] 홈페이지 (`/`)
  - [ ] 행사 페이지 (`/events`)
  - [ ] 뉴스 페이지 (`/news`)
  - [ ] 로그인/회원가입 (`/login`, `/register`)
  - [ ] 관리자 페이지 (`/admin`) (인증 후)
- [ ] API 엔드포인트 테스트
  - [ ] `GET /api/posts?postType=event&limit=1`
  - [ ] `GET /api/posts?postType=news&limit=1`
  - [ ] `GET /api/members`
  - [ ] `POST /api/auth/login`
- [ ] 데이터베이스 연동 확인
  - [ ] 데이터 조회 정상 작동
  - [ ] 데이터 생성/수정/삭제 테스트

##### 2. 성능 검증
- [ ] 페이지 로딩 속도 확인
- [ ] API 응답 시간 측정
- [ ] 데이터베이스 쿼리 성능 확인
- [ ] 모바일/데스크톱 반응성 테스트

##### 3. 보안 검증
- [ ] HTTPS 연결 확인
- [ ] SSL/TLS 인증서 유효성 확인
- [ ] 세션 관리 정상 작동 확인
- [ ] 권한 제어 테스트 (관리자/일반 사용자)

##### 4. 모니터링
- [ ] 배포 플랫폼에서 로그 확인
- [ ] 에러 로그 모니터링
- [ ] CPU/메모리 사용량 확인
- [ ] 트래픽 및 요청 수 모니터링

#### 롤백 계획

배포 후 문제 발생 시:

1. **즉시 롤백**
   - Replit: Deployments 탭에서 이전 버전으로 롤백
   - Heroku: `heroku rollback`
   - Railway/Render: 대시보드에서 이전 배포 선택
   - 롤백 직후 `/healthz`와 `/readyz`가 각각 200인지 확인

2. **문제 진단**
   - 로그 확인
   - 에러 메시지 분석
   - 데이터베이스 상태 확인

3. **데이터베이스 변경이 원인인 경우**
   - 애플리케이션 롤백만으로 스키마가 되돌아가지 않음을 전제로 합니다.
   - 검토된 역방향 마이그레이션을 사용하거나, 쓰기를 중지하고 승인받은
     백업을 복구합니다.
   - 복구 후 `/readyz`와 핵심 읽기 기능을 확인합니다.

4. **수정 및 재배포**
   - 로컬에서 문제 재현 및 수정
   - 테스트 완료 후 재배포

#### 지속적인 유지보수

배포 후 정기적으로:

- **일일**: 로그 검토, 에러 모니터링
- **주간**: 성능 메트릭 확인, 보안 업데이트 확인
- **월간**: 데이터베이스 백업 확인, 의존성 업데이트
- **분기**: 전체 시스템 점검, 용량 계획 재검토

---

## 환경 변수 설정

애플리케이션 프로세스와 운영 작업이 읽는 변수는 개발 환경과 프로덕션
환경에 각각 설정합니다. 값 자체를 문서, 저장소, 로그에 기록하지 마세요.

### 애플리케이션 시작에 필요한 변수

| 변수 | 개발 환경 | 프로덕션 환경 |
| --- | --- | --- |
| `DATABASE_URL` | 개발용 PostgreSQL 연결 문자열 | 개발 DB와 분리된 운영 PostgreSQL 연결 문자열 |
| `SESSION_SECRET` | 개발 전용 임의 값 | 충분히 긴 새 비밀값. 개발과 재사용하지 않음 |
| `NODE_ENV` | `development` | `production` |

`DATABASE_URL`과 `SESSION_SECRET`이 없으면 애플리케이션이 시작되지 않습니다.
`PORT`는 선택 사항이며 기본값은 `5000`입니다. 배포 플랫폼이 지정한 포트를
사용할 때만 설정합니다.

### 기능별 운영 변수

| 변수 | 필요 시점 | 설명 |
| --- | --- | --- |
| `PRIVATE_OBJECT_DIR` | 업로드·비공개 리소스 사용 시 필수 | Object Storage의 비공개 객체 경로 |
| `PUBLIC_OBJECT_SEARCH_PATHS` | 공개 리소스 사용 시 필수 | 쉼표로 구분한 공개 객체 검색 경로 |
| `RESEND_API_KEY` | 문의 답변 메일 발송 시 필수 | Resend API 인증 비밀값 |
| `EMAIL_FROM` | 프로덕션 메일 발송 시 필수 | Resend에서 검증한 발신 주소 |

Object Storage 경로가 없으면 해당 객체 작업이 실패합니다. `EMAIL_FROM`을
지정하지 않으면 코드의 개발용 기본 발신 주소가 사용되므로, 프로덕션에서는
반드시 검증된 주소를 설정합니다. `RESEND_API_KEY`가 없으면 메일은 발송되지
않고 응답의 `emailSent`가 `false`가 됩니다.

### 런타임·데이터베이스 pool 설정

| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `DB_POOL_MAX` | `10` | 프로세스별 최대 DB 연결 수 |
| `DB_IDLE_TIMEOUT_MS` | `30000` | 유휴 연결 유지 시간(밀리초) |
| `DB_CONNECTION_TIMEOUT_MS` | `10000` | DB 연결 대기 제한(밀리초) |

세 값은 양의 정수만 사용합니다. 지정하지 않으면 위 기본값이 적용되며,
잘못된 값도 기본값으로 대체되므로 배포 전에 값을 확인합니다. `PORT`의
기본값은 `5000`입니다. 일회성 관리자 초기화 작업을 수행할 때만
`ADMIN_BOOTSTRAP_EMAIL`과 `ADMIN_BOOTSTRAP_PASSWORD`를 별도로 설정하고,
완료 후 제거합니다. 이 두 값은 일반 웹 프로세스의 필수 설정이 아닙니다.

### Replit에서 환경 변수 설정

1. **Secrets 도구 사용**:
   - 좌측 사이드바에서 "Secrets" 선택
   - 키-값 쌍 추가
   - 자동으로 환경 변수로 주입됨

2. **개발 vs 프로덕션**:
   - 개발: Replit 개발 환경의 Secrets
   - 프로덕션: Publishing 설정에서 환경 변수 설정

### 로컬 환경 변수 (.env)

`.env` 파일 생성 (Git에 커밋하지 말 것):
```bash
DATABASE_URL=<development-database-url>
SESSION_SECRET=<development-only-secret>
NODE_ENV=development
PRIVATE_OBJECT_DIR=<development-private-object-dir>
PUBLIC_OBJECT_SEARCH_PATHS=<development-public-object-paths>
# 메일이 필요한 개발 환경에서만 설정
# RESEND_API_KEY=<development-resend-key>
# EMAIL_FROM=<verified-development-sender>
# DB_POOL_MAX=10
# DB_IDLE_TIMEOUT_MS=30000
# DB_CONNECTION_TIMEOUT_MS=10000
```

프로덕션에서는 Deployment 환경 변수에 같은 이름으로 운영 값을 설정하고,
개발 환경의 데이터베이스·세션 비밀값·Object Storage 경로·메일 키를 재사용하지
않습니다.

---

## 문제 해결

### 일반적인 문제

#### 1. 포트 충돌
**증상**: `Error: listen EADDRINUSE: address already in use`

**해결책**:
```bash
# 실행 중인 프로세스 찾기
lsof -i :5000

# 프로세스 종료
kill -9 <PID>
```

#### 2. 데이터베이스 연결 실패
**증상**: `Error: connect ECONNREFUSED`

**해결책**:
- `DATABASE_URL` 환경 변수 확인
- PostgreSQL 서비스 실행 확인
- 네트워크 연결 확인

```bash
# PostgreSQL 상태 확인
pg_isready

# 서비스 재시작 (Linux)
sudo service postgresql restart
```

#### 3. 패키지 설치 실패
**증상**: `npm install` 에러

**해결책**:
```bash
# 캐시 정리
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

#### 4. TypeScript 컴파일 에러
**증상**: 타입 에러

**해결책**:
```bash
# 타입 체크
npm run check

# node_modules/@types 재설치
npm install --save-dev @types/node @types/react @types/express
```

#### 5. Vite 빌드 실패
**증상**: 프론트엔드 로딩 실패

**해결책**:
```bash
# Vite 캐시 삭제
rm -rf node_modules/.vite

# 개발 서버 재시작
npm run dev
```

### Replit 특정 문제

#### 1. 워크플로우가 시작되지 않음
**해결책**:
- "Start application" 워크플로우 재시작
- Shell에서 수동 실행: `npm run dev`

#### 2. 데이터베이스 연결 끊김
**해결책**:
- Replit Database 도구에서 연결 상태 확인
- 워크플로우 재시작

#### 3. 환경 변수가 로드되지 않음
**해결책**:
- Secrets 도구에서 변수 재확인
- Repl 재시작

### 성능 최적화

#### 프론트엔드 최적화
```typescript
// 컴포넌트 레이지 로딩
const SomePage = lazy(() => import('./pages/SomePage'));

// 이미지 최적화
<img loading="lazy" src="..." alt="..." />

// TanStack Query 캐싱 설정
queryClient.setDefaultOptions({
  queries: {
    staleTime: 1000 * 60 * 5, // 5분
  },
});
```

#### 백엔드 최적화
```typescript
// 데이터베이스 쿼리 최적화
// N+1 문제 해결 - 관계 데이터 한 번에 로드
const events = await db.query.events.findMany({
  with: {
    registrations: true,
  },
});

// 페이지네이션
.limit(limit)
.offset(offset)
```

---

## 추가 리소스

### 문서
- [Replit Docs - Deployments](https://docs.replit.com/cloud-services/deployments/about-deployments)
- [Drizzle ORM](https://orm.drizzle.team/docs/overview)
- [TanStack Query](https://tanstack.com/query/latest)
- [shadcn/ui](https://ui.shadcn.com/)
- [Vite](https://vitejs.dev/)

### 커뮤니티
- Replit Community Forum
- GitHub Issues

---

## 업데이트 및 유지보수

### 정기 업데이트
```bash
# 의존성 업데이트 확인
npm outdated

# 안전한 업데이트
npm update

# 주요 버전 업데이트 (신중히)
npm install <package>@latest
```

### 백업
- **데이터베이스**: 정기적으로 백업
  ```bash
  pg_dump --format=custom --file=korcham-$(date +%Y%m%d-%H%M%S).dump "$DATABASE_URL"
  ```
  백업 파일은 저장소 밖의 접근 제한된 보관소에 두고, 실제 복구 가능 여부를
  정기적으로 확인합니다. 운영 변경 직전 절차는 위의 프로덕션 데이터베이스
  절차를 따릅니다.
- **코드**: Git 저장소에 커밋
- **환경 변수**: 안전한 곳에 문서화

### 모니터링 체크리스트
- [ ] 일일 로그 검토
- [ ] 주간 성능 메트릭 확인
- [ ] 월간 보안 패치 적용
- [ ] 분기별 데이터베이스 최적화

---

이 가이드는 한중총상회 웹사이트의 설치, 개발, 배포를 위한 완전한 참조 문서입니다. 추가 질문이나 문제가 있으면 프로젝트 관리자에게 문의하세요.
