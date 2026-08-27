---
name: Create-only post permissions
description: Why initial post content must be saved under create permission without requiring update permission
---

Initial post creation, its primary translation, and initial metadata must be accepted through one create-authorized operation. Do not make create-only operators call update-protected endpoints to finish a new post.

**Why:** A multi-request creation flow can save the base row, then fail when the translation or metadata endpoint requires update permission. This leaves a partial untitled record and prevents valid create-only roles from completing their work.

**How to apply:** Validate the complete payload before saving, including coercing HTTP ISO timestamp strings to dates. Authorize with the scoped create permission and clean up the base post if child persistence fails.