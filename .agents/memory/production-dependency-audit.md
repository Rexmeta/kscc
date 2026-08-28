---
name: Production dependency audit
description: Decision rule for release dependency audits and temporary compatibility exceptions.
---

Production dependency audits should fail on new findings; any unavoidable exception must identify an owner, advisory, affected path, and the compatibility constraint that prevents an upgrade.

**Why:** A clean high-severity result is useful only when future dependency changes cannot silently reintroduce known exposure, while runtime constraints can make a safe upstream major temporarily unavailable.

**How to apply:** Prefer the minimum compatible direct upgrades, regenerate and clean-install the lockfile, and keep any exception narrowly matched to the known advisory until its documented removal condition is met.