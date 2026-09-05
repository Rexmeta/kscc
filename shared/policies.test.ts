import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CURRENT_PRIVACY_POLICY_VERSION,
  CURRENT_TERMS_VERSION,
  inquiryConsentSchema,
  registrationConsentSchema,
} from "./policies";

const validRegistration = {
  terms: {
    agreed: true,
    policyVersion: CURRENT_TERMS_VERSION,
    purpose: "account_terms",
  },
  privacy: {
    agreed: true,
    policyVersion: CURRENT_PRIVACY_POLICY_VERSION,
    purpose: "account_privacy",
  },
} as const;

test("registration consent requires both current policy records", () => {
  assert.deepEqual(registrationConsentSchema.parse(validRegistration), validRegistration);
  assert.throws(() => registrationConsentSchema.parse({
    ...validRegistration,
    privacy: { ...validRegistration.privacy, agreed: false },
  }));
  assert.throws(() => registrationConsentSchema.parse({
    ...validRegistration,
    terms: { ...validRegistration.terms, policyVersion: "2024-01-01" },
  }));
  assert.throws(() => registrationConsentSchema.parse({
    terms: validRegistration.terms,
  }));
});

test("inquiry consent requires the current purpose and policy version", () => {
  assert.deepEqual(inquiryConsentSchema.parse({
    agreed: true,
    policyVersion: CURRENT_PRIVACY_POLICY_VERSION,
    purpose: "inquiry_privacy",
  }), {
    agreed: true,
    policyVersion: CURRENT_PRIVACY_POLICY_VERSION,
    purpose: "inquiry_privacy",
  });
  assert.throws(() => inquiryConsentSchema.parse({
    agreed: true,
    policyVersion: "2024-01-01",
    purpose: "inquiry_privacy",
  }));
  assert.throws(() => inquiryConsentSchema.parse({
    agreed: true,
    policyVersion: CURRENT_PRIVACY_POLICY_VERSION,
    purpose: "account_privacy",
  }));
});