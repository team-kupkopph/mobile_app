import {
  impactTiles, matchReasons, matchStrength, MAX_QTY, needActions, needProgressFraction,
  needProgressLabel, needStatusChip, overPledgeWarning, pledgeErrorCopy, pledgeIsCancellable,
  pledgeStatusChip, pledgeSubtitle, pledgeWhen, quantityLabel, receivedPreview, remainingAfter, storyTypeChip
} from "../community";

describe("pledgeStatusChip", () => {
  it("maps each pledge status to the shared chip tone", () => {
    expect(pledgeStatusChip("pledged")).toEqual({ label: "Pledged", tone: "warn" });
    expect(pledgeStatusChip("delivered")).toEqual({ label: "Delivered", tone: "ok" });
    expect(pledgeStatusChip("cancelled")).toEqual({ label: "Cancelled", tone: "muted" });
  });
  it("a cancel the shelter's closing caused reads 'Need closed', muted", () => {
    expect(pledgeStatusChip("cancelled", "need_closed")).toEqual({ label: "Need closed", tone: "muted" });
  });
  it("a donor-initiated cancel, or no reason, stays 'Cancelled'", () => {
    expect(pledgeStatusChip("cancelled", "donor")).toEqual({ label: "Cancelled", tone: "muted" });
    expect(pledgeStatusChip("cancelled", null)).toEqual({ label: "Cancelled", tone: "muted" });
  });
  it("cancel_reason only matters on a cancelled pledge", () => {
    expect(pledgeStatusChip("pledged", "need_closed")).toEqual({ label: "Pledged", tone: "warn" });
  });
});

describe("MAX_QTY", () => {
  it("mirrors the backend bound", () => {
    expect(MAX_QTY).toBe(100000);
  });
});

describe("quantityLabel", () => {
  it("appends the unit", () => {
    expect(quantityLabel(10, "kg")).toBe("10 kg");
  });
  it("is just the number with no unit", () => {
    expect(quantityLabel(3)).toBe("3");
    expect(quantityLabel(3, "")).toBe("3");
  });
});

describe("remainingAfter", () => {
  it("is needed minus received minus pledged", () => {
    expect(remainingAfter(20, 8, 5)).toBe(7);
  });
  it("is clamped at zero", () => {
    expect(remainingAfter(20, 15, 10)).toBe(0);
  });
});

describe("overPledgeWarning", () => {
  it("warns when the quantity exceeds a positive remainder", () => {
    expect(overPledgeWarning(10, 4)).toBe("They still need 4 — anything extra is welcome, but 4 covers it.");
  });
  it("is silent at or under the remainder", () => {
    expect(overPledgeWarning(4, 4)).toBeNull();
    expect(overPledgeWarning(2, 4)).toBeNull();
  });
  it("is silent when nothing remains", () => {
    expect(overPledgeWarning(5, 0)).toBeNull();
  });
});

describe("pledgeErrorCopy", () => {
  it("401 is a sign-in wall", () => {
    expect(pledgeErrorCopy(401).wall).toBe(true);
  });
  it("403 own_need", () => {
    expect(pledgeErrorCopy(403, "own_need"))
      .toEqual({ message: "You can't pledge to your own wishlist.", reload: false, wall: false });
  });
  it("404 says the wishlist is unavailable and reloads", () => {
    expect(pledgeErrorCopy(404, "not_found"))
      .toEqual({ message: "This shelter's wishlist isn't available right now.", reload: true, wall: false });
  });
  it("409 need_not_open", () => {
    expect(pledgeErrorCopy(409, "need_not_open"))
      .toEqual({ message: "This need is no longer open for pledges.", reload: true, wall: false });
  });
  it("409 pledge_decided", () => {
    expect(pledgeErrorCopy(409, "pledge_decided"))
      .toEqual({ message: "This pledge was already settled — refreshing.", reload: true, wall: false });
  });
  it("429", () => {
    expect(pledgeErrorCopy(429))
      .toEqual({ message: "You've made a lot of pledges today. Try again tomorrow.", reload: false, wall: false });
  });
  it("0 and 5xx are a connection failure", () => {
    const row = { message: "Couldn't reach Kupkop. Check your connection and try again.", reload: false, wall: false };
    expect(pledgeErrorCopy(0)).toEqual(row);
    expect(pledgeErrorCopy(500)).toEqual(row);
    expect(pledgeErrorCopy(503)).toEqual(row);
  });
});

describe("needActions", () => {
  it("open: edit, complete and receive", () => {
    expect(needActions("open")).toEqual({ edit: true, complete: true, receive: true });
  });
  it("fulfilled: receive only (late deliveries from over-pledges)", () => {
    expect(needActions("fulfilled")).toEqual({ edit: false, complete: false, receive: true });
  });
  it("closed: none", () => {
    expect(needActions("closed")).toEqual({ edit: false, complete: false, receive: false });
  });
});

describe("receivedPreview", () => {
  it("shows received before and after the add", () => {
    expect(receivedPreview(8, 20, 6, "kg")).toBe("8 → 14 of 20 kg received");
  });
  it("works without a unit", () => {
    expect(receivedPreview(8, 20, 6)).toBe("8 → 14 of 20 received");
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
  it("carries the unit", () => {
    expect(needProgressLabel(8, 20, "kg")).toBe("8 of 20 kg received");
  });
  it("adds the pledged clause only above zero", () => {
    expect(needProgressLabel(8, 20, "kg", 5)).toBe("8 of 20 kg received · 5 pledged");
    expect(needProgressLabel(8, 20, "kg", 0)).toBe("8 of 20 kg received");
    expect(needProgressLabel(8, 20, undefined, 5)).toBe("8 of 20 received · 5 pledged");
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

describe("pledgeWhen / pledgeSubtitle (My donations' second line)", () => {
  const now = new Date("2026-10-22T09:00:00");
  it("formats a date in the same month-and-day style as the rest of the app, adding the year only for another year", () => {
    expect(pledgeWhen("2026-10-05T10:00:00", now)).toMatch(/Oct\w*\.?\s+5|5\s+Oct/);
    expect(pledgeWhen("2026-10-05T10:00:00", now)).not.toContain("2026");
    expect(pledgeWhen("2025-03-05T10:00:00", now)).toContain("2025");
  });
  it("returns an empty string for a missing or unparseable date", () => {
    expect(pledgeWhen(null, now)).toBe("");
    expect(pledgeWhen(undefined, now)).toBe("");
    expect(pledgeWhen("not a date", now)).toBe("");
  });
  it("joins the shelter and the decided date, falling back to the created date", () => {
    const decided = pledgeSubtitle("Happy Paws", "2026-10-06T10:00:00", "2026-10-01T10:00:00", now);
    expect(decided.startsWith("Happy Paws · ")).toBe(true);
    expect(decided).toMatch(/6/);
    const pending = pledgeSubtitle("Happy Paws", null, "2026-10-01T10:00:00", now);
    expect(pending).toMatch(/^Happy Paws · .*1/);
  });
  it("is just the shelter when there is no date at all", () => {
    expect(pledgeSubtitle("Happy Paws", null, undefined, now)).toBe("Happy Paws");
  });
});
