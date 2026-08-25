// US-V9 shelter-side display logic + types. Pure, unit-tested (like volunteer.ts).
import { BrowseShift, Reliability } from "./volunteer";

export type ShelterShift = BrowseShift;
export type PendingRequest = { signup_id: string; volunteer: { display_name: string }; reliability: Reliability };
export type ListingCard = { listing_id: string; pet: { name: string; species: string }; photo_url: string | null };
export type VolunteerDetail = {
  display_name: string; reliability: Reliability;
  contact?: { phone: string | null; email: string; address: { line1: string; barangay: string; city: string; province: string } | null };
};

export type ChipTone = "done" | "muted" | "danger";
export function reliabilityChip(rel: Reliability): { label: string; tone: ChipTone } {
  if (rel.needs_reapproval)
    return { label: `Needs re-approval · ${rel.consecutive_no_shows} no-shows in a row`, tone: "danger" };
  if (rel.is_reliable) return { label: "Reliable", tone: "done" };
  return { label: "New volunteer", tone: "muted" };
}

export function blastRadiusCopy(n: number): string {
  if (n <= 0) return "No volunteers will be notified.";
  return `${n} volunteer${n === 1 ? "" : "s"} will be notified.`;
}
