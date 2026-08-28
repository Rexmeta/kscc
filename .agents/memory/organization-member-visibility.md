---
name: Organization member visibility
description: Public and administrative read rules for organization-member records.
---

Public organization-member reads are active-only. Inactive records may be reviewed through the existing authenticated admin management path, while public detail lookups treat inactive records as not found and never reveal their existence.

**Why:** Organization members may be retired or unpublished without being deleted, so collection and detail endpoints must not expose inconsistent lifecycle states.

**How to apply:** Keep the active-only condition server-side on both list and detail reads. Any opt-in inactive visibility must require current admin authorization and strict query and identifier validation.