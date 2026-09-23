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
  | { screen: "kawanggawa"; tab: "mine" }
  | { screen: "shelterVolunteerActivity"; shiftId: string }
  | { screen: "shelterVolunteerRequests"; shiftId: string }
  // Sprint 6 · community. match_suggested rides the report_id path (reportDetail) until L3's
  // dedicated matches screen lands; the wishlist/badge types land on their own screens.
  | { screen: "impact" }
  | { screen: "myDonations" }
  | { screen: "shelterNeeds" };

const REPORT_LINKED_TYPES = new Set([
  "offer_matched", "report_claimed", "offer_received", "report_escalated", "case_reopened",
  "match_suggested"   // {report_id} → the report; a possible-matches row lives there (L3)
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
// US-V8 · the volunteer side of notify(): schedule and history folded onto one hub screen
// (Task 5, K30/G9) — every volunteer notification now opens the hub on its "My shifts" tab,
// whether it's "look at your upcoming shifts" (shift_confirmed/shift_reminder) or "see what
// happened" (signup_declined/shift_cancelled_by_shelter). MY_SHIFTS_TYPES replaces the old
// SCHEDULE_TYPES/HISTORY_TYPES split — the two destinations became one screen with two
// sections, so the routing no longer needs to guess which section a type belongs under.
const MY_SHIFTS_TYPES = new Set([
  "shift_confirmed", "shift_reminder", "signup_declined", "shift_cancelled_by_shelter"
]);
// US-V9 · signup_requested is the SHELTER's own notification (a volunteer requested one of
// their shifts) — routes to the shelter-side requests screen for that shift, same
// whitelist-by-type posture as reportDetail above: the only `data` read is the id plugged
// into a fixed screen, never a URL parsed out of `data`.
// signup_cancelled_by_volunteer is the shelter's own notification too (a volunteer cancelled
// a shift they were on) — routes to that shift's activity hub, same shape.

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
  if (MY_SHIFTS_TYPES.has(n.type)) {
    return { screen: "kawanggawa", tab: "mine" };
  }
  if (n.type === "signup_requested" && n.data?.shift_id) {
    return { screen: "shelterVolunteerRequests", shiftId: n.data.shift_id };
  }
  if (n.type === "signup_cancelled_by_volunteer" && n.data?.shift_id) {
    return { screen: "shelterVolunteerActivity", shiftId: n.data.shift_id };
  }
  // Sprint 6 · community notifications route to their own screens (US-B2/W2/W3).
  if (n.type === "badge_earned") {
    return { screen: "impact" };
  }
  if (n.type === "pledge_confirmed") {
    return { screen: "myDonations" };
  }
  if (n.type === "pledge_received") {
    return { screen: "shelterNeeds" };
  }
  return null; // unknown type, or a report-linked type missing its report_id — no-op tap
}
