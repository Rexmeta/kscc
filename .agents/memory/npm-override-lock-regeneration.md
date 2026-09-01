---
name: npm override lock regeneration
description: How to ensure a newly added npm transitive override actually replaces a vulnerable locked subtree.
---

When adding an npm override for a transitive dependency, verify both `package-lock.json` and the installed tree resolve the overridden version. If the old nested package remains locked, regenerate the lockfile rather than trusting a clean `node_modules` reinstall.

**Why:** npm can preserve the old nested resolution in an existing lockfile even after the override is added, leaving the installed package marked invalid and the advisory active.

**How to apply:** Inspect the affected paths with `npm ls` and run the audit after installation. Rebuild the lockfile only when the override is not reflected, then re-run build and compatibility checks because other allowed ranges may resolve newer versions.