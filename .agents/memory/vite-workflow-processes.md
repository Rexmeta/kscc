---
name: Vite workflow process isolation
description: Preview failures caused by orphaned development servers sharing the app port.
---

If a preview reports React invalid-hook errors together with missing or outdated Vite optimized dependencies after a restart, verify that only one development server owns the app port before changing application code.

**Why:** A stale workflow process can share the port with the replacement process, causing requests to alternate between different Vite module graphs and React copies.

**How to apply:** Check the process list and the port owner, stop only the orphaned server, then refresh the preview and inspect fresh logs.