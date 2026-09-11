// Track A display logic, unit-tested (like sagip.ts / notifications.ts). Kept in sync
// with the backend's adoption_stage_key / stage_state enums by hand — US-N1 (a shared
// type registry) would eventually remove the hand-mirroring, same as for notifications.
import { InquiryStage } from "./api/types";

// The six stages, in the DDL's order — for rendering a full ladder even when a stage
// row is (defensively) missing from the response.
export const STAGE_ORDER = [
  "inquiry", "application", "home_check", "interview", "vet_clearance", "finalization"
] as const;

export const STAGE_LABEL: Record<string, string> = {
  inquiry: "Inquiry", application: "Application", home_check: "Home check",
  interview: "Interview", vet_clearance: "Vet clearance", finalization: "Finalization"
};

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
