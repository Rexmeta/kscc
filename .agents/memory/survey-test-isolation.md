---
name: Survey test isolation
description: Prevent survey settings and history regression tests from erasing shared development data.
---

Survey regression fixtures must use isolated data or a guaranteed restoration strategy, and must provision the required `survey.manage` ACL before making admin-route assertions.

**Why:** The fixture deletes the singleton survey settings and history before testing. If ACL setup is stale and the test fails before creating replacement data, cleanup can leave both tables empty.

**How to apply:** Never run destructive singleton-table tests against shared development content without isolation. When a baseline is absent, cleanup must restore a known safe fixture or leave the database unchanged; seed/backfill the operator permission as part of test setup.