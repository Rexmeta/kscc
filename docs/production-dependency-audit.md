# Production release gates

Run the production dependency check with:

```sh
npm run audit:production
```

The check audits only dependencies installed for production
(`npm audit --omit=dev --json`). It fails when the installed tree contains an
advisory entry, so a release must not silently ship a known production
dependency finding. The command does not upgrade packages or change the
lockfile; resolve findings in a separate reviewed dependency change.

The complete reproducible release gate is:

```sh
set -euo pipefail
npm ci
npm run audit:production
npm run check
npm test
npm run build
```

After the built application is running, verify the application contract
separately:

```sh
curl --fail --silent --show-error https://<deployed-host>/healthz
curl --fail --silent --show-error https://<deployed-host>/readyz
```

`/healthz` returns HTTP 200 with `{"status":"ok"}` when the process can
respond. `/readyz` returns HTTP 200 with `{"status":"ready"}` only after the
database connectivity check succeeds, and HTTP 503 with
`{"status":"not_ready"}` otherwise. Neither response contains environment
variables, connection strings, or internal error details.