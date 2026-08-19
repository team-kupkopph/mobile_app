import { relTime, sagipTitle, strayChip } from "../sagip";

describe("strayChip (only unclaimed is amber — the app's 'someone must act' colour)", () => {
  it("maps each status to a labelled tone", () => {
    expect(strayChip("reported")).toEqual({ label: "Reported", tone: "amber" });
    expect(strayChip("claimed")).toEqual({ label: "Claimed", tone: "teal" });
    expect(strayChip("rescued").tone).toBe("green");
    expect(strayChip("safe").tone).toBe("green");
    expect(strayChip("resolved").tone).toBe("grey");
  });
});

describe("sagipTitle", () => {
  it("formats species and condition into the card title", () => {
    expect(sagipTitle("dog", "injured")).toBe("Dog · Injured");
    expect(sagipTitle("cat", "pregnant")).toBe("Cat · Pregnant");
  });
});

describe("relTime", () => {
  const now = new Date("2026-08-15T10:00:00Z").getTime();
  it("formats minutes, hours, and just-now", () => {
    expect(relTime("2026-08-15T09:40:00Z", now)).toBe("20 min ago");
    expect(relTime("2026-08-15T07:00:00Z", now)).toBe("3 h ago");
    expect(relTime("2026-08-15T09:59:40Z", now)).toBe("just now");
  });
});
