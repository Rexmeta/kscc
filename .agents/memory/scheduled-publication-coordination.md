---
name: Scheduled publication coordination
description: Durable coordination and reconciliation rules for scheduled post publication and resource ACLs.
---

Scheduled publication claims must be database-transactional and resource ACL
reconciliation must persist its completed state in existing post metadata when
schema migration is not part of the change.

**Why:** Application instances can overlap and processes can restart between
the post transition and object-storage update; process-local flags lose work
and repeated object writes obscure failures.

**How to apply:** Claim due draft rows with row locks and an eligibility
predicate. Write an ACL marker only after the object update succeeds, and make
the marker encode the post version plus the current publish/expiry visibility
so clock-boundary changes become retryable work.