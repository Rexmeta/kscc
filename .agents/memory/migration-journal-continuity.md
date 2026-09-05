---
name: Migration journal continuity
description: Drizzle migration files are applied only when their tags are registered in the migration journal.
---

When adding a hand-reviewed SQL migration, keep `migrations/meta/_journal.json` in sync with the new file tag; a successful migrate command can otherwise apply nothing.

**Why:** This project has a manually maintained migration history, so an unjournaled SQL file is invisible to `drizzle-kit migrate` even when the file exists and schema checks pass.

**How to apply:** Add the next journal entry with a unique index and tag, run the migration in development, then verify the affected tables exist through the same database connection used by the application.