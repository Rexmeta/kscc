# Production dependency audit

Run the release-facing dependency check with:

```sh
npm run audit:production
```

The check audits only dependencies installed for production (`npm audit
--omit=dev --json`). It fails on any high or critical finding and on any
finding that is not resolved by the installed dependency tree.