# Korea Sichuan-Chongqing Chamber of Commerce Website

## Overview

This is a full-stack web application for the Korea Sichuan-Chongqing Chamber of Commerce (한국 사천-충칭 총상회). Its purpose is to facilitate economic, trade, and cultural exchanges between Korea and the Sichuan-Chongqing regions of China. The platform functions as a central hub for member management, event coordination, news distribution, and business networking. It supports multilingual content (Korean, English, Chinese) and offers both public-facing content and authenticated member-specific areas. The project aims to serve as a vital tool for the chamber's operations and outreach.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Tooling:** React 18 with TypeScript, Vite, Wouter for routing, TanStack Query for server state management, and React Hook Form with Zod for form validation.

**UI Components:** Built with shadcn/ui (based on Radix UI) and styled using Tailwind CSS, including custom design tokens, dark mode support, and a responsive mobile-first approach.

**State Management:** Utilizes React Context for authentication, TanStack Query for server-side data, and React Hook Form for managing form states.

**Internationalization:** Features a custom i18n system that supports Korean (ko), English (en), and Chinese (zh). It allows for runtime language switching and stores multilingual content directly in the database.

### Backend Architecture

**Server Framework:** Express.js with TypeScript, providing RESTful API endpoints, JWT-based authentication, and middleware for logging and error handling.

**Authentication & Authorization:** Implements JWT for stateless authentication, bcrypt for secure password hashing, and a comprehensive 5-tier, 5-role, 27-permission ACL system with wildcard support.

**API Structure:** Adheres to RESTful conventions, offering dedicated endpoints for authentication, users, members, a unified posts system (for news, events, pages), resources, inquiries, and partners.

**Data Access Layer:** Employs a storage abstraction pattern with type-safe database queries using Drizzle ORM, connection pooling via Neon, and full transaction support.

### Database Architecture

**ORM & Migrations:** Drizzle ORM for type-safe data access and Drizzle Kit for managing schema migrations. Zod schemas are generated from Drizzle for robust validation.

**Schema Design:** PostgreSQL database featuring key tables such as `users`, `members`, `posts` (unified for news, events, pages), `post_translations`, `post_meta`, `eventRegistrations`, `inquiries`, `inquiry_replies`, and `partners`.

### System Design Choices

*   **User Type System**: Supports 'staff' (운영진) and 'company' (회원사) user types, with atomic creation of company users and associated member profiles. Server-side logic prevents privilege escalation.
*   **Language System**: Global language state managed via React Context with `localStorage` persistence and router key-based remounting for instant, no-reload language switching.
*   **Access Control List (ACL)**: A hierarchical 5-tier, 5-role, 27-permission system is enforced on both frontend and backend for security and UI rendering.
*   **Content Management**: Features detailed content fields for news and events, including image management that supports multiple images via URLs or Replit Object Storage uploads, stored as JSONB arrays. Static page content (About, Contact) is database-driven and multilingual.
*   **Unified Posts System**: A core architectural decision to unify news, events, and static pages (`postType='page'`) under a single `posts` table with associated `post_translations` and `post_meta` tables, optimizing data management and multilingual support.
*   **Inquiry Reply System**: Implemented with a dedicated `inquiry_replies` table for threaded conversations and an integrated email notification system using Resend API for sending replies to users.

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

**Email Service:**
- Resend API

**Session Management:**
- connect-pg-simple