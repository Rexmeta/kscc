---
name: Account role and ACL sync
description: Why role edits in user management must synchronize the effective ACL membership.
---

Changing an account's displayed role in user management must also align its single effective ACL membership with the corresponding ACL role.

**Why:** Navigation and protected board actions are driven by permissions from active memberships, not only by the account role field. Updating only the account role can display “operator” while granting no operator permissions.

**How to apply:** Perform account-role and ACL-membership changes atomically. Elevated roles without an existing membership should receive the configured operations tier; demotions must remove stale elevated memberships immediately.