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
 */
export const STATUS_CHIP: Record<ListingStatus, { label: string; tone: ChipTone }> = {
  available: { label: "Available", tone: "success" },
  pending: { label: "Pending", tone: "warning" },
  adopted: { label: "Adopted", tone: "success" }
};
