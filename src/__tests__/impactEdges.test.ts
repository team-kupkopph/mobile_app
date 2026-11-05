/**
 * Impact & badges test plan, Run 2 (NT-3): U14, U16 and U17, the rows Run 1 could not point a test at.
 *
 * They pin behaviour that already shipped. The question each asks is what the screen does with input it should never
 * get, and the answer in every case is "an error or a sensible default, never a blank, an undefined or a crash".
 * dev/test-plan-impact-badges.md (library repo) has the rows.
 */
import { applyImpactReply, ImpactView, impactTiles, parseImpact } from "../community";
import { loadState } from "../net";
import { notificationTarget } from "../notifications";

const counts = { shifts_completed: 1, rescues_helped: 0, pets_rehomed: 0, pledges_delivered: 0 };
const empty: ImpactView = { data: null, res: null };

describe("U14 · the four tiles", () => {
  it("draws a value for every tile at 0, and at a count far past any badge", () => {
    for (const n of [0, 10000]) {
      const tiles = impactTiles({ ...counts, shifts_completed: n });
      expect(tiles).toHaveLength(4);
      expect(tiles.every((t) => typeof t.value === "number" && Number.isFinite(t.value))).toBe(true);
      expect(tiles[0].value).toBe(n);
    }
  });

  it.each([
    ["a missing count", { ...counts, pledges_delivered: undefined }],
    ["a null count", { ...counts, shifts_completed: null }],
    ["a count that is a string", { ...counts, shifts_completed: "3" }],
    ["a negative count", { ...counts, shifts_completed: -2 }],
    ["a count that is NaN", { ...counts, shifts_completed: NaN }]
  ])("a screen never gets tiles from %s: the whole answer is invalid, so the error state shows", (_name, impact) => {
    expect(parseImpact({ impact, badges: [] })).toBeNull();
  });

  it("found the answer it is checking: the same payload with real counts parses and has four tiles", () => {
    const answer = parseImpact({ impact: counts, badges: [] });
    expect(answer).not.toBeNull();
    expect(impactTiles(answer!.impact)).toHaveLength(4);
  });
});

describe("U16 · what each failed load becomes on My impact", () => {
  const stateFor = (status: number) => loadState(applyImpactReply(empty, { ok: false, status, data: null }).res);

  it.each([
    [0, "offline"],
    [403, "gone"],
    [404, "gone"],
    [500, "error"],
    [503, "error"]
  ])("status %i with nothing held is %s", (status, kind) => {
    expect(stateFor(status).kind).toBe(kind);
  });

  it("a 401 is an error that offers no retry: the session flow (the client signing out, then the guard) takes over, not this screen", () => {
    expect(stateFor(401)).toEqual({ kind: "error", retryable: false });
  });

  it("a server error and an outage offer a retry; a missing page does not", () => {
    expect(stateFor(500)).toEqual({ kind: "error", retryable: true });
    expect(stateFor(404).kind).toBe("gone");
  });

  it("a 200 with no badges list is an error (502), never a ready screen with nothing on it", () => {
    const view = applyImpactReply(empty, { ok: true, status: 200, data: { impact: counts } });
    expect(view.data).toBeNull();
    expect(loadState(view.res)).toEqual({ kind: "error", retryable: true });
  });
});

describe("U17 · tapping a badge notice", () => {
  it.each([
    ["no payload at all", null],
    ["an empty payload", {}],
    ["a payload with no badge_code", { something: "else" }],
    ["a badge_code no badge has", { badge_code: "not_a_real_badge" }],
    ["a real badge_code", { badge_code: "first_shift" }]
  ])("opens My impact for %s, and never throws", (_name, data) => {
    expect(notificationTarget({ type: "badge_earned", data })).toEqual({ screen: "impact" });
  });
});
