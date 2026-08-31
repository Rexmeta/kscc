---
name: Redacted operational telemetry
description: Durable rules for investigating requests without making logs a sensitive-data store.
---

Operational logs should be structured JSON events with validated correlation IDs,
allow-listed primitive fields, bounded route cardinality, and outcome/severity
values. Request bodies, authorization material, contact details, message content,
and third-party responses must remain outside the telemetry boundary.

**Why:** Incident investigation needs consistent request correlation and timing,
but unrestricted error or request serialization can turn routine logs into a
credential and personal-data exposure.

**How to apply:** Add new event types through the shared redaction boundary,
preserve the originating correlation ID for provider/storage work, and keep
health responses limited to readiness state rather than dependency diagnostics.