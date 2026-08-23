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
