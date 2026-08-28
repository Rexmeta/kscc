# Production dependency audit

Run the release-facing dependency check with:

```sh
npm run audit:production
```

The check audits only dependencies installed for production (`npm audit
--omit=dev --json`). It fails on any high or critical finding and on any
finding that is not explicitly covered by an accepted advisory exception
inside `scripts/check-production-audit.mjs`.

## Accepted exception

- **Advisory:** `GHSA-w5hq-g745-h8pq` / npm advisory `1119441` (`uuid` missing
  buffer bounds checks)
- **Severity:** Moderate
- **Owner:** Backend/platform maintainers
- **Rationale:** The remaining path is transitive through
  `@google-cloud/storage` 7.x, `gaxios` 6.x, and `teeny-request` 9.x.
  `@google-cloud/storage` 8.0.1 is the first compatible upstream release that
  removes this path, but it requires Node.js 22; this application currently
  runs on Node.js 20 and changing runtime infrastructure is outside this
  remediation. Npm's automatic alternative is a breaking downgrade to storage
  5.x. The compatible storage 7.x upgrade removes all high-severity findings.

This exception must be revisited when the runtime can move to Node.js 22 or
the storage dependency publishes a Node.js 20-compatible fix.