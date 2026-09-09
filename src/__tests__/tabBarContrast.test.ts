// The bottom tab bar's inactive icons were #C9CEC7 on white — 1.60:1, against a 3:1 minimum for
// non-text UI. The label directly beneath each icon was 6.49:1, so the two halves of the same
// control disagreed by a factor of four: the word was legible, the glyph identifying it was
// barely there. A contrast figure is exactly the kind of thing that gets nudged back toward
// "prettier" later, so it is measured here rather than left to the eye.
//
// ⚠️ WHAT CHANGED IN US-CH1, AND WHY IT MATTERS TO THIS FILE. The previous version imported
// TAB_COLORS, SHELTER_TAB_COLORS and GUEST_TAB_COLORS — three per-file copies of the same
// palette. That is what the sprint's exit criterion 4 forbids ("asserted on tokens, not on
// per-file copies"), and for a concrete reason: the pale grey was fixed once, in one of the
// three files, and the other two kept theirs. A guard that reads three copies can only tell you
// the three copies agree with themselves. There is now ONE bar (components/ui/TabBar.tsx) that
// reads the theme, and this file asserts on the theme.
import { readFileSync } from "fs";
import { join } from "path";

import { colors } from "../theme/colors";
import { gradients } from "../theme/gradients";

type RGB = [number, number, number];

function rgb(hex: string): RGB {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
}
function luminance([r, g, b]: RGB): number {
  const ch = [r, g, b].map((v) => v / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
function contrast(a: RGB, b: RGB): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
/** Composite a translucent foreground over an opaque background — what the eye actually sees. */
function over(fg: RGB, alpha: number, bg: RGB): RGB {
  return fg.map((c, i) => c * alpha + bg[i] * (1 - alpha)) as RGB;
}

/**
 * ⚠️ THE BAR IS NOT WHITE, AND TESTING IT AS WHITE IS THE MISTAKE THIS CONSTANT PREVENTS.
 *
 * The bar is `colors.glass` — white at 0.72 — floating over the mesh backdrop, and the backdrop's
 * STRONGEST colour was deliberately put underneath it. From design/mobile-v3/gen-backdrop.mjs:
 * "the strongest colour, held BELOW y=0.90 so it sits behind the floating tab bar (y 758-826 of
 * 844) and never reaches the band where body copy is read."
 *
 * So the icon's real background is glass composited over that dark teal region, not #FFFFFF. This
 * value is the darkest point the backdrop reaches under the bar, re-derived by re-running that
 * generator's own blob parameters over the bar's rectangle (x 16-374, y 760-828 of 390x844) and
 * taking the minimum — the same method, and the same limitation, as backdropContrast.test.ts:
 * if the asset is regenerated darker this constant is stale. The generator is seeded and
 * reproducible, so re-deriving it is a re-run, not a guess.
 */
const WORST_CASE_UNDER_BAR = rgb("#889691");
const GLASS_ALPHA = 0.72;
const BAR_SURFACE = over(rgb("#FFFFFF"), GLASS_ALPHA, WORST_CASE_UNDER_BAR);

/** WCAG 1.4.11: non-text content that conveys meaning needs 3:1. A tab icon is the only thing
 *  distinguishing one tab from another at a glance, so it plainly conveys meaning. */
const MIN_NON_TEXT = 3;
const BODY_TEXT = 4.5;

/** The three files that draw a bar. None of them may carry a colour of its own. */
const BAR_SOURCES = [
  "../components/ui/TabBar.tsx",
  "../components/OwnerTabs.tsx",
  "../components/ShelterTabs.tsx"
];

describe("bottom tab bar contrast", () => {
  // Guard the guard: assert the composite is actually darker than white, so a typo that left
  // BAR_SURFACE white would not quietly turn every assertion below into the old, weaker test.
  it("is measuring the glass composite, not white", () => {
    expect(luminance(BAR_SURFACE)).toBeLessThan(luminance(rgb("#FFFFFF")));
    expect(contrast(rgb(colors.tabInactive), BAR_SURFACE)).toBeLessThan(
      contrast(rgb(colors.tabInactive), rgb("#FFFFFF"))
    );
  });

  it("makes the inactive icon visible on the glass bar over the backdrop's darkest point", () => {
    expect(contrast(rgb(colors.tabInactive), BAR_SURFACE)).toBeGreaterThanOrEqual(MIN_NON_TEXT);
  });

  it("makes the inactive icon visible on a plain white bar too", () => {
    // The bar can also land over a light region of the backdrop; both ends must hold.
    expect(contrast(rgb(colors.tabInactive), rgb(colors.white))).toBeGreaterThanOrEqual(MIN_NON_TEXT);
  });

  it("draws icon and label in the same colour, as one control", () => {
    // Not merely "both pass" — a glyph noticeably fainter than the word under it is what the
    // original bug looked like, and two separately-passing values can drift back into it.
    // TabBar uses `colors.tabInactive` for both; this pins the token they share.
    expect(colors.tabInactive).toBe(colors.muted);
  });

  it("keeps the active icon legible on its tinted pill", () => {
    // The pill is an opaque gradient, so it does not depend on the backdrop. Both stops.
    gradients.activeTab.forEach((stop) => {
      expect(contrast(rgb(colors.teal), rgb(stop))).toBeGreaterThanOrEqual(MIN_NON_TEXT);
    });
  });

  it("keeps the active label legible on its tinted pill", () => {
    // The label carries words, so it owes 4.5:1, not 3:1.
    gradients.activeTab.forEach((stop) => {
      expect(contrast(rgb(colors.tealDark), rgb(stop))).toBeGreaterThanOrEqual(BODY_TEXT);
    });
  });

  /**
   * ⚠️ The assertion that makes all the others mean something. Every one above reads a TOKEN; if
   * a bar could still hard-code a hex, they would prove nothing about what renders. This is the
   * regression that actually happened: three bars, three private palettes, one of them fixed.
   */
  it("leaves no bar with a colour of its own", () => {
    const offenders: string[] = [];
    for (const rel of BAR_SOURCES) {
      const src = readFileSync(join(__dirname, rel), "utf8");
      // Strip comments first — the docstrings quote the historical hexes on purpose.
      const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      const hexes = code.match(/#[0-9A-Fa-f]{6}\b/g);
      if (hexes) offenders.push(`${rel}: ${hexes.join(", ")}`);
    }
    expect(offenders).toEqual([]);
  });

  it("is actually reading the bar sources", () => {
    // Guard the guard: a wrong path would make the scan above vacuously green.
    BAR_SOURCES.forEach((rel) => {
      expect(readFileSync(join(__dirname, rel), "utf8").length).toBeGreaterThan(200);
    });
  });
});
