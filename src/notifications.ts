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
  | { screen: "kawanggawaHistory" };

const REPORT_LINKED_TYPES = new Set([
  "offer_matched", "report_claimed", "offer_received", "report_escalated", "case_reopened"
]);
const VERIFICATION_TYPES = new Set([
  "verification_approved", "verification_rejected", "verification_needs_info"
]);
// stage_advanced is the adopter's own notification (a poster advanced their inquiry) —
// their inquiry list is where to see it. inquiry_received is the OTHER direction (a
// poster is told someone inquired) and has deliberately no target here: no poster-side
// inquiry-review screen exists yet in the mobile app at all (US-A4's "poster advances
// stages" was built backend-only — POST /inquiries/{id}/stages/{stage_key} has no
// caller on the client) — a real gap found while building this registry, not something
// to paper over with a link to a screen that doesn't exist.
const MY_INQUIRIES_TYPES = new Set(["stage_advanced"]);
// US-V8 · the volunteer side of notify(): shift_confirmed/shift_reminder are "look at your
// upcoming shifts", signup_declined/shift_cancelled_by_shelter are "see what happened" —
// both already-past events, so history rather than schedule. signup_requested is the
// SHELTER's own notification (a volunteer requested one of their shifts) — deliberately
// not handled here; that's V9, a shelter-side screen that doesn't exist on mobile yet.
const SCHEDULE_TYPES = new Set(["shift_confirmed", "shift_reminder"]);
const HISTORY_TYPES = new Set(["signup_declined", "shift_cancelled_by_shelter"]);

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
  return null; // unknown type, or a report-linked type missing its report_id — no-op tap
}
