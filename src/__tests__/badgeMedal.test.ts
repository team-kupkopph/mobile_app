/**
 * IB8 / V4 · one medal, drawn in one place.
 *
 * The medal (the ★ in a tinted squircle, with a lock on a corner when the badge is not held) was drawn twice: a `Medal`
 * function in ImpactScreen at 56 pt and inline in BadgeDetailScreen at 108 pt, with the same rules in two places (and the
 * unearned tint a literal hex in one and a token in the other). `BadgeMedal` is the one drawing; the screens choose a size.
 * A source scan: the repo has no renderer, and the device walk is the proof.
 */
import { readFileSync } from "fs";
import { join } from "path";

const read = (rel: string) => readFileSync(join(__dirname, "..", rel), "utf-8");
const medal = read("components/BadgeMedal.tsx");
const impact = read("screens/ImpactScreen.tsx");
const detail = read("screens/BadgeDetailScreen.tsx");

describe("BadgeMedal", () => {
  it("is drawn here: the lock, the glyph, and hidden from readers (the words say whether it is held)", () => {
    expect(medal).not.toBe("");                                   // never assert on nothing
    expect(medal).toMatch(/<LockIcon\b/);
    expect(medal).toMatch(/earned \? null/);
    expect(medal).toMatch(/<Image\b/);                                // V5 · the badge's own glyph, a picture that does not scale with text
    expect(medal).toMatch(/importantForAccessibility="no-hide-descendants"/);
    expect(medal).toMatch(/accessibilityElementsHidden/);
  });

  it("has two sizes and no colour of its own", () => {
    expect(medal).toMatch(/56/);
    expect(medal).toMatch(/108/);
    expect(medal).not.toMatch(/#[0-9A-Fa-f]{3,8}\b/);
  });

  it("both screens use it and neither draws a medal of its own", () => {
    for (const src of [impact, detail]) {
      expect(src).toMatch(/import \{ BadgeMedal \} from "\.\.\/components\/BadgeMedal"/);
      expect(src).toMatch(/<BadgeMedal\b/);
      expect(src).not.toMatch(/styles\.medal/);
      expect(src).not.toMatch(/function Medal/);
      expect(src).not.toMatch(/<LockIcon\b/);
    }
  });

  it("the Impact screen draws it for the near-win, each held badge and each badge to go for", () => {
    expect((impact.match(/<BadgeMedal\b/g) ?? []).length).toBe(3);
  });
});
