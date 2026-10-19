// AD10 · the poster's take-down actions on their own listing: what each confirm says, kept pure.
// The server's two-step (D15) is the source of truth: Withdraw answers 409 `has_active_inquiries`
// with a count until the poster confirms with {"close_inquiries": true}.
import { ListingDetail } from "./api/types";

export type PosterAction = "publish" | "edit" | "withdraw" | "markAdopted";

/** Which actions the poster's view offers for a listing's status (users never see "pending"). */
export function posterActions(listing: Pick<ListingDetail, "status" | "removed_by_moderation">, reserved: boolean): PosterAction[] {
  if (listing.removed_by_moderation) return [];
  switch (listing.status) {
    case "draft": return ["publish", "edit", "withdraw"];
    case "available": return ["edit", "markAdopted", "withdraw"];
    // Reserved: the poster completes it from the applicant, so "adopted elsewhere" isn't offered.
    case "pending": return reserved ? ["edit", "withdraw"] : ["edit", "markAdopted", "withdraw"];
    default: return [];
  }
}

export function withdrawConfirm(pet: string, openApplicants: number): { title: string; body: string; confirm: string } {
  if (openApplicants === 0) {
    return { title: `Take ${pet} off Kupkop?`, body: "The listing will be withdrawn. You can't undo this.", confirm: "Withdraw" };
  }
  const people = openApplicants === 1 ? "1 person has" : `${openApplicants} people have`;
  return {
    title: openApplicants === 1 ? "Close their inquiry?" : "Close their inquiries?",
    body: `${people} asked about ${pet}. Withdrawing closes ${openApplicants === 1 ? "their inquiry" : "all of their inquiries"} and tells them it's no longer available.`,
    confirm: "Withdraw and close"
  };
}

export function markAdoptedConfirm(pet: string, openApplicants: number): { title: string; body: string; confirm: string } {
  const tail = openApplicants === 0 ? "" :
    ` ${openApplicants === 1 ? "The person" : `The ${openApplicants} people`} who asked will be told ${pet} found a home.`;
  return { title: `Mark ${pet} as adopted?`, body: `Use this when ${pet} found a home outside Kupkop.${tail}`, confirm: "Mark adopted" };
}

/** The refusals the take-down endpoints can answer after the screen has gone stale. */
export function takedownRefusal(code: string | undefined): string | null {
  switch (code) {
    case "use_complete": return "Someone holds the reservation. Open them from the list and complete the adoption there.";
    case "already_adopted": return "This animal already has a home.";
    case "not_withdrawable": return "This listing is already withdrawn.";
    case "placement_pending": return "This animal is offered to someone. Withdraw the offer first.";
    case "not_markable": return "Only a listing that's on the feed or reserved can be marked adopted.";
    default: return null;
  }
}
