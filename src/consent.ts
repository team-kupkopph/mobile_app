// RA 10173 consent versions.
//
// TWO DIFFERENT CONSENTS — do not merge them:
//
//  • TERMS_VERSION      — consent to the Terms/Privacy text at ACCOUNT CREATION.
//                         Sent on POST /auth/signup; recorded on account.terms_consent_*.
//  • DOC_CONSENT_VERSION — the separate, purpose-specific consent to collect IDENTITY
//                         DOCUMENTS (§12.6). Sent on POST /verifications; recorded on
//                         verification_request.consent_*. Signing up does NOT imply it.
//
// Bump a version when its user-facing text changes, so an older consent stays
// distinguishable from consent to the current wording.
export const TERMS_VERSION = "2026-08-01";
export const DOC_CONSENT_VERSION = "2026-08-01";
