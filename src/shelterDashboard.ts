import { Me, ShelterDashboard } from "./api/types";

// US-B5: two derived dashboard states, never one screen. A shelter_org
// verification_request existing (`submitted`) means "Under review"; no row means the
// documents were never sent. Derivation only — the server stores no gate flag (§3.5).
// US-V5 adds the third state: once the request is approved the dashboard flips to
// "verified" — the amber banner clears, the badge appears, listings stop being drafts.
export type ShelterBannerState = "verified" | "pending" | "incomplete";

export function shelterBannerState(d: ShelterDashboard): ShelterBannerState {
  if (d.verification.status === "approved") return "verified";
  return d.verification.submitted ? "pending" : "incomplete";
}

// F13 · the profile tab's verification card, for a GATED shelter. The gate
// (`me.is_verified_rescuer`) says only "not approved" — it is false for never-submitted,
// pending, needs_info and rejected alike, so the card can't be read off it. Derive
// from the dashboard's `verification` (the record); when that SECONDARY request has not
// answered yet (US-R2), fall back to /me's latest request rather than guess.
// `rejected` is its own state: a reviewed-and-refused request is not "under review".
export type ShelterVerificationCard = "incomplete" | "pending" | "rejected";

export function shelterVerificationCard(dash: ShelterDashboard | null, me: Me | null): ShelterVerificationCard {
  const status = dash ? dash.verification.status : me?.shelter?.verification_status ?? null;
  const submitted = dash ? dash.verification.submitted : status !== null;
  if (!submitted) return "incomplete";
  return status === "rejected" ? "rejected" : "pending";
}
