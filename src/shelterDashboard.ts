import { ShelterDashboard } from "./api/types";

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
