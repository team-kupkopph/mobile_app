// Track A display logic, unit-tested (like sagip.ts / notifications.ts). Kept in sync
// with the backend's adoption_stage_key / stage_state enums by hand — US-N1 (a shared
// type registry) would eventually remove the hand-mirroring, same as for notifications.
import { InquiryStage, MyInquiry } from "./api/types";

// The six stages, in the DDL's order — for rendering a full ladder even when a stage
// row is (defensively) missing from the response.
export const STAGE_ORDER = [
  "inquiry", "application", "home_check", "interview", "vet_clearance", "finalization"
] as const;

export const STAGE_LABEL: Record<string, string> = {
  inquiry: "Inquiry", application: "Application", home_check: "Home check",
  interview: "Interview", vet_clearance: "Vet clearance", finalization: "Finalization"
};

// D15 · a WITHDRAWN inquiry means the rescuer took the animal back or the placement was
// withdrawn — never something the adopter did, so it never reads "You withdrew".
export function inquiryStatusLabel(status: string): string {
  switch (status) {
    case "adopted": return "Adopted";
    case "declined": return "Declined";
    case "withdrawn": return "No longer available";
    default: return "Active";
  }
}

// D15 · withdrawn and declined inquiries are over: the ladder and the card say so instead of
// showing stage progress. `null` = still open (or adopted), so the screen keeps its ladder.
export function inquiryClosedNote(status: string): string | null {
  switch (status) {
    case "withdrawn": return "This animal is no longer available, so this inquiry is closed.";
    case "declined": return "This inquiry was declined.";
    default: return null;
  }
}

export function inquiryIsClosed(status: string): boolean {
  return inquiryClosedNote(status) !== null;
}

// D15 · the server's refusal to inquire on a listing that is no longer AVAILABLE. `null` = not
// this refusal, so the screen keeps its own mapping.
export function inquireRefusalMessage(code: string | undefined): string | null {
  return code === "listing_unavailable" ? "This animal is no longer available for adoption." : null;
}

export type StageTone = "muted" | "active" | "done" | "skipped";

// state -> label + tone. `not_started` is muted (nothing's happened), `in_progress`
// active (teal), `done` green, `skipped` grey — a skipped stage is a real, legitimate
// state (decision 9: stages are flexible), not a failure.
export function stageStateChip(state: string): { label: string; tone: StageTone } {
  switch (state) {
    case "in_progress":
      return { label: "In progress", tone: "active" };
    case "done":
      return { label: "Done", tone: "done" };
    case "skipped":
      return { label: "Skipped", tone: "skipped" };
    default:
      return { label: "Not started", tone: "muted" };
  }
}

// D15 · a closed inquiry shows no progress: a stage the server left `in_progress` reads muted,
// not teal "current" — the ladder would otherwise say the adoption is still moving.
export function ladderStageTone(state: string, closed: boolean): StageTone {
  const tone = stageStateChip(state).tone;
  return closed && tone === "active" ? "muted" : tone;
}

// The adopter's one-line "where does this stand" summary: the furthest stage that's
// actually moved (in_progress or done), or "Just inquired" if only the inquiry stage is done.
export function inquiryProgressLabel(stages: InquiryStage[]): string {
  const byKey = new Map(stages.map((s) => [s.stage_key, s.state]));
  for (let i = STAGE_ORDER.length - 1; i >= 0; i--) {
    const key = STAGE_ORDER[i];
    const state = byKey.get(key);
    if (state === "in_progress") return `${STAGE_LABEL[key]} in progress`;
    if (state === "done") {
      return key === "inquiry" ? "Just inquired" : `${STAGE_LABEL[key]} done`;
    }
  }
  return "Not started";
}

// ---------------------------------------------------------------------------------------------
// The adopter's ladder — design/mobile-v3/Inquiry.dc.html. STAGE_LABEL above is the terse
// vocabulary the shelter side and the one-line summary use; these are the adopter-facing
// titles and the "what it involves" notes the artboard shows when a step is tapped.
// ---------------------------------------------------------------------------------------------

export type StageKey = (typeof STAGE_ORDER)[number];

type NoteContext = { pet: string; shelter: string };

export const STAGE_STEP: Record<StageKey, {
  title: string;
  note: (c: NoteContext) => string;
  /** The artboard's skipped copy differs from the "what it involves" copy. */
  skippedNote?: (c: NoteContext) => string;
}> = {
  inquiry: {
    title: "Inquiry sent",
    note: ({ shelter }) => `Your message reached ${shelter} and they opened your file.`
  },
  application: {
    title: "Application & background check",
    note: ({ shelter }) => `${shelter} checks your details and background. Nothing further is usually needed from you here.`
  },
  home_check: {
    title: "Home check",
    note: ({ pet }) => `A volunteer visits to see where ${pet} would live.`,
    skippedNote: ({ shelter }) => `${shelter} waived the home visit for this listing.`
  },
  interview: {
    title: "Interview",
    note: ({ pet }) => `A volunteer talks with you about ${pet}'s routine and your home.`
  },
  vet_clearance: {
    title: "Vet clearance",
    note: ({ pet }) => `${pet}'s vaccination and neuter records are finalised before handover.`
  },
  finalization: {
    title: "Finalization",
    note: () => "You sign the adoption agreement and arrange pickup."
  }
};

/**
 * "Step N of 6": the first stage that is neither done nor skipped, 1-based. Every stage
 * settled means the ladder is complete and N is 6. The artboard's example — inquiry done,
 * application done, home check skipped, interview in progress — is step 4, 67% along.
 */
export function ladderStep(stages: InquiryStage[]): { step: number; of: number } {
  const byKey = new Map(stages.map((s) => [s.stage_key, s.state]));
  const settled = (key: string) => {
    const st = byKey.get(key);
    return st === "done" || st === "skipped";
  };
  const idx = STAGE_ORDER.findIndex((key) => !settled(key));
  return { step: idx === -1 ? STAGE_ORDER.length : idx + 1, of: STAGE_ORDER.length };
}

/**
 * The right-hand label of a ladder step, as Inquiry.dc.html draws it: a short date on a step
 * that has moved ("Jul 12"), "Skipped", "In progress", nothing on one still to come. "Done"
 * only when the server sent no date — which it does not, since backend #18, but an older
 * server still gets an honest word rather than an invented date.
 */
export function stageMeta(state: string, updatedAt?: string | null, now = new Date()): string {
  if (state === "in_progress") return "In progress";
  if (state === "skipped") return "Skipped";
  if (state !== "done") return "";
  if (!updatedAt) return "Done";
  const d = new Date(updatedAt);
  if (Number.isNaN(d.getTime())) return "Done";
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString(undefined, sameYear ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" });
}

// AQ2 / AD13 · the two refusals the new inquiry gate adds. `listing_unavailable` keeps its own
// path (inquireRefusalMessage + a refetch), so it is deliberately not here.
export function inquireBlockedCopy(code: string | undefined): { title: string; body: string } | null {
  if (code === "shelter_cannot_adopt") {
    return { title: "Shelters can't adopt",
             body: "Adopting is for pet owners. You can still list animals from your Animals tab." };
  }
  if (code === "own_listing") {
    return { title: "This is your listing", body: "You can't inquire on your own listing." };
  }
  return null;
}

// AQ1 / AQ2 · what happens after Inquire, said plainly. The phones are shared only once the
// poster accepts the adopter for screening. A non-member hears about the badge now, not at Reserve.
// `verifiedMember` is undefined from a server older than PR A: then nothing is said about it.
export function inquirySentCopy(posterName: string, verifiedMember: boolean | undefined): { title: string; body: string } {
  let body = `${posterName} will review it. If they accept you for screening, you'll both see each other's phone numbers.`;
  if (verifiedMember === false) {
    body += " You'll also need a Verified Member badge before they can reserve this pet for you.";
  }
  return { title: "Inquiry sent", body };
}

// AQ2 · the ladder's reminder to a non-member that Reserve will need the badge. Only on an open,
// public inquiry: a placement's recipient is already verified, and a closed one has nothing to reserve.
export function adopterBadgeNote(inquiry: MyInquiry, shelter: string, pet: string): string | null {
  if (inquiry.status !== "active" || inquiry.kind === "placement" || inquiry.verified_member !== false) {
    return null;
  }
  return `You'll need a Verified Member badge before ${shelter} can reserve ${pet} for you.`;
}

// AQ1 · once the poster accepts for screening the server sends `poster_contact` on the adopter's
// row. This is the screen's whole display decision: show exactly what it sent, nothing otherwise —
// a null phone stays null (the poster has no verified number), and no contact is ever invented.
export function contactLine(inquiry: MyInquiry): { name: string; phone: string | null } | null {
  return inquiry.poster_contact ?? null;
}

// A public adoption completed by the poster leaves the earlier ladder steps as they were; only
// finalization is done. "Step 2 of 6" on an adopted inquiry would be false, so the header says
// Adopted and the track is full. Used on the screen's non-closed branch only.
export function ladderHeader(inquiry: MyInquiry): { label: string; tone: "info" | "success"; percent: number } {
  if (inquiry.status === "adopted") return { label: "Adopted", tone: "success", percent: 100 };
  const { step, of } = ladderStep(inquiry.stages);
  return { label: `Step ${step} of ${of}`, tone: "info", percent: Math.round((step / of) * 100) };
}
