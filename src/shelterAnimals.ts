// Task B2 · the shelter's Animals tab root. New screen, V3 from birth — the fifth of
// ShelterTabs' five tabs (Home · Animals · Donate · Requests · You) to stop being dead (see
// `surfaceV3.test.ts`'s `findDeadTabs`). Segmented Live/Pending/Adopted over the shelter's
// OWN listings, from GET /listings?mine=true&status=<available|pending|adopted> (B-be1).
//
// Kept pure and separate from the screen — same shape as shelterDashboard.ts's
// shelterBannerState / shelterDonate.ts's donateSections — so the segment→status mapping is
// testable without React Native at all.
import { ChipTone } from "./components/ui";

/**
 * `SegmentedControl`'s `index` -> the `status` query param B-be1 accepts. Segments, in
 * order: ["Live", "Pending", "Adopted"] — "Live" reads as "available" on the wire, the same
 * word the public Adopt feed and the backend model both use for an unclaimed listing.
 */
export const SEGMENT_STATUS = { 0: "available", 1: "pending", 2: "adopted" } as const;

export type ListingStatus = (typeof SEGMENT_STATUS)[keyof typeof SEGMENT_STATUS];

/**
 * One status chip per segment. "available" and "adopted" both read as `success` — a live
 * listing and one that reached its goal are both a good state; only "pending" is waiting on
 * someone, so it alone takes the warning tone. Same vocabulary as Chip.tsx's own comment.
 * The wire status `pending` reads "Reserved" on screen (spec 2026-10-06).
 */
export const STATUS_CHIP: Record<ListingStatus, { label: string; tone: ChipTone }> = {
  available: { label: "Available", tone: "success" },
  pending: { label: "Reserved", tone: "warning" },
  adopted: { label: "Adopted", tone: "success" }
};

/** Spec 2026-10-06 §3 · the poster's own rows say how many people are waiting on an answer. */
export function applicantsChip(n: number | undefined): string | null {
  if (!n) return null;
  return n === 1 ? "1 applicant" : `${n} applicants`;
}

// D7 (dev/sagip-build-review.md) · a shelter that accepts a rescuer's placement gets the animal
// as a private DRAFT listing (backend: listings/views.py::_shelter_draft_from). Drafts are not
// a fourth segment — the three above follow the canvas artboard — they sit in their own strip.
export const DRAFT_STATUS = "draft" as const;

/** Where a tap on a draft goes: the form, so the shelter can add the story and fee first. */
export function draftRoute(listingId: string): { name: "listingForm"; params: { listingId: string } } {
  return { name: "listingForm", params: { listingId } };
}

/** The accept response is `{ listing_id, draft: true }` for a shelter and `{ pet_id }` for a
 *  person; only the former has somewhere to go next. */
export function acceptedPlacementParams(data: any): { listingId: string } | undefined {
  return data?.draft && data?.listing_id ? { listingId: data.listing_id } : undefined;
}
