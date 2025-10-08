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

### Replit 배포 (Publishing)

Replit에서는 "Publishing" 기능을 통해 앱을 배포합니다.

#### 1. 배포 준비

배포 전 체크리스트:
- [ ] 모든 환경 변수가 설정되었는지 확인
- [ ] 데이터베이스 스키마가 최신 상태인지 확인
- [ ] 프로덕션 빌드가 정상 작동하는지 테스트
- [ ] 프로덕션 데이터베이스 설정

#### 2. 배포 유형 선택

Replit은 여러 배포 옵션을 제공합니다:

##### A. **Autoscale Deployment** (권장)
- **용도**: 트래픽이 변동하는 웹 애플리케이션
- **특징**:
  - 트래픽에 따라 자동 확장/축소
  - 유휴 시 0으로 축소 (비용 절감)
  - 요청이 있을 때만 과금
- **설정 방법**:
  1. Replit 워크스페이스에서 "Publish" 버튼 클릭
  2. "Autoscale" 선택
  3. 배포 설정 구성
  4. "Deploy" 클릭

##### B. **Reserved VM Deployment**
- **용도**: 항상 실행되어야 하는 애플리케이션
- **특징**:
  - 전용 가상 머신에서 실행
  - 예측 가능한 성능
  - 고정 비용
- **설정 방법**:
  1. "Publish" → "Reserved VM" 선택
  2. VM 사양 선택
  3. 배포

##### C. **Static Deployment**
- **용도**: 정적 파일만 호스팅 (API 없이)
- **특징**:
  - 가장 저렴
  - 정적 HTML/CSS/JS만 제공
- **참고**: 현재 프로젝트는 백엔드가 있어 Static은 부적합

#### 3. 배포 프로세스

```bash
# 1. 프로덕션 빌드 테스트 (로컬)
npm run build  # (있을 경우)

# 2. Replit Publishing UI 사용
```

Replit Publishing UI에서:
1. "Publish" 버튼 클릭
2. 배포 유형 선택 (Autoscale 권장)
3. 환경 변수 설정:
   - `DATABASE_URL`: 프로덕션 데이터베이스 URL
   - 기타 필요한 시크릿 키
4. "Deploy" 클릭

#### 4. 도메인 설정

배포 후 도메인 옵션:
- **기본**: `<your-app>.replit.app`
- **커스텀 도메인**: 
  1. Publishing 설정에서 "Custom Domain" 추가
  2. DNS 레코드 설정 (Replit 안내 따름)
  3. TLS/SSL 자동 설정

#### 5. 프로덕션 데이터베이스

⚠️ **중요**: 개발 데이터베이스와 프로덕션 데이터베이스를 분리하세요.

프로덕션 데이터베이스 옵션:
1. **Replit PostgreSQL**: Replit에서 제공하는 Neon 기반 데이터베이스
2. **외부 데이터베이스**: Neon, Supabase, AWS RDS 등

프로덕션 데이터베이스 설정:
```bash
# 프로덕션 환경에서 스키마 적용
DATABASE_URL=<production-db-url> npm run db:push
```

#### 6. 배포 모니터링

배포 후 모니터링:
- Replit Publishing 대시보드에서 로그 확인
- 성능 메트릭 확인
- 에러 로그 모니터링

### 다른 플랫폼에 배포

#### Vercel 배포

1. **프로젝트 준비**
   ```bash
   npm install -g vercel
   ```

2. **vercel.json 설정**
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "server/index.ts",
         "use": "@vercel/node"
       }
     ],
     "routes": [
       {
         "src": "/api/.*",
         "dest": "server/index.ts"
       },
       {
         "src": "/(.*)",
         "dest": "client/index.html"
       }
     ]
   }
   ```

3. **배포**
   ```bash
   vercel
   ```

#### Heroku 배포

1. **Procfile 생성**
   ```
   web: npm run dev
   ```

2. **Heroku 설정**
   ```bash
   heroku create <app-name>
   heroku addons:create heroku-postgresql:hobby-dev
   git push heroku main
   ```

#### Railway 배포

1. Railway 프로젝트 생성
2. GitHub 연결
3. 환경 변수 설정
4. 자동 배포

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
