---
name: Frontend query state
description: Public and management views must preserve the distinction between loading, empty, and failed HTTP requests.
---

Use one shared response helper that rejects non-2xx responses, and render failed queries with a visible localized retry action rather than treating missing data as an empty collection.

**Why:** Empty-success rendering hides outages and permission failures from both visitors and operators.

**How to apply:** When adding a client data view, model loading, error, empty, and retry states explicitly before rendering the normal content.