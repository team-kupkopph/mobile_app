import { STAGE_ORDER, STAGE_STEP, inquiryProgressLabel, ladderStep, stageStateChip } from "../adoption";

describe("stageStateChip", () => {
  it("maps each stage state to a labelled tone; skipped is not a failure", () => {
    expect(stageStateChip("not_started")).toEqual({ label: "Not started", tone: "muted" });
    expect(stageStateChip("in_progress")).toEqual({ label: "In progress", tone: "active" });
    expect(stageStateChip("done")).toEqual({ label: "Done", tone: "done" });
    expect(stageStateChip("skipped")).toEqual({ label: "Skipped", tone: "skipped" });
  });
});

describe("inquiryProgressLabel", () => {
  const allNotStarted = [
    "inquiry", "application", "home_check", "interview", "vet_clearance", "finalization"
  ].map((k) => ({ stage_key: k, state: "not_started" }));

  it("reads 'Just inquired' when only the inquiry stage is done", () => {
    const stages = allNotStarted.map((s) =>
      s.stage_key === "inquiry" ? { ...s, state: "done" } : s);
    expect(inquiryProgressLabel(stages)).toBe("Just inquired");
  });

  it("reports the furthest stage that has moved", () => {
    const stages = allNotStarted.map((s) => {
      if (s.stage_key === "inquiry") return { ...s, state: "done" };
      if (s.stage_key === "application") return { ...s, state: "done" };
      if (s.stage_key === "home_check") return { ...s, state: "in_progress" };
      return s;
    });
    expect(inquiryProgressLabel(stages)).toBe("Home check in progress");
  });

  it("prefers a later in_progress over an earlier done", () => {
    const stages = allNotStarted.map((s) => {
      if (s.stage_key === "inquiry") return { ...s, state: "done" };
      if (s.stage_key === "interview") return { ...s, state: "in_progress" };
      return s;
    });
    expect(inquiryProgressLabel(stages)).toBe("Interview in progress");
  });
});

describe("ladderStep", () => {
  const s = (states: string[]) => STAGE_ORDER.map((stage_key, i) => ({ stage_key, state: states[i] ?? "not_started" }));

  it("is the artboard's example: done, done, skipped, in progress -> step 4 of 6", () => {
    expect(ladderStep(s(["done", "done", "skipped", "in_progress"]))).toEqual({ step: 4, of: 6 });
  });

  it("is step 2 right after the inquiry lands", () => {
    // The view marks the inquiry stage done at creation; everything else is untouched.
    expect(ladderStep(s(["done"]))).toEqual({ step: 2, of: 6 });
  });

  it("is step 6 of 6 when every stage is settled", () => {
    expect(ladderStep(s(["done", "done", "done", "done", "done", "done"]))).toEqual({ step: 6, of: 6 });
    // A placement bypass skips everything — also complete, not "step 1".
    expect(ladderStep(s(Array(6).fill("skipped")))).toEqual({ step: 6, of: 6 });
  });

  it("does not skip ahead over a stage that is merely in progress", () => {
    expect(ladderStep(s(["done", "in_progress", "done"]))).toEqual({ step: 2, of: 6 });
  });

  it("tolerates a missing stage row, as the summary does", () => {
    expect(ladderStep([{ stage_key: "inquiry", state: "done" }])).toEqual({ step: 2, of: 6 });
    expect(ladderStep([])).toEqual({ step: 1, of: 6 });
  });
});

describe("STAGE_STEP", () => {
  it("names every stage in the DDL's order, and no others", () => {
    expect(Object.keys(STAGE_STEP)).toEqual([...STAGE_ORDER]);
  });

  it("writes the pet and the shelter into the note, never a placeholder", () => {
    const ctx = { pet: "Milo", shelter: "PAWS Manila" };
    for (const key of STAGE_ORDER) {
      const note = STAGE_STEP[key].note(ctx);
      expect(note).not.toMatch(/\{|\}|undefined/);
      expect(note.length).toBeGreaterThan(20);
    }
    expect(STAGE_STEP.home_check.skippedNote!(ctx)).toBe("PAWS Manila waived the home visit for this listing.");
    expect(STAGE_STEP.interview.note(ctx)).toContain("Milo's");
  });
});
