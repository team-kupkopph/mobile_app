/**
 * IB6 · what My impact does when it is looked at again.
 *
 * It used to blank its data (`setRes(null)`) on EVERY focus, so coming back from a badge's detail swapped the whole
 * grid for a spinner, and a refresh that failed left the old tiles above an error with nothing saying which was which.
 * Now: a screen that holds data keeps showing it while it refreshes; a refresh that fails keeps that data and says so
 * (the stale banner); only a screen with nothing to show gets a spinner or an error. A slow older answer never lands
 * over a newer one (createLatestOnly, held by the source guard in impactBadgesAccessibility.test.ts).
 *
 * The decisions are pure functions so they can be held to their edges without a renderer.
 */
import { applyImpactReply, beginImpactLoad, ImpactView, impactIsStale, parseImpact } from "../community";

const counts = { shifts_completed: 8, rescues_helped: 1, pets_rehomed: 0, pledges_delivered: 0 };
const badge = (code: string, over: Record<string, unknown> = {}) => ({
  badge_code: code, name: code, description: "", icon: "", criteria: `c ${code}`, earned: false, earned_at: null, progress: null, ...over
});
const good = (...codes: string[]) => ({ ok: true, status: 200, data: { impact: counts, badges: codes.map((c) => badge(c)) } });
const empty: ImpactView = { data: null, res: null };
const held = (...codes: string[]): ImpactView => applyImpactReply(empty, good(...codes));

describe("applyImpactReply: a good answer", () => {
  it("fills an empty screen", () => {
    const v = applyImpactReply(empty, good("a", "b"));
    expect(v.data?.badges.map((b) => b.badge_code)).toEqual(["a", "b"]);
    expect(v.res).toEqual({ ok: true, status: 200 });
  });
  it("replaces what it held, with the newer answer", () => {
    const v = applyImpactReply(held("a"), good("a", "b", "c"));
    expect(v.data?.badges).toHaveLength(3);
  });
  it("clears a failure that was showing", () => {
    const failed = applyImpactReply(held("a"), { ok: false, status: 0, data: {} });
    expect(impactIsStale(failed)).toBe(true);
    expect(impactIsStale(applyImpactReply(failed, good("a")))).toBe(false);
  });
  it("accepts an answer with no badges: that is an answer, not a failure", () => {
    const v = applyImpactReply(empty, good());
    expect(v.data?.badges).toEqual([]);
    expect(v.res?.ok).toBe(true);
  });
});

describe("applyImpactReply: a failed refresh keeps what the screen held", () => {
  it.each([[0, "offline"], [500, "a server error"], [503, "unavailable"], [504, "a gateway timeout"]])(
    "keeps the data on a %i (%s), and marks the screen stale", (status) => {
      const before = held("a", "b");
      const v = applyImpactReply(before, { ok: false, status, data: {} });
      expect(v.data).toBe(before.data);                 // the same answer, not a copy and not cleared
      expect(v.res).toEqual({ ok: false, status });
      expect(impactIsStale(v)).toBe(true);
    });
  it("keeps the data when a 200 breaks the contract, and calls it a server fault (502)", () => {
    const before = held("a");
    const v = applyImpactReply(before, { ok: true, status: 200, data: { impact: counts, badges: null } });
    expect(v.data).toBe(before.data);
    expect(v.res).toEqual({ ok: false, status: 502 });
    expect(impactIsStale(v)).toBe(true);
  });
  it("keeps the data through two failures in a row", () => {
    const before = held("a");
    const once = applyImpactReply(before, { ok: false, status: 0, data: {} });
    const twice = applyImpactReply(once, { ok: false, status: 500, data: {} });
    expect(twice.data).toBe(before.data);
    expect(twice.res).toEqual({ ok: false, status: 500 });
  });
  it("never keeps a broken answer: the data held is still the last GOOD one", () => {
    const before = held("a");
    const v = applyImpactReply(before, { ok: true, status: 200, data: { impact: counts, badges: [badge("x", { earned: "yes" })] } });
    expect(v.data?.badges.map((b) => b.badge_code)).toEqual(["a"]);
  });
});

describe("applyImpactReply: a failure with nothing held is a failure, not a stale screen", () => {
  it("leaves no data and says why", () => {
    const v = applyImpactReply(empty, { ok: false, status: 0, data: {} });
    expect(v.data).toBeNull();
    expect(v.res).toEqual({ ok: false, status: 0 });
    expect(impactIsStale(v)).toBe(false);               // nothing to be stale: the full-screen error shows instead
  });
  it("reads a broken 200 as a 502 with no data", () => {
    const v = applyImpactReply(empty, { ok: true, status: 200, data: "<html>" });
    expect(v.data).toBeNull();
    expect(v.res).toEqual({ ok: false, status: 502 });
  });
});

describe("beginImpactLoad: what starting a load does to what is on screen", () => {
  it("leaves a screen that holds data exactly as it is: no spinner on a refocus", () => {
    const before = held("a");
    expect(beginImpactLoad(before)).toBe(before);
  });
  it("leaves a stale screen as it is too: the banner stays until the answer", () => {
    const stale = applyImpactReply(held("a"), { ok: false, status: 0, data: {} });
    expect(beginImpactLoad(stale)).toBe(stale);
  });
  it("shows a spinner for a screen with nothing: res goes back to null (loading)", () => {
    const failed = applyImpactReply(empty, { ok: false, status: 0, data: {} });
    expect(beginImpactLoad(failed)).toEqual({ data: null, res: null });
  });
  it("is a no-op on a fresh screen", () => expect(beginImpactLoad(empty)).toEqual(empty));
});

describe("impactIsStale", () => {
  it("is false while loading, after a success, and with nothing held", () => {
    expect(impactIsStale(empty)).toBe(false);
    expect(impactIsStale(held("a"))).toBe(false);
    expect(impactIsStale({ data: null, res: { ok: false, status: 500 } })).toBe(false);
  });
  it("is true only when data is held AND the latest answer failed", () =>
    expect(impactIsStale({ data: parseImpact(good("a").data), res: { ok: false, status: 0 } })).toBe(true));
});
