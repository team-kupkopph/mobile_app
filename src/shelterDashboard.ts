import { ShelterDashboard } from "./api/types";

// US-B5: two derived dashboard states, never one screen. A shelter_org
// verification_request existing (`submitted`) means "Under review"; no row means the
// documents were never sent. Derivation only — the server stores no gate flag (§3.5).
export type ShelterBannerState = "pending" | "incomplete";

export function shelterBannerState(d: ShelterDashboard): ShelterBannerState {
  return d.verification.submitted ? "pending" : "incomplete";
}
