# Scheduled publications

## State transitions

Scheduled content is stored as `status=draft` with a non-null `scheduledAt`.
The timestamp is an absolute instant: ISO timestamps with an offset are
normalized by the server to UTC. A schedule may be in the past so a restart
can recover missed work. `expiresAt`, when present, must be later than
`scheduledAt`; an expired schedule is not published.

At or after `scheduledAt`, the application worker changes the row to
`status=published` and sets `publishedAt` to the scheduled instant. A scheduled
row cannot also have `publishedAt`. Explicit manual publishing, unpublishing,
or archiving clears an existing schedule unless the same update explicitly
replaces it with a draft schedule. Published posts still become unreadable
after `expiresAt` using the existing expiration rule.

## Worker and recovery

Every application instance runs a bounded pass at a short interval. Due rows
are selected with PostgreSQL `FOR UPDATE SKIP LOCKED` and transitioned in the
same transaction, so multiple instances and restarts do not double-publish.
The pass also reconciles resource object ACLs. A successful ACL update writes a
durable metadata marker; a database or object-storage failure leaves the marker
stale and the next pass retries it. Logs contain only event names, counts,
visibility, and error classes.

If a deployment was stopped across a scheduled time, starting the application
is sufficient: past schedules are recovered on the first pass. Operators can
also run one bounded maintenance pass with:

```text
npm run scheduled-publications:run
```

The command is safe to repeat. It does not grant publication permissions or
publish invalid schedules.