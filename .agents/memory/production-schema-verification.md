---
name: Production schema verification
description: Environment-specific guidance for verifying publish-time schema changes before trusting a production endpoint.
---

After a publish that includes database changes, verify the production schema and the affected endpoint separately; a successful build or live deployment does not prove that every pending development-to-production schema statement was applied.

**Why:** A deployed application can continue serving while a missing production column causes only the related endpoint to return 500, making the issue look like missing content rather than schema drift.

**How to apply:** When a production feature fails after publishing, compare the production information schema with the current development schema and inspect the pending publish diff. Prefer re-publishing through the managed database flow for additive schema changes; do not add production DDL to application startup or deployment scripts.