import {
  needProgressFraction, needProgressLabel, needStatusChip, pledgeIsCancellable,
  pledgeStatusChip
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
