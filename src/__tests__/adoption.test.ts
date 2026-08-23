import { inquiryProgressLabel, stageStateChip } from "../adoption";

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
