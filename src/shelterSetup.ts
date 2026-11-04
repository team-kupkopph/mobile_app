import { Me } from "./api/types";

// NT-14 (shelter home test plan; owner decision 2026-11-04) · a signed-in shelter that quit onboarding after the email
// code has an account but no organization profile, and nothing led it back into setup.

/** "Setup not finished" is the server's 404 `no_profile` on GET /shelter/profile, and nothing else: a network failure
 *  or another error must never send a set-up shelter back through onboarding. */
export function setupNeeded(res: { ok: boolean; status: number; data?: any } | null): boolean {
  return !!res && !res.ok && res.status === 404 && res.data?.error?.code === "no_profile";
}

/** Contact skips the phone code when the number entered is the account's own, already verified (a shelter resuming
 *  setup usually verified it before it quit). A different or unverified number still gets a code. */
export function phoneAlreadyVerified(me: Me | null, e164: string): boolean {
  return !!me && me.phone === e164 && !!me.phone_verified_at;
}

/** Home's banner and You's card while setup is not finished (owner-approved copy). */
export const RESUME_SETUP = {
  title: "Finish setting up your organization",
  body: "Add your organization's name and type, then upload your documents.",
  cta: "Continue ›"
} as const;
