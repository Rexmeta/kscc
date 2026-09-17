---
name: Member-service seed imports
description: Durable rules for importing the initial organization workbook into the member-service staging boundary.
---

Treat the uploaded workbook as the source of truth for row count and field shape instead of relying on planning-document counts. Stage every parsed source row, preserve the raw record, and keep public approval separate from source verification status.

**Why:** The planning material described 22 organizations, while the actual workbook contained 24 rows. Publishing based on the document count or treating a verified-looking source value as approval could silently omit data or expose unreviewed records.

**How to apply:** On every seed-file revision, validate the actual header and row count, make reruns idempotent by file hash, keep staged rows hidden, and require an operator decision with evidence before public projection.