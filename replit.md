# Korea Sichuan-Chongqing Chamber of Commerce Website

## Overview

This is a full-stack web application for the Korea Sichuan-Chongqing Chamber of Commerce (한국 사천-충칭 총상회), a business association facilitating economic, trade, and cultural exchanges between Korea and the Sichuan-Chongqing regions of China. The platform serves as a hub for member management, event coordination, news distribution, and business networking.

The application is built with a modern TypeScript stack featuring React on the frontend, Express.js on the backend, and PostgreSQL for data persistence. It supports multilingual content (Korean, English, Chinese) and provides both public-facing pages and authenticated member areas.

## Recent Changes (November 2025)

### ACL (Access Control List) System (November 12, 2025)
- **Hierarchical Permission System**: Implemented comprehensive 5-tier, 5-role, 27-permission ACL
  - **Tiers**: MEMBER (₩0), PRO (₩100,000), CORP (₩500,000), PARTNER (₩0), ADMIN
  - **Roles**: guest, member, editor, operator, admin
  - **Permissions**: 27 fine-grained permissions across events, news, resources, members, settings, and admin functions
  - Wildcard support: "event.*" grants all event permissions, "*" grants all permissions
  
- **Backend Implementation**:
  - `server/permissions.ts`: Permission check middleware with caching (5min TTL) and wildcard matching
  - `server/routes.ts`: Protected routes with requirePermission middleware
    - Events: event.create, event.update, event.delete
    - News: news.create, news.update, news.delete
    - Resources: resource.upload, resource.update, resource.delete
  - `server/seedAcl.ts`: ACL seed script for initial data
  - `server/migrateUsers.ts`: Migration script for existing users to new membership system
  - `/api/users`: List all users with membership info (admin only)
  - `/api/users/:id/membership`: Update user tier/role (admin only)
  - `/api/auth/me`: Enhanced with membership and permissions data
  - Security: SQL injection prevention via Drizzle query builder + Zod UUID validation

- **Frontend Implementation**:
  - `useAuth` hook: Extended with permissions array and permission checking functions
    - hasPermission: Supports exact match and wildcard matching (*, event.*, etc.)
    - hasAnyPermission, hasAllPermissions: Built on hasPermission with wildcard support
  - Permission-based UI buttons across all major pages:
    - Events: "행사 등록" button (event.create)
    - News: "뉴스 작성" button (news.create)
    - Resources: "자료 업로드" button (resource.upload)
    - Members: "회원 관리" button (member.manage)
  - All buttons link to /admin page with appropriate tabs
  - Admin.tsx: New "사용자" (Users) tab for user management
  - Displays user email, name, tier badge, and role badge
  - React Query integration with proper Authorization headers

- **Database Schema**:
  - `tiers` table: Membership tiers with pricing
  - `roles` table: User roles with hierarchy
  - `permissions` table: Fine-grained permissions
  - `rolePermissions` table: Role-to-permission mappings
  - `userMemberships` table: User tier/role assignments

- **Testing**:
  - E2E test verified all admin buttons appear correctly for admin user
  - Wildcard permissions work on both frontend and backend
  - Buttons conditionally render based on user permissions

### Dashboard User Features (November 12, 2025)
- **Profile Management**: Implemented comprehensive user profile update functionality
  - Backend: PATCH /api/auth/profile endpoint with selective field updates
  - Supports updating name, email, and password independently
  - Password change requires current password confirmation
  - Email uniqueness validation (409 Conflict on duplicates)
  - Ownership verification ensures users can only update their own profiles
  
- **Event Registration Management**: Full event cancellation workflow
  - Backend: GET /api/auth/registrations endpoint returns user's registrations with event details
  - Backend: PATCH /api/auth/registrations/:id endpoint for cancellation
  - Cancellation business rules: only registered/approved events can be cancelled
  - Status validation prevents duplicate cancellations
  - UUID validation and ownership checks for security
  
- **Frontend Dashboard (Dashboard.tsx)**:
  - Profile edit dialog with React Hook Form + Zod validation
  - Conditional validation: empty fields allowed, non-empty fields validated
  - Event registration list with status badges and action buttons
  - Cancel button visibility controlled by registration status
  - Confirmation dialog for cancellation actions
  - Toast notifications for success/error feedback
  - Real-time cache invalidation via React Query
  
- **Data Types**:
  - `UserRegistrationWithEvent`: Backend join type combining registration + event data
  - `ProfileUpdateFormData`: Zod schema with optional fields and conditional validation
  
- **Known Issues**:
  - Minor UI sync anomaly where name input may empty upon reopening dialog (does not affect functionality)

### About Page Content Update (November 12, 2025)
- **Complete Page Redesign**: Updated About page with official chamber information
  - Hero section with chamber name and introduction in Chinese
  - Mission (使命) and Vision (愿景) sections with detailed objectives
  - Core Functions (核心功能) section with 4 main service areas:
    - 贸易与投资促进平台 (Trade and Investment Platform)
    - 产业对接与专业咨询 (Industry Matching & Consulting)
    - 创新与综合服务 (Innovation & Comprehensive Services)
    - 文化交流与社会发展 (Cultural Exchange & Social Development)
  - Organization Structure (组织架构) section explaining governance
  - Future Vision (携手同行 共创未来) with partnership goals
  - Three Pillars section: 企业对接, 文化交流, 法律服务
- **Design Elements**:
  - Gradient blue backgrounds for hero and vision sections
  - Icon-based cards using Lucide React icons
  - Responsive grid layouts
  - Professional Chinese business content

### Image Storage Path Normalization (November 11, 2025)
- **Fixed Image Path Storage**: Resolved issue where uploaded images were stored with full bucket paths
  - `/api/images` PUT endpoint now extracts relative path from `PRIVATE_OBJECT_DIR`
  - Images stored as `/objects/uploads/{file-id}` instead of full bucket path
  - Fixed `ObjectNotFoundError` when serving uploaded images
- **Data Migration**: Updated existing database records
  - Event images: Normalized to `/objects/uploads/{id}` format
  - News images: Removed incorrect `/objects/` prefix from external URLs
  - Mixed content support: Internal uploads use `/objects/` prefix, external URLs remain unchanged

### Event Content Field (November 11, 2025)
- **Added Multiline Content Support**: Event forms now include detailed content field
  - `CreateEventDialog` and `EditEventForm` include content textarea
  - Line breaks preserved through `whitespace-pre-wrap` in `EventDetail` page
  - Content stored in `events.content` column

### Image Management Features (October 2025)
- **News Articles**: Added featured image and multiple additional images support
  - Admin form includes featured image URL input
  - Dynamic image array management with add/remove functionality
  - Images displayed in news detail page with gallery layout
- **Events**: Added multiple images support
  - Dynamic image URL array management in admin forms
  - Images stored in database and displayed in EventDetail page
- **Implementation Details**:
  - Dual-method support: URL input and file upload via Replit Object Storage
  - Object storage integration with Uppy interface for file uploads
  - Images stored as JSONB arrays in database
  - Null handling for empty image arrays
  - Test IDs added for E2E testing

### News Detail Page (October 2025)
- Created dedicated news article detail page at `/news/:id`
- Displays featured image at top (when available)
- Shows additional images in 2-column grid gallery
- Includes share functionality and back navigation
- Fixed accessibility issues with nested interactive elements

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Tooling:**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server
- Wouter for lightweight client-side routing
- TanStack Query (React Query) for server state management and data fetching
- React Hook Form with Zod for form validation

**UI Components:**
- shadcn/ui component library built on Radix UI primitives
- Tailwind CSS for styling with custom design tokens
- Support for dark mode through CSS variables
- Responsive design with mobile-first approach

**State Management:**
- Authentication state managed through React Context (`AuthProvider`)
- Server state cached and synchronized via TanStack Query
- Form state handled by React Hook Form
- Toast notifications for user feedback

**Internationalization:**
- Custom i18n system supporting Korean (ko), English (en), and Chinese (zh)
- Language switcher component for runtime language changes
- Multilingual content stored in database with separate fields per language

### Backend Architecture

**Server Framework:**
- Express.js with TypeScript for API endpoints
- RESTful API design with JWT-based authentication
- Middleware for request logging and error handling
- Session management with JWT tokens

**Authentication & Authorization:**
- JWT (JSON Web Tokens) for stateless authentication
- bcrypt for password hashing
- Role-based access control (member vs admin)
- Middleware functions for route protection (`authenticateToken`, `requireAdmin`)

**API Structure:**
The API follows RESTful conventions with the following main endpoint groups:
- `/api/auth/*` - User authentication (register, login, session management)
- `/api/users/*` - User profile management
- `/api/members/*` - Chamber member directory and profiles
- `/api/events/*` - Event listings and registrations
- `/api/news/*` - News articles and announcements
- `/api/resources/*` - Document downloads and resource library
- `/api/inquiries/*` - Contact form submissions
- `/api/partners/*` - Partner organization directory

**Data Access Layer:**
- Storage abstraction pattern (`IStorage` interface) for database operations
- Type-safe database queries using Drizzle ORM
- Connection pooling via Neon's serverless PostgreSQL driver
- Transaction support for complex operations

### Database Architecture

**ORM & Migrations:**
- Drizzle ORM for type-safe database access
- Schema definitions in `shared/schema.ts` with TypeScript types
- Drizzle Kit for schema migrations
- Zod schemas generated from Drizzle schemas for validation

**Schema Design:**

The database uses PostgreSQL with the following main tables:

1. **users** - Authentication and user accounts
   - UUID primary key
   - Email, password (hashed), name
   - Role (member/admin) and account status

2. **members** - Chamber member profiles
   - Company information with multilingual fields (KR/EN/ZH)
   - Industry, country, location details
   - Membership level (regular/premium/sponsor)
   - Contact information and visibility settings
   - Foreign key to users table

3. **events** - Event management
   - Event details with multilingual content
   - Date, location, category, capacity
   - Registration settings and speaker information
   - Published status for content control

4. **eventRegistrations** - Event attendance tracking
   - Links events to users
   - Attendee information and registration status
   - Payment tracking for paid events

5. **news** - News and announcements
   - Article content with multilingual support
   - Category (notice/press/activity)
   - Author, publishing date, view counter
   - Featured content flag

6. **resources** - Document library
   - File information and download URLs
   - Category (reports/forms/presentations/guides)
   - Access control (public/member-only)
   - Download tracking

7. **inquiries** - Contact form submissions
   - Inquiry categorization
   - Contact information and message
   - Status tracking (pending/replied)

8. **partners** - Partner organizations
   - Partner information with logos
   - Partnership type and website links

### External Dependencies

**Database:**
- Neon Serverless PostgreSQL - Cloud-hosted PostgreSQL database
- Connection via `@neondatabase/serverless` package
- WebSocket support for serverless environments
- Environment variable: `DATABASE_URL`

**Authentication:**
- jsonwebtoken (JWT) - Token generation and verification
- bcrypt - Password hashing and comparison
- Environment variable: `SESSION_SECRET` for JWT signing

**Build & Development:**
- Vite - Frontend build tool and dev server
- esbuild - Backend bundling for production
- TypeScript compiler - Type checking across codebase
- tsx - TypeScript execution for development

**Replit Integration:**
- `@replit/vite-plugin-runtime-error-modal` - Development error overlay
- `@replit/vite-plugin-cartographer` - Development tooling
- `@replit/vite-plugin-dev-banner` - Development environment indicator

**UI & Styling:**
- Tailwind CSS - Utility-first CSS framework
- PostCSS with Autoprefixer - CSS processing
- Multiple Radix UI primitives - Accessible UI components
- Google Fonts - Typography (Inter, Noto Sans KR, Noto Sans SC)

**Form Handling:**
- react-hook-form - Form state management
- @hookform/resolvers - Integration with validation libraries
- Zod - Runtime type validation and schema validation

**Date Handling:**
- date-fns - Date formatting and manipulation

**Session Management:**
- connect-pg-simple - PostgreSQL session store (configured but JWT is primary auth method)

The application is designed to run on Replit with environment-based configuration, requiring a provisioned PostgreSQL database and a session secret for production deployments.