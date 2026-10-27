import {
  appendNeedsPage, awaitingConfirmTag, completeNeedBody, INSTRUCTIONS_MAX, NEED_DETAILS_MAX, NEED_TITLE_MAX, NEED_UNIT_MAX, needFormErrors, needSaveError,
  liveNeedActions, needActionErrorCopy, pledgeCountLabel, impactTiles, matchReasons, matchStrength, MAX_QTY, needActions, needProgressFraction,
  CHIP_UI_TONE, cancelRefusedCopy, needPercent, needProgressLabel, needStatusChip, overPledgeWarning, pledgeErrorCopy, pledgeIsCancellable,
  pledgeStatusChip, pledgeSubtitle, pledgeWhen, quantityLabel, receivedPreview, remainingAfter, storyTypeChip, withoutError
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
  it("B2: says so when pledges already cover everything that is left (the case where the hint matters most)", () => {
    expect(overPledgeWarning(5, 0)).toBe(
      "Pledges already cover everything they still need — more is welcome, but it may not be needed.");
    expect(overPledgeWarning(1, 0)).toBe(
      "Pledges already cover everything they still need — more is welcome, but it may not be needed.");
  });
  it("is silent for a quantity of nothing", () => {
    expect(overPledgeWarning(0, 0)).toBeNull();
    expect(overPledgeWarning(0, 4)).toBeNull();
  });
});

describe("cancelRefusedCopy (B4)", () => {
  it("tells the donor a cancel hit a pledge the shelter had already settled", () => {
    expect(cancelRefusedCopy(409)).toBe("That pledge was already settled — refreshing your list.");
  });
  it("tells the donor a cancel hit a pledge that is gone", () => {
    expect(cancelRefusedCopy(404)).toBe("That pledge is no longer there — refreshing your list.");
  });
  it("has nothing to say for other failures (those get their own Alert)", () => {
    for (const s of [0, 400, 401, 429, 500]) expect(cancelRefusedCopy(s)).toBeNull();
  });
});

describe("withoutError (B6)", () => {
  it("drops only the named field's message", () => {
    const e = { title: "t", quantity: "q", description: "d" };
    expect(withoutError(e, "quantity")).toEqual({ title: "t", description: "d" });
    expect(withoutError(e, "title")).toEqual({ quantity: "q", description: "d" });
  });
  it("returns the same object when there was nothing to drop (no pointless re-render)", () => {
    const e = { title: "t" };
    expect(withoutError(e, "quantity")).toBe(e);
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
    expect(needActions("fulfilled", 0)).toEqual({ edit: false, complete: false, receive: true });
  });
  it("fulfilled with pledges still waiting: Mark complete settles them (backend#103)", () => {
    expect(needActions("fulfilled", 2)).toEqual({ edit: false, complete: true, receive: true });
  });
  it("the waiting count changes nothing on an open or closed need", () => {
    expect(needActions("open", 0)).toEqual({ edit: true, complete: true, receive: true });
    expect(needActions("closed", 3)).toEqual({ edit: false, complete: false, receive: false });
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
  // D5 (owner, 2026-10-27) · an open need is teal: on the wishlist amber means "act on this" (Pledged, "N to confirm").
  it("maps need status: open=teal, fulfilled=green, closed=grey", () => {
    expect(needStatusChip("open")).toEqual({ label: "Open", tone: "teal" });
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

describe("shelter wishlist words (Task 8)", () => {
  it("pledgeCountLabel agrees with its number", () => {
    expect(pledgeCountLabel(1)).toBe("1 pledge");
    expect(pledgeCountLabel(0)).toBe("0 pledges");
    expect(pledgeCountLabel(3)).toBe("3 pledges");
  });

  it("awaitingConfirmTag is the amber row tag, and nothing at 0", () => {
    expect(awaitingConfirmTag(0)).toBeNull();
    expect(awaitingConfirmTag(undefined)).toBeNull();
    expect(awaitingConfirmTag(1)).toBe("1 to confirm");
    expect(awaitingConfirmTag(4)).toBe("4 to confirm");
  });

  it("completeNeedBody always says it leaves the wishlist, and adds the cancel line only when pledges are open", () => {
    const base = "It comes off your wishlist — donors can no longer pledge to it.";
    expect(completeNeedBody(0)).toBe(base);
    expect(completeNeedBody(undefined)).toBe(base);
    expect(completeNeedBody(1)).toBe(`${base} 1 open pledge will be cancelled and the donor told.`);
    expect(completeNeedBody(3)).toBe(`${base} 3 open pledges will be cancelled and the donors told.`);
  });

  it("completeNeedBody on a fulfilled need says it already has everything and only the waiting pledges go", () => {
    const base = "It already has everything it asked for, and stays marked fulfilled.";
    expect(completeNeedBody(1, "fulfilled")).toBe(`${base} 1 pledge still waiting will be cancelled and the donor told.`);
    expect(completeNeedBody(2, "fulfilled")).toBe(`${base} 2 pledges still waiting will be cancelled and the donors told.`);
    expect(completeNeedBody(0, "fulfilled")).toBe(base);
  });
});

describe("needFormErrors (AW20 · each error under its own field)", () => {
  const ok = { title: "Dog food", description: "Dry, adult", qty: 5 };
  it("bounds mirror the backend", () => {
    expect(NEED_TITLE_MAX).toBe(120);
    expect(NEED_DETAILS_MAX).toBe(1000);
    expect(NEED_UNIT_MAX).toBe(16);
    expect(INSTRUCTIONS_MAX).toBe(500);
  });
  it("a valid form has no errors", () => {
    expect(needFormErrors(ok)).toEqual({});
  });
  it("a blank title, an over-long title, over-long details and a bad quantity each land on their own field", () => {
    expect(needFormErrors({ ...ok, title: "   " })).toEqual({ title: "Give the need a short title." });
    expect(needFormErrors({ ...ok, title: "x".repeat(121) }).title).toMatch(/120/);
    expect(needFormErrors({ ...ok, title: "x".repeat(120) })).toEqual({});
    expect(needFormErrors({ ...ok, description: "y".repeat(1001) }).description).toMatch(/1000/);
    expect(needFormErrors({ ...ok, description: "y".repeat(1000) })).toEqual({});
    expect(needFormErrors({ ...ok, qty: 0 }).quantity).toMatch(/1/);
    expect(needFormErrors({ ...ok, qty: MAX_QTY + 1 }).quantity).toMatch(/100000/);
    expect(needFormErrors({ ...ok, qty: MAX_QTY })).toEqual({});
    expect(needFormErrors({ ...ok, qty: 1 })).toEqual({});
    expect(Object.keys(needFormErrors({ title: "", description: "y".repeat(1001), qty: 0 })).sort())
      .toEqual(["description", "quantity", "title"]);
  });
});

describe("needSaveError (the words for a failed save)", () => {
  it("422 below_received goes under the quantity, with the received count", () => {
    expect(needSaveError(422, "below_received", { quantity_received: 8 }))
      .toEqual({ field: "quantity", message: "8 already received — the target can't go lower." });
  });
  it("409 need_not_open says the need is no longer open", () => {
    const e = needSaveError(409, "need_not_open");
    expect(e.field).toBe("form");
    expect(e.message).toMatch(/no longer open/);
  });
  it("400 bad_category is a form-level message", () => {
    expect(needSaveError(400, "bad_category").field).toBe("form");
  });
  it("a network or server failure says so; anything else keeps the generic line", () => {
    expect(needSaveError(0).message).toMatch(/Couldn't reach Kupkop/);
    expect(needSaveError(503).message).toMatch(/Couldn't reach Kupkop/);
    expect(needSaveError(400, "weird")).toEqual({ field: "form", message: "Couldn't save. Please try again." });
  });
});

describe("needActionErrorCopy (confirm received / mark complete)", () => {
  it("a 409 or 404 means the screen is stale: say so and reload, never 'couldn't confirm'", () => {
    expect(needActionErrorCopy(409, "pledge_decided")).toEqual({ message: "That pledge was already settled — refreshing.", reload: true });
    expect(needActionErrorCopy(409, "need_not_open").reload).toBe(true);
    expect(needActionErrorCopy(404).reload).toBe(true);
  });
  it("total_overflow is a 422 the shelter can fix, so no reload", () => {
    const e = needActionErrorCopy(422, "total_overflow");
    expect(e.reload).toBe(false);
    expect(e.message).toMatch(/limit/);
  });
  it("a dropped connection or a server error says so; the rest is generic", () => {
    expect(needActionErrorCopy(0).message).toMatch(/Couldn't reach Kupkop/);
    expect(needActionErrorCopy(500).message).toMatch(/Couldn't reach Kupkop/);
    expect(needActionErrorCopy(400)).toEqual({ message: "Couldn't save that. Please try again.", reload: false });
  });
});

describe("liveNeedActions (a placeholder or a stale need grants nothing)", () => {
  const none = { edit: false, complete: false, receive: false };
  it("follows needActions once the need has loaded", () => {
    expect(liveNeedActions("ready", "open")).toEqual({ edit: true, complete: true, receive: true });
    expect(liveNeedActions("ready", "fulfilled")).toEqual({ edit: false, complete: false, receive: true });
    expect(liveNeedActions("ready", "closed")).toEqual(none);
    expect(liveNeedActions("ready", "fulfilled", 1)).toEqual({ edit: false, complete: true, receive: true });
  });
  it.each(["loading", "offline", "error", "gone", "empty"])("grants nothing while the need is %s, whatever the status it last showed", (kind) => {
    expect(liveNeedActions(kind, "open")).toEqual(none);
    expect(liveNeedActions(kind, "fulfilled")).toEqual(none);
    expect(liveNeedActions(kind, "fulfilled", 2)).toEqual(none);
  });
});

describe("appendNeedsPage (DW-N4 · the donor wishlist's Load more)", () => {
  const n = (id: string) => ({ need_id: id, title: id });
  it("appends the next page after the rows already shown", () => {
    expect(appendNeedsPage([n("a"), n("b")], [n("c")]).map((x) => x.need_id)).toEqual(["a", "b", "c"]);
  });
  it("drops a row the first page already showed (a need posted between the fetches shifts the pages)", () => {
    expect(appendNeedsPage([n("a"), n("b")], [n("b"), n("c")]).map((x) => x.need_id)).toEqual(["a", "b", "c"]);
  });
  it("starts from nothing when nothing is shown yet", () => {
    expect(appendNeedsPage(null, [n("a")]).map((x) => x.need_id)).toEqual(["a"]);
  });
});

describe("CHIP_UI_TONE (D5)", () => {
  it("draws an open need with the shared teal `info` tone, and the rest as before", () => {
    expect(CHIP_UI_TONE).toEqual({ ok: "success", warn: "warning", muted: "neutral", teal: "info" });
  });
  it("is the one map: no wishlist screen keeps its own copy", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { readFileSync } = require("fs") as typeof import("fs");
    const screens = ["ShelterNeedsScreen", "NeedPledgesScreen", "ShelterDonateScreen", "MyDonationsScreen"];
    for (const name of screens) {
      const src = readFileSync(`${__dirname}/../screens/${name}.tsx`, "utf8");
      expect(src).toMatch(/CHIP_UI_TONE\[/);
      expect(src).not.toMatch(/const CHIP_TONE\b/);
    }
  });
});

describe("needPercent (D4)", () => {
  it("rounds the received share of the target, like the artboard (5 of 8 → 63)", () => {
    expect(needPercent(5, 8)).toBe(63);
    expect(needPercent(3, 10)).toBe(30);
  });
  it("reads 100 only once the target is met, and never more", () => {
    expect(needPercent(8, 8)).toBe(100);
    expect(needPercent(9, 8)).toBe(100);
    expect(needPercent(199, 200)).toBe(99);
  });
  it("reads 0 only when nothing has arrived", () => {
    expect(needPercent(0, 8)).toBe(0);
    expect(needPercent(1, 1000)).toBe(1);
  });
  it("a zero or negative target is 0, not a division by zero", () => {
    expect(needPercent(3, 0)).toBe(0);
    expect(needPercent(3, -1)).toBe(0);
  });
});
