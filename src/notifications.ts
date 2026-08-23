// US-X1 (bell) deep-linking — where a tap on a notification goes. Tested like sagip.ts:
// a derivation, not a screen. Every type below is one `notify()` actually calls in the
// backend (verifications/review.py, sagip/views.py, sagip/sweeps.py) — kept in sync by
// hand since `type` is free-text on the server (no shared enum to import).
export type NotificationTarget =
  | { screen: "verifyDocuments" }
  | { screen: "reportDetail"; reportId: string };

const REPORT_LINKED_TYPES = new Set([
  "offer_matched", "report_claimed", "offer_received", "report_escalated", "case_reopened"
]);
const VERIFICATION_TYPES = new Set([
  "verification_approved", "verification_rejected", "verification_needs_info"
]);

export function notificationTarget(n: { type: string; data: Record<string, any> | null }): NotificationTarget | null {
  if (VERIFICATION_TYPES.has(n.type)) {
    return { screen: "verifyDocuments" };
  }
  if (REPORT_LINKED_TYPES.has(n.type) && n.data?.report_id) {
    return { screen: "reportDetail", reportId: n.data.report_id };
  }
  return null; // unknown type, or a report-linked type missing its report_id — no-op tap
}
