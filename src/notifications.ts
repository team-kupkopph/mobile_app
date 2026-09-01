// US-X1 (bell) deep-linking — where a tap on a notification goes. Tested like sagip.ts:
// a derivation, not a screen. Every type below is one `notify()` actually calls in the
// backend, now registered once in `notifications/types.py::REGISTRY` (US-N1) — this map
// is still hand-kept in sync with that registry (the server has no shared-package export
// for the mobile client to import), but there's now one source of truth to sync AGAINST
// instead of reverse-engineering call sites.
export type NotificationTarget =
  | { screen: "verifyDocuments" }
  | { screen: "reportDetail"; reportId: string }
  | { screen: "myInquiries" }
  | { screen: "kawanggawaSchedule" }
  | { screen: "kawanggawaHistory" }
  | { screen: "shelterVolunteerRequests"; shiftId: string };

const REPORT_LINKED_TYPES = new Set([
  "offer_matched", "report_claimed", "offer_received", "report_escalated", "case_reopened"
]);
const VERIFICATION_TYPES = new Set([
  "verification_approved", "verification_rejected", "verification_needs_info"
]);
// stage_advanced is the adopter's own notification (a poster advanced their inquiry) —
// their inquiry list is where to see it. inquiry_received fires in TWO directions with the
// identical {listing_id, inquiry_id} payload shape, so the type alone can't tell them apart:
// (a) a poster is told someone inquired on their listing — still no poster-side review
// screen (US-A4's "poster advances stages" was built backend-only), so this is a no-op for
// them, same as before; (b) US-H3 — a direct-placement recipient is told they were offered
// an animal (CasePlaceView). (b) now HAS a destination: MyInquiriesScreen shows the
// recipient's own inquiries (they're `adopter_account` on a placement) and flags a placement
// row client-side (see MyInquiriesScreen's isPlacement — every stage SKIPPED) with a
// tap-through to placeRequest. Routing both directions here to myInquiries is a deliberate
// over-approximation: harmless for (a) (they land on their own — unrelated — inquiry list,
// same as tapping the bell icon itself would), and correct for (b).
const MY_INQUIRIES_TYPES = new Set(["stage_advanced", "inquiry_received"]);
// US-V8 · the volunteer side of notify(): shift_confirmed/shift_reminder are "look at your
// upcoming shifts", signup_declined/shift_cancelled_by_shelter are "see what happened" —
// both already-past events, so history rather than schedule.
const SCHEDULE_TYPES = new Set(["shift_confirmed", "shift_reminder"]);
const HISTORY_TYPES = new Set(["signup_declined", "shift_cancelled_by_shelter"]);
// US-V9 · signup_requested is the SHELTER's own notification (a volunteer requested one of
// their shifts) — routes to the shelter-side requests screen for that shift, same
// whitelist-by-type posture as reportDetail above: the only `data` read is the id plugged
// into a fixed screen, never a URL parsed out of `data`.

export function notificationTarget(n: { type: string; data: Record<string, any> | null }): NotificationTarget | null {
  if (VERIFICATION_TYPES.has(n.type)) {
    return { screen: "verifyDocuments" };
  }
  if (REPORT_LINKED_TYPES.has(n.type) && n.data?.report_id) {
    return { screen: "reportDetail", reportId: n.data.report_id };
  }
  if (MY_INQUIRIES_TYPES.has(n.type)) {
    return { screen: "myInquiries" };
  }
  if (SCHEDULE_TYPES.has(n.type)) {
    return { screen: "kawanggawaSchedule" };
  }
  if (HISTORY_TYPES.has(n.type)) {
    return { screen: "kawanggawaHistory" };
  }
  if (n.type === "signup_requested" && n.data?.shift_id) {
    return { screen: "shelterVolunteerRequests", shiftId: n.data.shift_id };
  }
  return null; // unknown type, or a report-linked type missing its report_id — no-op tap
}
