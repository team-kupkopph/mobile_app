// AD18 · the Adopt tab's Saved segment: what a saved card says about its listing. Pure, so jest pins it.
import { Listing } from "./api/types";
import { ChipTone } from "./components/ui";
import { feeLabel } from "./adoptDeck";

export const SEGMENTS = ["Browse", "Saved", "My inquiries"] as const;
export const SEG_BROWSE = 0;
export const SEG_SAVED = 1;
export const SEG_INQUIRIES = 2;

/** Users never see "pending": a reserved animal reads Reserved. */
export function savedStatus(status: string): { label: string; tone: ChipTone } {
  if (status === "available") return { label: "Available", tone: "success" };
  if (status === "pending") return { label: "Reserved", tone: "warning" };
  if (status === "adopted") return { label: "Adopted", tone: "neutral" };
  return { label: "No longer listed", tone: "neutral" };
}

export function savedMeta(l: Listing): string {
  return [l.pet.breed || l.pet.species.charAt(0).toUpperCase() + l.pet.species.slice(1), l.city]
    .filter(Boolean).join(" · ");
}

export const savedFee = (l: Listing): string => feeLabel(l.adoption_fee);

export const SAVED_EMPTY = "Pets you save with a right swipe wait here for you.";
