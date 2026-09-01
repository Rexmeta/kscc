---
name: Shared database test fixtures
description: Isolation rules for integration tests that mutate a shared development database
---

Integration tests that mutate shared database rows should create uniquely identifiable fixtures and remove both the fixture and its dependent history in a `finally` block.

**Why:** A failed test can leave persistent rows behind, causing later runs to assert against stale data and making failures appear unrelated to the code under test.

**How to apply:** Prefer fixture IDs captured from the create response over broad cleanup queries; restore pre-existing shared rows only after the test-owned data has been removed.