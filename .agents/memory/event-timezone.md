---
name: Event timezone handling
description: Business rules for storing and displaying event wall-clock times consistently.
---

Event schedules are Korean wall-clock times and must be converted with an explicit Asia/Seoul offset before storage. Values without an offset must be interpreted as Asia/Seoul, while API timestamps with an offset remain absolute instants.

**Why:** `datetime-local` has no timezone, and relying on browser, Node, or PostgreSQL defaults can shift a newly created event by several hours and make it appear already past.

**How to apply:** Use the shared event date parser for create, update, legacy metadata, comparisons, and form values; format stored instants back into Asia/Seoul before placing them in `datetime-local` inputs or displaying event times.