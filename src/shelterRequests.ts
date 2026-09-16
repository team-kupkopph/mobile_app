// Task B3 · the shelter's Requests tab root. New screen, V3 from birth — the LAST of
// ShelterTabs' five tabs (Home · Animals · Donate · Requests · You) to stop being dead
// (see `surfaceV3.test.ts`'s `findDeadTabs`). Segmented Adoption/Volunteer/Placement over
// B-be2's merged inbox — GET /shelter/requests?kind=<adoption|volunteer|placement>&
// status=open, one endpoint across three unrelated backend models (AdoptionInquiry twice,
// once as the shelter's own listing and once as a placement addressed TO the shelter, and
// VolunteerSignup).
//
// Kept pure and separate from the screen — same shape as shelterAnimals.ts's
// SEGMENT_STATUS/STATUS_CHIP and shelterDashboard.ts's shelterBannerState — so the
// segment→kind mapping and the routing decision are testable without React Native at all.
import { ChipTone } from "./components/ui";
import { ShelterRequest } from "./api/types";

/**
 * `SegmentedControl`'s `index` -> the `kind` query param B-be2 accepts. Segments, in
 * order: ["Adoption", "Volunteer", "Placement"] — the same three inbound-request surfaces
 * `shelter/views.py::ShelterRequestsView` merges (`_adoption_items` / `_volunteer_items` /
 * `_placement_items`).
 */
export const SEGMENT_KIND = { 0: "adoption", 1: "volunteer", 2: "placement" } as const;

export type RequestSegmentIndex = keyof typeof SEGMENT_KIND;

/**
 * One status chip per status value B-be2 can hand back, mapped onto the SHARED status
 * vocabulary (`chipTones`) rather than a bespoke palette — same rule InquiryList.tsx's own
 * STATUS_TONE follows. `active`/`requested` are the two "still open" states the endpoint's
 * own `status=open` filter checks (see the backend's `open_only` clause) — both read as the
 * shared `warning` tone, the same "waiting on someone" reading STATUS_CHIP gives Pending
 * over in shelterAnimals.ts.
 */
export const REQUEST_STATUS_TONE: Record<string, { label: string; tone: ChipTone }> = {
  // Adoption / placement — AdoptionInquiry.status.
  active: { label: "Active", tone: "warning" },
  adopted: { label: "Adopted", tone: "success" },
  declined: { label: "Declined", tone: "danger" },
  withdrawn: { label: "Withdrawn", tone: "neutral" },
  // Volunteer — VolunteerSignup.status.
  requested: { label: "Requested", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  completed: { label: "Completed", tone: "success" },
  no_show: { label: "No-show", tone: "danger" }
};

export const DEFAULT_STATUS_TONE = { label: "Unknown", tone: "neutral" as ChipTone };

/**
 * Where a row's tap goes, re-derived from `item.kind` rather than trusting the wire's own
 * `target.route` string directly — same defensive stance notifications.ts takes for its own
 * client-side routing. Adoption and placement are both an `AdoptionInquiry`; both land on
 * the SAME ladder (`inquiry`), the shelter is just on a different side of it (poster vs.
 * placement recipient) — the ladder itself already renders correctly either way (see
 * InquiryScreen). Volunteer opens that shift's pending-requests queue.
 *
 * ⚠️ Reads the id from `item.target.id`, NOT `item.id`. For adoption/placement the two are
 * the same value (the inquiry's own pk either way), but for volunteer they are NOT: `id` is
 * the signup's pk while `target.id` is the shift's — `shelterVolunteerRequests` takes a
 * `shiftId`, so the signup id would 404 (see shelter/views.py::_volunteer_items on the
 * backend, which sets `target.id` to `su.shift_id`, not `su.pk`).
 */
export function requestRoute(item: ShelterRequest): { name: string; params: Record<string, string> } {
  if (item.kind === "volunteer") {
    return { name: "shelterVolunteerRequests", params: { shiftId: item.target.id } };
  }
  return { name: "inquiry", params: { inquiryId: item.target.id } };
}
