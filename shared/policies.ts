import { z } from "zod";

/**
 * These identifiers are part of the consent contract.  Change them only
 * when the corresponding published document has been reviewed and replaced.
 */
export const CURRENT_PRIVACY_POLICY_VERSION = "2026-09-04";
export const CURRENT_TERMS_VERSION = "2026-09-04";
export const POLICY_EFFECTIVE_DATE = "2026-09-04";

export const consentPurposeSchema = z.enum([
  "account_terms",
  "account_privacy",
  "inquiry_privacy",
]);

export type ConsentPurpose = z.infer<typeof consentPurposeSchema>;

export const registrationConsentSchema = z.object({
  terms: z.object({
    agreed: z.literal(true),
    policyVersion: z.literal(CURRENT_TERMS_VERSION),
    purpose: z.literal("account_terms"),
  }).strict(),
  privacy: z.object({
    agreed: z.literal(true),
    policyVersion: z.literal(CURRENT_PRIVACY_POLICY_VERSION),
    purpose: z.literal("account_privacy"),
  }).strict(),
}).strict();

export const inquiryConsentSchema = z.object({
  agreed: z.literal(true),
  policyVersion: z.literal(CURRENT_PRIVACY_POLICY_VERSION),
  purpose: z.literal("inquiry_privacy"),
}).strict();

export type RegistrationConsentInput = z.infer<typeof registrationConsentSchema>;
export type InquiryConsentInput = z.infer<typeof inquiryConsentSchema>;