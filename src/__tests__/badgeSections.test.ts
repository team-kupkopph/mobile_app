/**
 * V7 / IB15 / V8 · how the impact screen groups, words and labels the catalog it is given.
 *
 * The server sends every badge in catalog order, each with `earned` and a `progress` of
 * {current, target}. What the person sees (the near-win card, the earned trophies, the rest to
 * go for) is decided here, as pure functions, so it can be held to the edge cases without a
 * renderer: the repo has none, and a screen test that needed one would not be written.
 */
import {
  ALMOST_THERE_AT, almostThere, badgeA11yLabel, badgeSections, BadgeShape, earnedDate, progressFraction, progressLabel
} from "../community";

const badge = (code: string, over: Partial<BadgeShape> = {}): BadgeShape => ({
  badge_code: code, name: code, description: "", icon: "", criteria: `criteria of ${code}`,
  earned: false, earned_at: null, progress: null, ...over
});
const prog = (current: number, target: number) => ({ current, target });

describe("progressFraction", () => {
  it("is current over target", () => expect(progressFraction(prog(8, 10))).toBeCloseTo(0.8));
  it("is 0 at the start", () => expect(progressFraction(prog(0, 10))).toBe(0));
  it("never passes 1: a held badge whose stat is past the target still draws a full bar", () =>
    expect(progressFraction(prog(25, 10))).toBe(1));
  it("is 0 for a nonsense target, not NaN or Infinity", () => {
    expect(progressFraction(prog(3, 0))).toBe(0);
    expect(progressFraction(prog(3, -1))).toBe(0);
  });
  it("is 0 for a negative current", () => expect(progressFraction(prog(-2, 10))).toBe(0));
  it("is 0 when there is no progress at all", () => {
    expect(progressFraction(null)).toBe(0);
    expect(progressFraction(undefined)).toBe(0);
  });
});

describe("progressLabel", () => {
  it("cheers when it is close, in the mockup's words", () =>
    expect(progressLabel(prog(8, 10), true)).toBe("8 of 10 — just 2 more to go!"));
  it("says 'just 1 more' in the singular", () =>
    expect(progressLabel(prog(9, 10), true)).toBe("9 of 10 — just 1 more to go!"));
  it("is plain when it is far, so it never cheers 'just 49 more'", () =>
    expect(progressLabel(prog(1, 50), false)).toBe("1 of 50"));
  it("is plain when there is no progress to report yet", () =>
    expect(progressLabel(prog(0, 10), false)).toBe("0 of 10"));
  it("never reports more than the target", () =>
    expect(progressLabel(prog(12, 10), false)).toBe("10 of 10"));
  it("is empty without progress or with a nonsense target", () => {
    expect(progressLabel(null, true)).toBe("");
    expect(progressLabel(prog(3, 0), true)).toBe("");
  });
});

describe("almostThere", () => {
  it("is the unearned badge furthest along, once it is past the line", () => {
    const list = [badge("a", { progress: prog(5, 10) }), badge("b", { progress: prog(8, 10) })];
    expect(almostThere(list)?.badge_code).toBe("b");
  });
  it("is nobody when nothing is past the line: 1 of 50 is not 'almost there'", () =>
    expect(almostThere([badge("a", { progress: prog(1, 50) })])).toBeNull());
  it("includes the line itself", () => {
    const at = badge("a", { progress: prog(ALMOST_THERE_AT * 10, 10) });
    expect(almostThere([at])?.badge_code).toBe("a");
  });
  it("just under the line is not almost there", () =>
    expect(almostThere([badge("a", { progress: prog(ALMOST_THERE_AT * 10 - 1, 10) })])).toBeNull());
  it("never picks an earned badge", () =>
    expect(almostThere([badge("a", { earned: true, progress: prog(9, 10) })])).toBeNull());
  it("never picks one that has already reached its target", () =>
    expect(almostThere([badge("a", { progress: prog(10, 10) })])).toBeNull());
  it("ignores a badge with no progress", () => expect(almostThere([badge("a")])).toBeNull());
  it("breaks a tie in catalog order", () => {
    const list = [badge("first", { progress: prog(8, 10) }), badge("second", { progress: prog(4, 5) })];
    expect(almostThere(list)?.badge_code).toBe("first");
  });
  it("is nobody for an empty catalog", () => expect(almostThere([])).toBeNull());
});

describe("badgeSections", () => {
  const catalog = [
    badge("first_shift", { earned: true, earned_at: "2026-11-01T00:00:00Z", progress: prog(8, 1) }),
    badge("shifts_10", { progress: prog(8, 10) }),
    badge("shifts_50", { progress: prog(8, 50) }),
    badge("first_rescue", { progress: prog(0, 1) })
  ];

  it("puts the near-win on its own, the held ones in earned, and the rest to go for", () => {
    const s = badgeSections(catalog);
    expect(s.almostThere?.badge_code).toBe("shifts_10");
    expect(s.earned.map((b) => b.badge_code)).toEqual(["first_shift"]);
    expect(s.keepGoing.map((b) => b.badge_code)).toEqual(["shifts_50", "first_rescue"]);
  });
  it("shows every badge exactly once", () => {
    const s = badgeSections(catalog);
    const all = [...(s.almostThere ? [s.almostThere] : []), ...s.earned, ...s.keepGoing];
    expect(all.map((b) => b.badge_code).sort()).toEqual(catalog.map((b) => b.badge_code).sort());
  });
  it("keeps catalog order inside each group", () => {
    const s = badgeSections([badge("b", { earned: true }), badge("a", { earned: true })]);
    expect(s.earned.map((b) => b.badge_code)).toEqual(["b", "a"]);
  });
  it("is all keep-going for someone who has done nothing", () => {
    const s = badgeSections([badge("a", { progress: prog(0, 1) }), badge("b", { progress: prog(0, 10) })]);
    expect(s.almostThere).toBeNull();
    expect(s.earned).toEqual([]);
    expect(s.keepGoing).toHaveLength(2);
  });
  it("is all earned for someone who has everything", () => {
    const s = badgeSections([badge("a", { earned: true }), badge("b", { earned: true })]);
    expect(s.almostThere).toBeNull();
    expect(s.keepGoing).toEqual([]);
    expect(s.earned).toHaveLength(2);
  });
  it("is three empty groups for an empty catalog", () =>
    expect(badgeSections([])).toEqual({ almostThere: null, earned: [], keepGoing: [] }));
  it("a held badge counts as earned even when its stat has fallen below the target", () => {
    const s = badgeSections([badge("rehomed_1", { earned: true, progress: prog(0, 1) })]);
    expect(s.earned).toHaveLength(1);
    expect(s.almostThere).toBeNull();
  });
});

describe("earnedDate", () => {
  it("formats a real date", () => expect(earnedDate("2026-11-05T10:00:00Z")).toMatch(/2026/));
  it("is null for no date", () => {
    expect(earnedDate(null)).toBeNull();
    expect(earnedDate("")).toBeNull();
  });
  it("is null for garbage, never the words 'Invalid Date' (new Date() does not throw)", () =>
    expect(earnedDate("garbage")).toBeNull());
});

describe("badgeA11yLabel", () => {
  it("says what an earned badge is and when it was earned", () => {
    const label = badgeA11yLabel(badge("a", { name: "First Kawang-Gawa", earned: true, earned_at: "2026-11-05T10:00:00Z" }));
    expect(label).toMatch(/^First Kawang-Gawa, earned /);
    expect(label).toMatch(/2026/);
  });
  it("says an earned badge without a date is earned", () =>
    expect(badgeA11yLabel(badge("a", { name: "Rescuer", earned: true }))).toBe("Rescuer, earned"));
  it("says an unearned badge is not earned yet, never the bare name", () => {
    const label = badgeA11yLabel(badge("a", { name: "Steady Volunteer", criteria: "10 completed volunteer shifts" }));
    expect(label).toContain("not earned yet");
    expect(label).toContain("10 completed volunteer shifts");
  });
  it("adds how far along an unearned badge is", () =>
    expect(badgeA11yLabel(badge("a", { name: "Steady", progress: prog(3, 10) }))).toContain("3 of 10"));
  it("does not add progress to an earned one", () =>
    expect(badgeA11yLabel(badge("a", { earned: true, progress: prog(12, 10) }))).not.toContain("of"));
});
