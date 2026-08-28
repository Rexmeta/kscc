---
name: Rate-limit IP keys
description: Compatibility rule for custom express-rate-limit key generators.
---

When a rate limiter uses a custom key generator, any IP fallback must pass through express-rate-limit's IPv6 normalization helper; prefer an authenticated stable identity first.

**Why:** Recent express-rate-limit versions validate custom key generators and unnormalized IPv6 addresses can let clients bypass limits.

**How to apply:** Use the helper for anonymous/IP fallbacks and keep user or account identifiers as the primary key only after authentication has run.