/**
 * IB26 · the response from GET /me/impact is checked at the boundary, not trusted as `any`.
 *
 * `api.get` hands back `any`, so a renamed field, a null list or a count that arrived as a string was
 * read as if it were fine and drew an empty grid ("No badges yet") for someone who has badges. The server
 * promises one shape (MeImpactSerializer, held to these types by backend's test_impact_contract.py);
 * `parseImpact` checks the promise and returns null when it is broken, so the screen shows an error with a
 * retry instead.
 *
 * A malformed BADGE makes the whole answer invalid on purpose: dropping one quietly would show a grid that
 * looks complete and is not, which is the failure this exists to stop. A malformed `progress` only costs the
 * bar (it is decoration), so that badge keeps its place with progress null.
 */
import { parseImpact } from "../community";

const counts = { shifts_completed: 8, rescues_helped: 1, pets_rehomed: 0, pledges_delivered: 0 };
const badge = (over: Record<string, unknown> = {}) => ({
  badge_code: "shifts_10", name: "Steady Volunteer", description: "Completed 10 volunteer shifts", icon: "ti-walk",
  criteria: "10 completed volunteer shifts", earned: false, earned_at: null, progress: { current: 8, target: 10 }, ...over
});
const payload = (over: Record<string, unknown> = {}) => ({ impact: counts, badges: [badge()], ...over });

describe("parseImpact: a good answer", () => {
  it("returns the counts and the badges as sent", () => {
    const out = parseImpact(payload());
    expect(out?.impact).toEqual(counts);
    expect(out?.badges).toEqual([badge()]);
  });
  it("accepts no badges at all: an empty catalog is an answer", () =>
    expect(parseImpact(payload({ badges: [] }))?.badges).toEqual([]));
  it("keeps catalog order", () => {
    const out = parseImpact(payload({ badges: [badge({ badge_code: "b" }), badge({ badge_code: "a" })] }));
    expect(out?.badges.map((b) => b.badge_code)).toEqual(["b", "a"]);
  });
  it("accepts an earned badge with its date and a progress below its target (held after the stat fell)", () => {
    const earned = badge({ earned: true, earned_at: "2026-11-05T10:00:00Z", progress: { current: 0, target: 1 } });
    expect(parseImpact(payload({ badges: [earned] }))?.badges[0]).toEqual(earned);
  });
  it("accepts a badge with no rule: progress null", () =>
    expect(parseImpact(payload({ badges: [badge({ progress: null })] }))?.badges[0].progress).toBeNull());
  it("accepts blank text fields", () => {
    const out = parseImpact(payload({ badges: [badge({ description: "", icon: "", criteria: "" })] }));
    expect(out?.badges[0]).toMatchObject({ description: "", icon: "", criteria: "" });
  });
  it("accepts a count past any badge threshold", () =>
    expect(parseImpact(payload({ impact: { ...counts, shifts_completed: 100000 } }))?.impact.shifts_completed).toBe(100000));
});

describe("parseImpact: extra and loose fields", () => {
  it("ignores fields it does not know, and does not copy them", () => {
    const out = parseImpact({ ...payload(), surprise: 1, badges: [badge({ extra: "x" })] });
    expect(out).not.toHaveProperty("surprise");
    expect(out?.badges[0]).not.toHaveProperty("extra");
  });
  it("reads a missing description, icon or criteria as blank rather than failing the screen", () => {
    const out = parseImpact(payload({ badges: [badge({ description: undefined, icon: null, criteria: undefined })] }));
    expect(out?.badges[0]).toMatchObject({ description: "", icon: "", criteria: "" });
  });
  it("reads a missing or non-string earned_at as no date", () => {
    expect(parseImpact(payload({ badges: [badge({ earned: true, earned_at: undefined })] }))?.badges[0].earned_at).toBeNull();
    expect(parseImpact(payload({ badges: [badge({ earned: true, earned_at: 12345 })] }))?.badges[0].earned_at).toBeNull();
  });
  it("keeps a badge whose progress is malformed, with progress null", () => {
    for (const progress of [{ current: "8", target: 10 }, { current: 8 }, "8 of 10", [], { current: NaN, target: 10 }]) {
      const out = parseImpact(payload({ badges: [badge({ progress })] }));
      expect(out?.badges).toHaveLength(1);
      expect(out?.badges[0].progress).toBeNull();
    }
  });
  it("reads an absent progress as null", () => {
    const { progress: _p, ...noProgress } = badge();
    expect(parseImpact(payload({ badges: [noProgress] }))?.badges[0].progress).toBeNull();
  });
});

describe("parseImpact: a broken answer is null, never a smaller grid", () => {
  it.each([null, undefined, "", "ok", 42, true, [], {}])("is null for %p", (bad) =>
    expect(parseImpact(bad)).toBeNull());
  it("is null without the impact block", () => expect(parseImpact({ badges: [badge()] })).toBeNull());
  it("is null without the badges list", () => expect(parseImpact({ impact: counts })).toBeNull());
  it("is null when badges is not a list", () => {
    expect(parseImpact(payload({ badges: null }))).toBeNull();
    expect(parseImpact(payload({ badges: {} }))).toBeNull();
    expect(parseImpact(payload({ badges: "none" }))).toBeNull();
  });
  it("is null when impact is not an object", () => {
    expect(parseImpact(payload({ impact: null }))).toBeNull();
    expect(parseImpact(payload({ impact: [] }))).toBeNull();
    expect(parseImpact(payload({ impact: "8" }))).toBeNull();
  });
  it.each(["shifts_completed", "rescues_helped", "pets_rehomed", "pledges_delivered"])(
    "is null when the %s count is missing", (key) => {
      const { [key]: _gone, ...rest } = counts as Record<string, number>;
      expect(parseImpact(payload({ impact: rest }))).toBeNull();
    });
  it.each([["a string", "8"], ["NaN", NaN], ["Infinity", Infinity], ["negative", -1], ["null", null], ["a fraction", 1.5]])(
    "is null when a count is %s", (_label, value) =>
      expect(parseImpact(payload({ impact: { ...counts, shifts_completed: value } }))).toBeNull());
  it.each(["badge_code", "name"])("is null when a badge has no %s", (key) =>
    expect(parseImpact(payload({ badges: [badge({ [key]: undefined })] }))).toBeNull());
  it("is null when a badge's code or name is blank", () => {
    expect(parseImpact(payload({ badges: [badge({ badge_code: "" })] }))).toBeNull();
    expect(parseImpact(payload({ badges: [badge({ name: "" })] }))).toBeNull();
  });
  it.each([["a string", "true"], ["a number", 1], ["missing", undefined], ["null", null]])(
    "is null when earned is %s: a badge is never read as earned by guesswork", (_l, earned) =>
      expect(parseImpact(payload({ badges: [badge({ earned })] }))).toBeNull());
  it("is null when ONE badge among many is broken, so the grid is never silently shorter", () => {
    const list = [badge({ badge_code: "a" }), badge({ badge_code: "b", earned: "yes" }), badge({ badge_code: "c" })];
    expect(parseImpact(payload({ badges: list }))).toBeNull();
  });
  it("is null when a badge is not an object", () => {
    expect(parseImpact(payload({ badges: [null] }))).toBeNull();
    expect(parseImpact(payload({ badges: ["x"] }))).toBeNull();
  });
  it("is null for a duplicated badge_code, which would draw one tile twice", () =>
    expect(parseImpact(payload({ badges: [badge(), badge()] }))).toBeNull());
  it("is null for the server's error envelope", () =>
    expect(parseImpact({ error: { code: "network_error", message: "Couldn't reach the server." } })).toBeNull());
});
