---
name: Database ACL seed readiness
description: Development database prerequisites for operator permission regression tests
---

Operator-facing route tests assume that the database contains the permissions used by the corresponding ACL checks. A successful code build does not guarantee those seed rows exist in a reused development database.

**Why:** A missing permission seed can make an otherwise unrelated ACL regression fail before the route is exercised.

**How to apply:** When ACL route tests fail while the implementation and schema are unchanged, verify the project’s narrowly scoped ACL seed/repair script before diagnosing the route code.