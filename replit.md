# Korea Sichuan-Chongqing Chamber of Commerce Website

## Overview

This is a full-stack web application for the Korea Sichuan-Chongqing Chamber of Commerce (한국 사천-충칭 총상회), a business association facilitating economic, trade, and cultural exchanges between Korea and the Sichuan-Chongqing regions of China. The platform serves as a hub for member management, event coordination, news distribution, and business networking. The application supports multilingual content (Korean, English, Chinese) and provides public-facing pages alongside authenticated member areas.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### Unified Posts System Migration (November 15, 2025)

#### Backend Hydration Implementation
- **storage.getPosts()** now returns `PostWithTranslations[]` instead of `Post[]`, with all translations hydrated using batch fetching (3 queries total) to prevent N+1 queries
- **Search functionality** added to Posts API: EXISTS subquery matches title/content/excerpt in post_translations table, plus slug in posts table (case-insensitive ILIKE)
- **Removed meta/locale filtering** from getPosts due to type incompatibility; all translations now returned for multi-locale support

#### News Pages Migration
- **NewsCard.tsx** refactored to consume `PostWithTranslations` directly instead of legacy `News` type
- **convertToNews adapter removed** from News.tsx; all components now use PostWithTranslations natively
- **Home.tsx** updated to use `/api/posts?postType=news&status=published` instead of `/api/news`
- **NewsDetail.tsx** refactored to use `/api/posts/:id` instead of `/api/news/:id`, fixing 404 error
- **Locale-aware helpers**: `getTranslationSafe()` and `getMetaValue()` added to each component for consistent data extraction

#### Event Pages Migration
- **EventCard.tsx** refactored to use `PostWithTranslations` with `getEventMeta()` for type-safe event meta extraction; Date fields (eventDate, endDate, registrationDeadline) automatically converted from ISO strings to Date objects via `getMetaTimestamp()`
- **Events.tsx** migrated to `/api/posts?postType=event&status=published&upcoming=true` endpoint with SQL-level upcoming filter
- **EventDetail.tsx** fully refactored to use PostWithTranslations: GET `/api/posts/:id` for data fetch, POST `/api/posts/:id/register` for event registration
- **Backend registration endpoint**: POST `/api/posts/:id/register` added with authentication, post existence check (using getPostWithTranslations), postType validation, duplicate registration check
- **Upcoming filter**: SQL EXISTS subquery on post_meta.value_timestamp > NOW() with IS NOT NULL guard for accurate pagination
- **Event sorting**: Upcoming events now ordered by eventDate ASC (earliest first) using application-layer sorting (in-memory) after batch fetch; other posts ordered by publishedAt DESC (Drizzle-safe implementation)
- **Shared helpers**: `getTranslationSafe()` and `getEventMeta()` provide consistent data access across all event components
- **E2E testing**: Full Events flow verified via Playwright - event listing, sorting, detail pages, and navigation all working correctly

## System Architecture

### Frontend Architecture

**Framework & Tooling:** React 18 with TypeScript, Vite, Wouter for routing, TanStack Query for server state, React Hook Form with Zod for form validation.

**UI Components:** shadcn/ui built on Radix UI, Tailwind CSS with custom design tokens, dark mode support, and responsive mobile-first design.

**State Management:** React Context for authentication, TanStack Query for server state, React Hook Form for form state.

**Internationalization:** Custom i18n system supporting Korean (ko), English (en), and Chinese (zh) with runtime language switching and multilingual content stored in the database.

### Backend Architecture

**Server Framework:** Express.js with TypeScript for RESTful API endpoints, JWT-based authentication, and middleware for logging and error handling.

**Authentication & Authorization:** JWT for stateless authentication, bcrypt for password hashing, and a comprehensive 5-tier, 5-role, 27-permission ACL system with wildcard support.

**API Structure:** RESTful conventions with endpoints for authentication (`/api/auth`), users (`/api/users`), members (`/api/members`), events (`/api/events`), news (`/api/news`), resources (`/api/resources`), inquiries (`/api/inquiries`), and partners (`/api/partners`).

**Data Access Layer:** Storage abstraction pattern, type-safe database queries using Drizzle ORM, connection pooling via Neon, and transaction support.

### Database Architecture

**ORM & Migrations:** Drizzle ORM for type-safe database access, Drizzle Kit for schema migrations, and Zod schemas generated from Drizzle for validation.

**Schema Design:** PostgreSQL database with key tables including `users`, `members`, `events`, `eventRegistrations`, `news`, `resources`, `inquiries`, and `partners`.

### System Design Choices

*   **User Type System**: Two distinct user types: 'staff' (운영진) for internal chamber staff and 'company' (회원사) for member organizations. Company users are atomically created with associated member profiles using database transactions. Server-side enforcement prevents client-side privilege escalation. Registration flow supports both user types with dynamic form validation.
*   **Language System**: Global language state managed via React Context (`LanguageContext.tsx`) with `localStorage` persistence and Router key-based remounting, enabling instant, no-reload language switching. Uses `useLanguage()` hook for accessing/updating language state. Router remounts on language change via `key={language}` prop, ensuring all components re-render with new translations. Supports Korean, English, and Simplified Chinese (简体中文 - using 总 not 總, 国 not 國).
*   **Access Control List (ACL)**: Comprehensive 5-tier, 5-role, 27-permission hierarchical system implemented on both frontend and backend, securing routes and conditionally rendering UI elements.
*   **Dashboard Features**: Full user profile management (name, email, password) and event registration management (view, cancel registrations) with robust validation and ownership checks.
*   **Content Management**: Detailed content fields for events and news. Image management features for news and events, supporting multiple images via URL input or Replit Object Storage uploads, stored as JSONB arrays.
*   **About Page**: Updated with official chamber information, including Mission, Vision, Core Functions, Organization Structure, and Future Vision, with a professional design and responsive layouts.
*   **Image Storage**: Normalized image storage paths to use relative paths (`/objects/uploads/{file-id}`) from `PRIVATE_OBJECT_DIR`, ensuring correct image serving and compatibility.

## External Dependencies

**Database:**
- Neon Serverless PostgreSQL (`@neondatabase/serverless`)

**Authentication:**
- jsonwebtoken (JWT)
- bcrypt

**Build & Development:**
- Vite
- esbuild
- TypeScript
- tsx

**Replit Integration:**
- `@replit/vite-plugin-runtime-error-modal`
- `@replit/vite-plugin-cartographer`
- `@replit/vite-plugin-dev-banner`

**UI & Styling:**
- Tailwind CSS
- PostCSS
- Radix UI primitives
- Google Fonts (Inter, Noto Sans KR, Noto Sans SC)

**Form Handling:**
- react-hook-form
- @hookform/resolvers
- Zod

**Date Handling:**
- date-fns

**Session Management:**
- connect-pg-simple (configured, but JWT is primary)