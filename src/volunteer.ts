// US-V8 volunteer display logic + types. Pure and unit-tested (like adoption.ts / sagip.ts).
// Types mirror backend GET /me/signups and GET /shifts by hand (no shared package).

export type ShiftType = "walking" | "feeding" | "visitor" | "event" | "facility" | "transport";
export type SignupStatus = "requested" | "approved" | "declined" | "cancelled" | "completed" | "no_show";

// The /me/signups embedded-shift shape (backend `_my_shift_repr`): carries `org_name` but no
// `slots_left`. Distinct from `BrowseShift` below (the GET /shifts and GET /shifts/{id} shape,
// `_shift_repr`), which has both `org_name` and `slots_left`. Keep this name — `MySignupItem.shift`
// references it.
export type ShiftSummary = {
  shift_id: string; type: ShiftType; org_name: string;
  starts_at: string; ends_at: string; status: "open" | "full" | "closed"; capacity: number;
};
// The GET /shifts (browse) and GET /shifts/{id} (detail) shape (backend `_shift_repr`).
export type BrowseShift = {
  shift_id: string; type: ShiftType; org_name: string; starts_at: string; ends_at: string;
  capacity: number; status: "open" | "full" | "closed"; slots_left: number;
};
export type MySignupItem = {
  signup_id: string; status: SignupStatus; cancelled_at: string | null; was_late: boolean;
  check_in_at: string | null; check_out_at: string | null; hours: number | null; shift: ShiftSummary;
};
export type Reliability = {
  shifts_completed: number; no_shows: number; consecutive_no_shows: number;
  needs_reapproval: boolean; is_reliable: boolean;
};
export type MySignups = { requested: MySignupItem[]; upcoming: MySignupItem[]; history: MySignupItem[]; reliability: Reliability };

const TYPE_LABEL: Record<ShiftType, string> = {
  walking: "Dog walking", feeding: "Feeding", visitor: "Visitor",
  event: "Event", facility: "Facility care", transport: "Transport",
};
export const shiftTypeLabel = (t: ShiftType): string => TYPE_LABEL[t] ?? t;

export const slotsLeftLabel = (slotsLeft: number, capacity: number): string =>
  slotsLeft <= 0 ? "Full" : `${slotsLeft} of ${capacity} slots left`;

export type CardTone = "done" | "danger" | "muted" | "active";
export function signupStatusCard(s: SignupStatus): { label: string; tone: CardTone } {
  switch (s) {
    case "completed": return { label: "Completed", tone: "done" };
    case "no_show":   return { label: "No-show", tone: "danger" };
    case "cancelled": return { label: "Cancelled", tone: "muted" };
    case "declined":  return { label: "Declined", tone: "muted" };
    case "approved":  return { label: "Confirmed", tone: "active" };
    default:          return { label: "Requested", tone: "muted" };
  }
}
export const historyHours = (i: { hours: number | null }): string => i.hours == null ? "—" : `${i.hours} h`;
export const lateCancelCopy = (wasLate: boolean): string =>
  wasLate ? "You're cancelling less than 12 hours before the shift. This will be recorded."
          : "You're cancelling with more than 12 hours' notice — this is free.";
