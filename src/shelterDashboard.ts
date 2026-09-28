import { Me, ShelterDashboard, ShelterDashboardVolunteer } from "./api/types";

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

// Task 10 (G12) · "Sat 9:00 AM" — short enough to sit inline in the Volunteers card's copy.
// Not shared with the longer `weekday: "long"` labels the shift screens use elsewhere; this
// one is deliberately terse because it is one clause inside a sentence, not a heading.
function shortWhen(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString(undefined, { weekday: "short" });
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${day} ${time}`;
}

// Task 10 (K8/G12) · the dashboard's "Volunteers" card copy, pulled out of the screen so the
// 0/1/n and next_shift-null branches are testable without rendering anything. `line2` is
// null (not an empty string) when nothing needs marking, so the screen can skip the warning
// row entirely rather than render a blank one.
export function volunteerSummary(d: ShelterDashboardVolunteer): { line1: string; line2: string | null } {
  const waiting = `${d.pending_requests} waiting`;
  const next = d.next_shift ? ` · next: ${d.next_shift.title} ${shortWhen(d.next_shift.starts_at)}` : "";
  const line1 = `${waiting}${next}`;
  const line2 = d.attendance_due > 0
    ? `Mark attendance for ${d.attendance_due} volunteer${d.attendance_due === 1 ? "" : "s"}`
    : null;
  return { line1, line2 };
}
