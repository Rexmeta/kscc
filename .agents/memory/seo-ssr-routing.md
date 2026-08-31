---
name: Server-rendered SEO routing
description: Express wildcard shell routes need the original request pathname for route-specific metadata
---

When injecting route-specific metadata into the SPA shell from an Express wildcard fallback, derive the pathname from `req.originalUrl`, not `req.path`.

**Why:** Express mounts wildcard middleware with a relative `req.path` of `/`, which can incorrectly classify every detail request as the home page.

**How to apply:** Parse `req.originalUrl` with a base URL, preserve the query only for language selection, and use the parsed pathname for detail matching and noindex decisions.