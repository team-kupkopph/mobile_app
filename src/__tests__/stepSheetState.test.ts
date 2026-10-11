/**
 * R5-F7b (decided 2026-10-11, owner pick: follow the spec) — the step sheet showed only the
 * step's title. Spec §2 says it shows "the title and current state"; Run 5 observed no state
 * (AP-S1). A poster who opens Interview should see whether it is Not started, In progress, Done
 * or Skipped before choosing Start / Mark done / Skip.
 *
 * The other half of R5-F7 (the artboard's primary Save versus the spec's three actions posting
 * directly) is NOT decided and is not touched here.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { stepSheetState } from "../applicant";

const sheet = readFileSync(join(__dirname, "..", "components", "applicant", "StepSheet.tsx"), "utf8");
const at = (needle: string) => sheet.indexOf(needle);

describe("stepSheetState — the label and tone for a step's current state (R5-F7b)", () => {
  it("names each state in the words the ladder already uses", () => {
    expect(stepSheetState("not_started").label).toBe("Not started");
    expect(stepSheetState("in_progress").label).toBe("In progress");
    expect(stepSheetState("done").label).toBe("Done");
    expect(stepSheetState("skipped").label).toBe("Skipped");
  });
  it("an unknown or empty state reads Not started rather than blank", () => {
    expect(stepSheetState("").label).toBe("Not started");
    expect(stepSheetState("something_new").label).toBe("Not started");
  });
  it("tones it with the shared chip vocabulary: in progress info, done success, the rest neutral", () => {
    expect(stepSheetState("in_progress").tone).toBe("info");
    expect(stepSheetState("done").tone).toBe("success");
    expect(stepSheetState("skipped").tone).toBe("neutral");
    expect(stepSheetState("not_started").tone).toBe("neutral");
  });
});

describe("the step sheet shows the current state (R5-F7b)", () => {
  it("the scan found what it is scanning", () => {
    expect(at('<Text style={styles.title}>')).toBeGreaterThan(-1);
    expect(at('testID="input.step.note"')).toBeGreaterThan(-1);
    expect(at("state")).toBeGreaterThan(-1);
  });
  it("renders a chip from the helper, between the title and the note field", () => {
    const title = at('<Text style={styles.title}>');
    const chip = at('testID="chip.step.state"');
    const input = at('testID="input.step.note"');
    expect(sheet).toContain("stepSheetState(state)");
    expect(chip).toBeGreaterThan(title);
    expect(chip).toBeLessThan(input);
  });
  it("the actions still hide the step's current state (unchanged: you can't Start what is started)", () => {
    expect(sheet).toContain("stepActions(stageKey, state)");
  });
});
