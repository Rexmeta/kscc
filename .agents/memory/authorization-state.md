---
name: Live authorization state
description: Security decision for account and membership authorization checks.
---

Authorization decisions must be derived from current account and ACL state rather than a long-lived token claim or time-based permission cache.

**Why:** Role, account, membership, role, and tier changes need to take effect immediately across requests and across application processes.

**How to apply:** Treat tokens as identity proofs, reload mutable account status and role before protected work, and evaluate membership activity, expiry, and related role/tier enablement at authorization time.