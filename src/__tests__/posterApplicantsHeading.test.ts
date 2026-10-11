/**
 * R5-F3 (decided 2026-10-11, owner pick: the artboard's behaviour) — "Applicants (N)" on Your
 * listing counted closed applicants too. The artboard's "Applicants (3)" lists three open rows
 * and puts closed ones under a separate "Show 1 closed", so N is the number still waiting on an
 * answer; and the toggle says how many it hides: "Hide 1 closed", not "Hide closed". Seen on
 * the device in Run 5 and Run 6 part 2: a listing whose only applicant was declined read
 * "Applicants (1)" with nothing under it.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { PosterInquiry } from "../api/types";
import { applicantsHeading, closedToggleLabel } from "../applicant";

const row = (status: string) => ({ status }) as unknown as PosterInquiry;
const screen = readFileSync(join(__dirname, "..", "screens", "PosterListingScreen.tsx"), "utf8");

describe("applicantsHeading — the count is the open applicants only", () => {
  it("counts active applicants and ignores every closed state", () => {
    const rows = [row("active"), row("active"), row("active"), row("declined"), row("withdrawn"), row("adopted")];
    expect(applicantsHeading(rows, false)).toBe("Applicants (3)");
  });
  it("is zero when every applicant is closed, not the total", () => {
    expect(applicantsHeading([row("declined")], false)).toBe("Applicants (0)");
    expect(applicantsHeading([row("declined"), row("withdrawn")], false)).toBe("Applicants (0)");
  });
  it("is zero with no applicants at all", () => {
    expect(applicantsHeading([], false)).toBe("Applicants (0)");
  });
  it("adds a plus while more pages are still to load", () => {
    expect(applicantsHeading([row("active"), row("declined")], true)).toBe("Applicants (1+)");
  });
});

describe("closedToggleLabel — says how many closed rows it shows or hides", () => {
  it("Show N closed while collapsed", () => {
    expect(closedToggleLabel(1, false, false)).toBe("Show 1 closed");
    expect(closedToggleLabel(4, false, false)).toBe("Show 4 closed");
  });
  it("Hide N closed while expanded (the artboard's wording, with the count)", () => {
    expect(closedToggleLabel(1, false, true)).toBe("Hide 1 closed");
    expect(closedToggleLabel(4, false, true)).toBe("Hide 4 closed");
  });
  it("adds a plus while more pages are still to load, in both states", () => {
    expect(closedToggleLabel(2, true, false)).toBe("Show 2+ closed");
    expect(closedToggleLabel(2, true, true)).toBe("Hide 2+ closed");
  });
});

describe("Your listing goes through the helpers (R5-F3)", () => {
  it("the scan found what it is scanning", () => {
    expect(screen).toContain("styles.section");
    expect(screen).toContain("btn.posterListing.showClosed");
  });
  it("the heading and the toggle come from the helpers, not from raw counts or literals", () => {
    expect(screen).toContain("applicantsHeading(applicants, !!next)");
    expect(screen).toContain("closedToggleLabel(closedRows.length, !!next, showClosed)");
    expect(screen).not.toMatch(/Applicants \(\{applicants\.length/);
    expect(screen).not.toContain('"Hide closed"');
  });
});
