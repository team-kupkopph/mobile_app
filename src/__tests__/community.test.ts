import {
  impactTiles, matchReasons, matchStrength, needProgressFraction, needProgressLabel,
  needStatusChip, pledgeIsCancellable, pledgeStatusChip, storyTypeChip
} from "../community";

describe("pledgeStatusChip", () => {
  it("maps each pledge status to the shared chip tone", () => {
    expect(pledgeStatusChip("pledged")).toEqual({ label: "Pledged", tone: "warn" });
    expect(pledgeStatusChip("delivered")).toEqual({ label: "Delivered", tone: "ok" });
    expect(pledgeStatusChip("cancelled")).toEqual({ label: "Cancelled", tone: "muted" });
  });
});

describe("needStatusChip", () => {
  it("maps need status: open=amber, fulfilled=green, closed=grey", () => {
    expect(needStatusChip("open").tone).toBe("warn");
    expect(needStatusChip("fulfilled").tone).toBe("ok");
    expect(needStatusChip("closed").tone).toBe("muted");
  });
});

describe("pledgeIsCancellable", () => {
  it("only a still-pledged pledge can be cancelled (D-S6-7)", () => {
    expect(pledgeIsCancellable("pledged")).toBe(true);
    expect(pledgeIsCancellable("delivered")).toBe(false);
    expect(pledgeIsCancellable("cancelled")).toBe(false);
  });
});

describe("need progress", () => {
  it("labels received-of-needed", () => {
    expect(needProgressLabel(2, 5)).toBe("2 of 5 received");
  });
  it("fraction is clamped and never divides by zero", () => {
    expect(needProgressFraction(2, 4)).toBe(0.5);
    expect(needProgressFraction(9, 4)).toBe(1);
    expect(needProgressFraction(1, 0)).toBe(0);
  });
});

describe("impactTiles", () => {
  it("returns the four aggregates as labelled tiles in order", () => {
    const tiles = impactTiles({
      shifts_completed: 3, rescues_helped: 1, pets_rehomed: 2, pledges_delivered: 5
    });
    expect(tiles.map((t) => t.label)).toEqual(["Shifts", "Rescues", "Rehomed", "Donations"]);
    expect(tiles.map((t) => t.value)).toEqual([3, 1, 2, 5]);
  });
});

describe("storyTypeChip", () => {
  it("labels + tones each story type", () => {
    expect(storyTypeChip("adoption")).toEqual({ label: "Adoption", tone: "ok" });
    expect(storyTypeChip("rescue")).toEqual({ label: "Rescue", tone: "teal" });
    expect(storyTypeChip("general")).toEqual({ label: "General", tone: "muted" });
  });
});

describe("matchReasons", () => {
  it("renders the §11 signals as human reasons, never a percentage", () => {
    const r = matchReasons({ geo: 0.95, time: 0.9, breed: 0.5, color: 0.6, size_sex: 1 });
    expect(r).toEqual(["Very close by", "around the same time", "description matches", "same size & sex"]);
  });
  it("degrades a weak-but-shown match to a gentle default", () => {
    expect(matchReasons({ geo: 0.2, time: 0.1, breed: 0, color: 0, size_sex: 0 }))
      .toEqual(["a possible match"]);
  });
});

describe("matchStrength", () => {
  it("is a soft label, not a number", () => {
    expect(matchStrength(0.9)).toEqual({ label: "Very likely", tone: "ok" });
    expect(matchStrength(0.55)).toEqual({ label: "Possible", tone: "warn" });
  });
});
