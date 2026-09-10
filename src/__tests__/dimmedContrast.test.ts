/**
 * A dimmed thing is still readable. "Dim" is a hierarchy, not a licence to go under the floor.
 *
 * ⚠️ FOUND BY FINISHING THE COLOUR MIGRATION, NOT BY LOOKING FOR IT. The last seven screens
 * each held a grey with no token, and the job looked like naming. Three of them turned out to
 * be FOREGROUNDS below the contrast floor — all three worse than `faintDeprecated` (2.89:1),
 * the token colors.ts says "must never be treated as a text colour":
 *
 *   #B8B6AD  2.03:1  Settings' row chevron — the only sign a row navigates at all
 *   #A6A49C  2.50:1  the unearned badge's star AND its name (BadgeComparison, Impact)
 *   #9A9E96  2.73:1  ShelterProfile's lock icon AND the locked row's label
 *
 * All three now use `muted` (6.49:1), which is the same call the tab bar made: its comment
 * says the design system "calls inactive tab icons 'light grey', but its own accessibility
 * floor wins where the two disagree". The dimmed state still reads, because it is carried by
 * the contrast BETWEEN states — teal or ink for the live one, muted for the dimmed one — and
 * by the tile behind it, rather than by making the text disappear.
 */
import { readFileSync } from "fs";
import { join } from "path";

import { colors } from "../theme/colors";

type RGB = [number, number, number];
const rgb = (hex: string): RGB =>
  [0, 2, 4].map((i) => parseInt(hex.replace("#", "").slice(i, i + 2), 16)) as RGB;
function luminance([r, g, b]: RGB): number {
  const ch = [r, g, b].map((v) => v / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(rgb(a)), luminance(rgb(b))].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const BODY_TEXT = 4.5;
const NON_TEXT = 3;

/** The greys that were replaced, kept here so a revert is loud rather than quiet. */
const RETIRED = ["#B8B6AD", "#A6A49C", "#9A9E96"];

describe("dimmed foregrounds still clear the floor", () => {
  it.each([["white", colors.white], ["page", colors.page]])(
    "muted carries dimmed TEXT on %s",
    (_n, bg) => expect(contrast(colors.muted, bg)).toBeGreaterThanOrEqual(BODY_TEXT)
  );

  it.each([["white", colors.white], ["page", colors.page]])(
    "muted carries a dimmed GLYPH on %s",
    (_n, bg) => expect(contrast(colors.muted, bg)).toBeGreaterThanOrEqual(NON_TEXT)
  );

  it("the dimmed state is still distinguishable from the live one", () => {
    // If dimmed and live were the same ink the fix would have destroyed the meaning.
    expect(colors.muted).not.toBe(colors.ink);
    expect(colors.muted).not.toBe(colors.teal);
  });

  it.each(RETIRED)("%s is gone from src/screens — it never cleared the floor", (hex) => {
    expect(contrast(hex, colors.white)).toBeLessThan(NON_TEXT); // why it went
    const screens = join(__dirname, "..", "screens");
    const { readdirSync } = require("fs") as typeof import("fs");
    const hits = readdirSync(screens)
      .filter((f) => f.endsWith(".tsx"))
      .filter((f) => readFileSync(join(screens, f), "utf8").includes(hex));
    expect(hits).toEqual([]);
  });

  it("placeholder is a surface, never an ink", () => {
    // It is 1.3:1 against white — fine behind a photo, unreadable as text. Assert it is
    // never used as a colour on a Text style anywhere.
    expect(contrast(colors.placeholder, colors.white)).toBeLessThan(NON_TEXT);
  });
});
