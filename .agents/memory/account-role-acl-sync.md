---
name: Account role and ACL sync
description: Why role edits in user management must synchronize the effective ACL membership.
---

Changing an account's displayed role in user management must also align its single effective ACL membership with the corresponding ACL role.

**Why:** Navigation and protected board actions are driven by permissions from active memberships, not only by the account role field. Updating only the account role can display “operator” while granting no operator permissions.

**How to apply:** Perform account-role and ACL-membership changes atomically. Elevated roles without an existing membership should receive the configured operations tier; demotions must remove stale elevated memberships immediately.

Adding permissions to a seeded ACL role also requires an idempotent data backfill; schema pushes do not update existing role-permission rows.

**Why:** A newly added operator menu permission existed in source definitions but was absent from the live role mappings, hiding the menu until the database was repaired.

**How to apply:** Ship a narrowly scoped ensure/backfill step with the permission definition and run it after schema setup or role-definition changes.

Operator staff screens must be gated by the current granular permission as well as the account role; member-company management uses member.read, member.update, and member.delete.

**Why:** Showing a staff tab without matching API authorization creates a broken UI, while authorizing an entire role without checking the assigned permission defeats ACL changes.

**How to apply:** Use the same permission checks for tab visibility, data-fetch enablement, mutation controls, and server middleware.