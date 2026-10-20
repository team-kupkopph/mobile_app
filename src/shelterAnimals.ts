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

/** AD10 · a withdrawn listing isn't a fourth segment (the control holds three); it sits behind an
 *  "Archived" link under the segments and is read with this status. */
export const ARCHIVED_STATUS = "withdrawn" as const;
export const ARCHIVED_CHIP: { label: string; tone: ChipTone } = { label: "Withdrawn", tone: "neutral" };
/** AD7 · a card the poster sees after a moderation takedown. */
export const REMOVED_CHIP: { label: string; tone: ChipTone } = { label: "Removed", tone: "danger" };

/** The chip for a poster's own card: a takedown wins over whatever the status was. */
export function cardChip(l: { status: string; removed_by_moderation?: boolean }, archived: boolean): { label: string; tone: ChipTone } {
  if (l.removed_by_moderation) return REMOVED_CHIP;
  if (archived) return ARCHIVED_CHIP;
  return STATUS_CHIP[l.status as ListingStatus] ?? STATUS_CHIP.available;
}

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

/** R5-F6 / CP-1 · a listing with no name still needs something to call it in a list row. */
export const UNNAMED = "Unnamed";
export function listingTitle(name: string | null | undefined): string {
  return (name ?? "").trim() || UNNAMED;
}
/** The letter on a photo-less tile; "?" when there is no name to take one from. */
export function listingInitial(name: string | null | undefined): string {
  const t = (name ?? "").trim();
  return t ? t.charAt(0).toUpperCase() : "?";
}

/** Spec 2026-10-06 §3 · the poster's own rows say how many people are waiting on an answer. */
export function applicantsChip(n: number | undefined): string | null {
  if (!n) return null;
  return n === 1 ? "1 applicant" : `${n} applicants`;
}

// D7 (dev/sagip-build-review.md) · a shelter that accepts a rescuer's placement gets the animal
// as a private DRAFT listing (backend: listings/views.py::_shelter_draft_from). Drafts are not
// a fourth segment — the three above follow the canvas artboard — they sit in their own strip.
export const DRAFT_STATUS = "draft" as const;

/** Where a tap on a draft goes: Your listing (the preview), which carries Edit, Publish and Delete draft. */
export function draftRoute(listingId: string): { name: "posterListing"; params: { listingId: string } } {
  return { name: "posterListing", params: { listingId } };
}

/** The accept response is `{ listing_id, draft: true }` for a shelter and `{ pet_id }` for a
 *  person; only the former has somewhere to go next. */
export function acceptedPlacementParams(data: any): { listingId: string } | undefined {
  return data?.draft && data?.listing_id ? { listingId: data.listing_id } : undefined;
}
