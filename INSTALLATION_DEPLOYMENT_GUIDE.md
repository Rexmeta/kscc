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
- **Node.js**: v20 이상
- **npm**: v9 이상
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

2. **스키마 푸시**
   ```bash
   npm run db:push
   ```

   이 명령어는 `shared/schema.ts`의 스키마를 데이터베이스에 적용합니다.

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
   DATABASE_URL=postgresql://username:password@localhost:5432/korcham_db
   ```

4. **스키마 적용**
   ```bash
   npm run db:push
   ```

### 데이터베이스 스키마 수정

스키마를 수정할 때:

1. `shared/schema.ts` 파일 수정
2. 변경사항 푸시:
   ```bash
   npm run db:push
   ```

⚠️ **주의**: `db:push`는 개발 환경용입니다. 프로덕션에서는 마이그레이션을 사용하세요.

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

# 데이터베이스 스키마 푸시
npm run db:push

# 데이터베이스 스키마 강제 푸시 (데이터 손실 가능)
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
- [ ] 모든 환경 변수가 준비되었는지 확인
- [ ] 프로덕션 데이터베이스 설정 완료
- [ ] 데이터베이스 스키마가 최신 상태인지 확인

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
   
   필수 환경 변수:
   - `DATABASE_URL`: 프로덕션 PostgreSQL 데이터베이스 URL
   - `SESSION_SECRET`: 강력한 랜덤 문자열 (최소 32자)
   - `NODE_ENV`: `production`
   
   설정 방법:
   - Deployments 탭에서 "Environment Variables" 섹션
   - 또는 Replit Secrets에서 설정한 변수가 자동으로 주입됨

5. **Health Check 설정** (선택사항)
   
   Autoscale 배포의 경우:
   - **Path**: `/` 또는 `/api/health` (구현되어 있다면)
   - **Port**: `5000`
   - **Timeout**: 30초

6. **배포 시작**
   - "Deploy" 버튼 클릭
   - 빌드 및 배포 진행 상황 모니터링

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

**데이터베이스 스키마 적용:**

```bash
# 프로덕션 데이터베이스에 스키마 푸시
DATABASE_URL=<production-db-url> npm run db:push
```

⚠️ **주의**: 프로덕션 데이터베이스에는 `--force` 플래그를 사용하지 마세요.

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
   
   # 데이터베이스 스키마 적용
   heroku run npm run db:push
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

##### 2. 환경 변수
- [ ] `NODE_ENV=production` 설정
- [ ] `DATABASE_URL` 프로덕션 데이터베이스 URL 설정
- [ ] `SESSION_SECRET` 강력한 랜덤 문자열 설정 (최소 32자)
- [ ] 모든 필수 환경 변수가 배포 플랫폼에 설정되었는지 확인
- [ ] 개발용 환경 변수와 프로덕션 환경 변수가 분리되었는지 확인

##### 3. 데이터베이스
- [ ] 프로덕션 데이터베이스 생성 완료
- [ ] 개발 DB와 프로덕션 DB 분리 확인
- [ ] 프로덕션 DB에 스키마 적용 (`npm run db:push`)
- [ ] 데이터베이스 백업 전략 수립
- [ ] 데이터베이스 연결 테스트 완료

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
  - [ ] `GET /api/events`
  - [ ] `GET /api/news`
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

2. **문제 진단**
   - 로그 확인
   - 에러 메시지 분석
   - 데이터베이스 상태 확인

3. **수정 및 재배포**
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

### 필수 환경 변수

```bash
# 데이터베이스
DATABASE_URL=postgresql://user:password@host:port/database

# 세션 (프로덕션)
SESSION_SECRET=<강력한-랜덤-문자열>

# 환경 구분
NODE_ENV=development  # 또는 production
```

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
DATABASE_URL=postgresql://localhost:5432/korcham_db
SESSION_SECRET=dev-secret-change-in-production
NODE_ENV=development
```

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
  pg_dump $DATABASE_URL > backup.sql
  ```
- **코드**: Git 저장소에 커밋
- **환경 변수**: 안전한 곳에 문서화

### 모니터링 체크리스트
- [ ] 일일 로그 검토
- [ ] 주간 성능 메트릭 확인
- [ ] 월간 보안 패치 적용
- [ ] 분기별 데이터베이스 최적화

---

이 가이드는 한중총상회 웹사이트의 설치, 개발, 배포를 위한 완전한 참조 문서입니다. 추가 질문이나 문제가 있으면 프로젝트 관리자에게 문의하세요.
