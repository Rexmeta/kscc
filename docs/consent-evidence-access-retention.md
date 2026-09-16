# Consent-evidence access history retention

The owner-approved retention period for consent-evidence access records is
**three calendar years after `accessed_at`**. The period applies equally to
`view` and `export` records and is measured in UTC calendar years.

## Cleanup behavior

Each scheduled-publication maintenance pass performs at most one cleanup batch
of 100 records. It deletes only records older than the three-year cutoff,
orders candidates oldest-first, and uses PostgreSQL row locking with
`SKIP LOCKED` so concurrent application instances do not wait on or delete the
same candidate. Cleanup failures are logged as a bounded operational event and
do not prevent scheduled publication or resource ACL reconciliation.

The cleanup event records only the number deleted, the number currently held,
and the configured batch size. It does not log subject IDs, administrator IDs,
or evidence contents. A backlog is drained over multiple passes rather than
using an unbounded delete.

## Audit holds and deleted administrators

An access record can be protected with `retention_hold_until`. Records older
than the normal cutoff remain untouched while that timestamp is in the future.
The hold can be cleared or extended through the storage retention-hold
operation when an audit owner determines that the record is still needed.

Deleting an administrator account sets `admin_user_id` to `NULL` instead of
deleting the access record. The same three-year policy and audit-hold rules
continue to apply, so historical access remains attributable as an access
event even after the administrator identity is removed. Account deletion
does not bypass or extend the access-log retention period.