/**
 * Consent-evidence access history is retained for three calendar years.
 *
 * The period is intentionally expressed in calendar years rather than a
 * fixed number of days so leap years do not change the policy boundary.
 */
export const CONSENT_EVIDENCE_ACCESS_LOG_RETENTION_YEARS = 3;
export const CONSENT_EVIDENCE_ACCESS_LOG_CLEANUP_BATCH_SIZE = 100;

export function getConsentEvidenceAccessLogRetentionCutoff(now: Date): Date {
  const cutoff = new Date(now.getTime());
  cutoff.setUTCFullYear(
    cutoff.getUTCFullYear() - CONSENT_EVIDENCE_ACCESS_LOG_RETENTION_YEARS,
  );
  return cutoff;
}