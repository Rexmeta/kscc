---
name: Migration journal continuity
description: Drizzle migration files are applied only when their tags are registered in the migration journal in strict chronological order.
---

When adding a hand-reviewed SQL migration, keep `migrations/meta/_journal.json` in sync with the new file tag and use a `when` value greater than every existing entry; a successful migrate command can otherwise apply nothing. If Drizzle has no snapshots for the manually maintained history, inspect generated SQL before applying it because generation may emit a full-schema recreate instead of an additive migration.

**Why:** This project has a manually maintained migration history, and Drizzle treats journal timestamps as ordering data. An unjournaled or out-of-order migration is invisible to `drizzle-kit migrate` even when the file exists and schema checks pass.

**How to apply:** Add the next journal entry with a unique index, tag, and strictly greatest timestamp; review that SQL is additive, run the migration in development, then verify the affected data through the same database connection used by the application.