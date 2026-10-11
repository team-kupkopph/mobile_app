/**
 * R5-F5 (decided 2026-10-11, owner pick: the merged artboard's behaviour) — a declined applicant
 * still showed the six-row Steps card on the Applicant screen. The merged artboard hides Steps for
 * Declined: the inquiry is over, the rows can't be moved, and the footer already says "You declined:
 * <reason>." Candidate C-P1 in the plan; seen on the device in Run 5.
 *
 * Only `declined` hides the card. A withdrawn applicant is untouched (the decision was about
 * Declined and the spec is silent on Withdrawn), and active and adopted ones keep it.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { PosterInquiry } from "../api/types";
import { showStepsCard } from "../applicant";

const row = (over: Record<string, unknown>) => ({ status: "active", ...over }) as unknown as PosterInquiry;
const screen = readFileSync(join(__dirname, "..", "screens", "ApplicantScreen.tsx"), "utf8");

describe("showStepsCard — the Steps card is hidden for a declined applicant (R5-F5)", () => {
  it("hides it for declined, whatever the reason", () => {
    for (const end_reason of ["requirements_not_met", "not_a_fit", "no_response", "other", "another_adopter_chosen", undefined]) {
      expect(showStepsCard(row({ status: "declined", end_reason }))).toBe(false);
    }
  });
  it("keeps it while the inquiry is active, in every active state", () => {
    expect(showStepsCard(row({ status: "active" }))).toBe(true);
    expect(showStepsCard(row({ status: "active", accepted_at: "2026-10-11T00:00:00Z" }))).toBe(true);
    expect(showStepsCard(row({ status: "active", reserved_at: "2026-10-11T00:00:00Z" }))).toBe(true);
    expect(showStepsCard(row({ status: "active", kind: "placement" }))).toBe(true);
  });
  it("keeps it for an adopted applicant (the full track under the Adopted chip)", () => {
    expect(showStepsCard(row({ status: "adopted" }))).toBe(true);
  });
  it("leaves a withdrawn applicant as it was (the decision was about Declined)", () => {
    expect(showStepsCard(row({ status: "withdrawn", end_reason: "adopter_withdrew" }))).toBe(true);
    expect(showStepsCard(row({ status: "withdrawn", end_reason: "listing_withdrawn" }))).toBe(true);
  });
});

describe("the Applicant screen wraps the Steps card in the helper (R5-F5)", () => {
  it("the scan found what it is scanning", () => {
    expect(screen).toContain("styles.stepsHead");
    expect(screen).toContain("STAGE_ORDER.map");
  });
  it("the card that holds the steps header and rows sits inside showStepsCard(row)", () => {
    const gate = screen.indexOf("showStepsCard(row)");
    const head = screen.indexOf("styles.stepsHead");
    const rows = screen.indexOf("STAGE_ORDER.map");
    expect(gate).toBeGreaterThan(-1);
    expect(head).toBeGreaterThan(gate);
    expect(rows).toBeGreaterThan(head);
  });
  it("the declined footer (the closing line) is untouched", () => {
    expect(screen).toContain("footer.doneNote");
  });
});
