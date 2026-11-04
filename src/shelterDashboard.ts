import { Me, ShelterDashboard, ShelterDashboardRescue, ShelterDashboardVolunteer, ShelterDashboardWishlist } from "./api/types";
import { pledgeCountLabel } from "./community";

// SH1 / SH2 / SH10 (shelter home review) · ONE verified state for the whole shell — Home, You and
// the Rescue card all read this, so they cannot drift again. It replaces `shelterBannerState`
// (Home: the LATEST request's status) and `shelterVerificationCard` (You). Reading the latest
// status told an approved tier-1 rescue applying for tier 2 (a newer pending request, US-X4) that
// its listings were hidden and donations off, while You said "Verified Rescue".
//
// - `verified` is the server's "any approved": `gates.can_publish`, falling back to /me's
//   `is_verified_rescuer` while the dashboard has not answered (or an older server sent no gates).
// - `banner` comes from the latest request only when NOT verified. A verified shelter whose latest
//   request is still with the reviewer has an upgrade in flight: `upgrade_in_review`, a quiet
//   accent. An unknown status from a newer server reads as `pending`. Nothing known yet: `none`,
//   never a false "Documents not sent".
// - `donationsOn` is the two-key gate (US-X3: approved AND a live QR), `gates.donations_enabled`.
export type ShelterShellBanner = "none" | "incomplete" | "pending" | "rejected" | "upgrade_in_review";
export type ShelterShellState = { verified: boolean; banner: ShelterShellBanner; donationsOn: boolean };

export function shelterShellState(dash: ShelterDashboard | null, me: Me | null): ShelterShellState {
  const gates = dash?.gates;
  const verified = gates ? gates.can_publish : me?.is_verified_rescuer ?? false;
  const donationsOn = gates?.donations_enabled ?? false;
  if (!dash && !me) return { verified, banner: "none", donationsOn };
  const status: string | null = dash ? dash.verification.status : me?.shelter?.verification_status ?? null;
  if (verified) {
    const inReview = status === "pending" || status === "needs_info";
    return { verified, banner: inReview ? "upgrade_in_review" : "none", donationsOn };
  }
  const submitted = dash ? dash.verification.submitted : status !== null;
  if (!submitted) return { verified, banner: "incomplete", donationsOn };
  // A reviewed-and-refused request is not "under review".
  return { verified, banner: status === "rejected" ? "rejected" : "pending", donationsOn };
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

// S16 · the dashboard's "Rescue" card copy. A verified shelter may claim strays and is paged about
// them, but its shell had no rescue surface. Every number here is one the server counted: a city
// the map can't search (or none on file) says so, and offers no map, rather than "0 near you".
export function rescueSummary(r: ShelterDashboardRescue, canClaim: boolean): {
  line1: string; line2: string; mapCity: string | null; note: string | null;
} {
  const n = r.needs_help;
  const line1 = !r.city ? "Add your shelter's address to see strays near you"
    : !r.city_supported || n === null ? `The rescue map doesn't cover ${r.city} yet`
    : n === 0 ? `No strays need help near ${r.city} right now`
    : `${n} ${n === 1 ? "stray needs" : "strays need"} help near ${r.city}`;
  const line2 = r.open_cases === 0 ? "No open cases"
    : `${r.open_cases} open case${r.open_cases === 1 ? "" : "s"}`;
  return {
    line1, line2,
    mapCity: r.city && r.city_supported ? r.city : null,
    note: canClaim ? null : "Get verified to claim a rescue."
  };
}

// US-W3 · the dashboard's "Wishlist" line: the one thing there is to DO on it (pledges a donor says
// they delivered, waiting on the shelter's confirm). null when there is none — or when an older
// server sent no wishlist block — so the screen shows a quiet line instead of a "0".
export function wishlistSummary(w: ShelterDashboardWishlist | undefined | null): string | null {
  const n = w?.pledges_awaiting_confirm ?? 0;
  return n > 0 ? `${pledgeCountLabel(n)} to confirm` : null;
}
