---
name: Event registration invariants
description: Rules for keeping event registration availability and capacity decisions race-safe.
---

Event registration availability must be evaluated from current event status, publication timing, event timing, deadline, closure, and capacity inside the same transaction as the insert or reactivation. Capacity counts every non-cancelled registration; cancellation uses the same event lock.

**Why:** Client checks and separate availability reads can be bypassed or raced, allowing registrations after closure or beyond the configured capacity.

**How to apply:** Keep staff-controlled registration status and payment state server-assigned, preserve the event/user uniqueness constraint, and treat cancelled registrations as reactivations that must pass current availability checks again.