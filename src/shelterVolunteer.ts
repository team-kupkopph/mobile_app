// US-V9 shelter-side display logic + types. Pure, unit-tested (like volunteer.ts).
import { type ChipTone } from "./components/ui";
import { BrowseShift, Reliability } from "./volunteer";

export type ShelterShift = BrowseShift;
// Task 10 (K8) · GET /shelter/shifts?when=... rows carry one extra field the plain
// GET /shelter/shifts/{id} detail does not (backend `ShelterShiftsView.get` only): how many
// approved signups on this shift are past `ends_at` with attendance still unmarked.
export type ShelterShiftRow = ShelterShift & { attendance_due: number };
export type PendingRequest = {
  signup_id: string; volunteer: { display_name: string }; reliability: Reliability;
  requested_at: string; previously_declined: boolean; is_verified_member: boolean;
};
export type ListingCard = { listing_id: string; pet: { name: string; species: string }; photo_url: string | null };
export type VolunteerDetail = {
  display_name: string; reliability: Reliability;
  // K9/G14 (backend) · an approved `rescuer` capability, independent of this shift's own
  // reliability numbers — a brand-new volunteer can already be a Verified Member.
  is_verified_member: boolean;
  // D2 · phone and email only; the backend never sends an address.
  contact?: { phone: string | null; email: string };
};

export type RosterRow = {
  signup_id: string; volunteer: { display_name: string };
  status: "approved" | "completed" | "no_show";
  check_in_at: string | null; check_out_at: string | null;
  assigned_animal: { listing_id: string; name: string; photo_url: string | null } | null;
  contact_shared: boolean; attendance_marked_at: string | null; can_undo: boolean;
};

// null = flagged — the amber "Needs re-approval" strip already says it, so the caller strips
// the chip entirely rather than showing a redundant/contradictory tone.
export function reliabilityChip(rel: Reliability): { label: string; tone: ChipTone } | null {
  if (rel.needs_reapproval) return null;
  if (rel.is_reliable) return { label: "Reliable", tone: "success" };
  if (rel.no_shows > 0) return { label: `${rel.no_shows} no-show${rel.no_shows === 1 ? "" : "s"}`, tone: "neutral" };
  if (rel.shifts_completed === 0) return { label: "New volunteer", tone: "info" };
  return { label: `${rel.shifts_completed} shift${rel.shifts_completed === 1 ? "" : "s"}`, tone: "neutral" };
}

export const attendanceSuggestion = (row: RosterRow): "completed" | null =>
  row.status === "approved" && row.check_in_at && row.check_out_at ? "completed" : null;

export type ActivitySection = "pending" | "confirmed" | "attendance";
export function activitySection(shift: ShelterShift, pendingCount: number, nowMs: number = Date.now()): ActivitySection {
  if (nowMs >= new Date(shift.ends_at).getTime()) return "attendance";
  return pendingCount > 0 ? "pending" : "confirmed";
}

// F-R3-9 · a manage-list / calendar card's chip. `status` is the booking state (open, full,
// closed = cancelled) and says nothing about time, so a Past-tab activity still read "Open".
// Ended wins over open/full; a cancelled one stays "Closed" — it never ran, so it didn't end.
export function shiftStatusChip(
  shift: Pick<ShelterShift, "status" | "ends_at">, nowMs: number = Date.now()
): { label: string; tone: ChipTone } {
  if (shift.status === "closed") return { label: "Closed", tone: "neutral" };
  if (nowMs >= new Date(shift.ends_at).getTime()) return { label: "Ended", tone: "neutral" };
  return shift.status === "full" ? { label: "Full", tone: "neutral" } : { label: "Open", tone: "success" };
}

// F-R2-7 · the activity header's capacity line, lost in the Task-9 rewrite.
export const spotsFilledLabel = (shift: Pick<ShelterShift, "capacity" | "slots_left">): string =>
  `${shift.capacity - shift.slots_left} of ${shift.capacity} spots filled`;

export function blastRadiusCopy(n: number): string {
  if (n <= 0) return "No volunteers will be notified.";
  return `${n} volunteer${n === 1 ? "" : "s"} will be notified.`;
}

// K11 · the re-approval confirm's copy, pulled out of the screen so it's independently
// testable. Names the consequence rather than reciting the reliability block's three numbers
// (that was the OLD copy, on ShelterVolunteerRequestsScreen's ConfirmModal — Task 9 replaces
// it with this, per spec). `n` is `consecutive_no_shows`, the count the 409's own
// `reapproval_required` error detail carries.
export function reapprovalCopy(name: string, rel: Pick<Reliability, "consecutive_no_shows">): { title: string; body: string } {
  const first = name.trim().split(/\s+/)[0] || name;
  return {
    title: `Approve ${first} anyway?`,
    body: `${first} has missed their last ${rel.consecutive_no_shows} shifts. If they don't show, this slot goes unfilled.`
  };
}
