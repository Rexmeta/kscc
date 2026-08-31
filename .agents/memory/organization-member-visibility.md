---
name: Organization member visibility
description: Public and administrative read rules for organization-member records.
---

Public organization-member reads are active-only. Inactive records may be reviewed through the existing authenticated admin management path, while public detail lookups treat inactive records as not found and never reveal their existence.

**Why:** Organization members may be retired or unpublished without being deleted, so collection and detail endpoints must not expose inconsistent lifecycle states.

**How to apply:** Keep the active-only condition server-side on both list and detail reads. Any opt-in inactive visibility must require current admin authorization and strict query and identifier validation.

Operator executive management covers leadership categories (executives, honorary, vice presidents, directors, and advisors), while secretariat, committees, and organization-member categories remain outside that scope.

**Why:** The data model stores leadership roles in separate categories, so filtering only the `executives` category made the operator screen show the president while hiding the rest of the registered leadership.

**How to apply:** An operator request without a category filter should return all active and inactive records in the leadership set; category-specific requests must still reject categories outside that set.