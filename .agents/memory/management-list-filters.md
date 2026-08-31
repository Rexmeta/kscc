---
name: Management list filters
description: How management screens should combine permission-scoped datasets with category display filters.
---

When a management screen requests all categories allowed by the current role, its grouping step must ignore any default single-category selection used by a different screen mode.

**Why:** A default category can be useful for a normal filtered organization view, but reusing it in an all-permitted-categories mode silently hides valid records while the API response remains correct.

**How to apply:** Keep permission scoping on the server, then apply category filters only in modes that explicitly expose a category selector; management-only modes should render every category returned within the allowed scope.