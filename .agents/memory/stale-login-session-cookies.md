---
name: Stale login session cookies
description: Authentication boundary rule for re-login after expired or invalid browser sessions.
---

Session-establishing requests such as password login, registration, and the final WeChat login exchange must remain usable when the browser still sends an expired or invalid account-session cookie. Keep same-origin validation, but do not require the authenticated-session CSRF token for those endpoints.

**Why:** An expired HttpOnly session cookie is not cleared by client-side storage cleanup. Treating its mere presence as an authenticated session can reject a correct re-login with a misleading CSRF 403 before password verification.

**How to apply:** Separate origin protection from authenticated state-changing protection. Require the CSRF token for mutations made with an existing session, while explicitly allowing same-origin session-establishing endpoints to recover from stale cookies.