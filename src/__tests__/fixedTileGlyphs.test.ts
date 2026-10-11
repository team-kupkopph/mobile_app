/**
 * R6-F5 · AX-1 — At Dynamic Type accessibility-extra-extra-extra-large (AX5) two glyphs that live
 * inside fixed-size shapes were lost: the back button's "‹" showed as a blank white circle, and the
 * Avatar's initials were cropped to "R/" (Run 6 part 2, and again in part 3 after the Button and
 * Chip fixes). Both are text inside fixed geometry: the back button is a 44 pt circle (the minimum
 * touch target, so it cannot grow), the avatar a fixed squircle with `overflow: "hidden"` whose
 * letters are sized at 0.33 × the tile. Dynamic Type scales the text but not its container, so at
 * AX5 the glyph no longer fits in the shape it is drawn in.
 *
 * The fix is that these glyphs do not scale (`allowFontScaling={false}`). Everything around them,
 * the title, the names, the chips, still scales. A source scan in the style of
 * buttonDynamicType.test.ts; the device walk is still the proof.
 */
import { readFileSync } from "fs";
import { join } from "path";

const read = (...p: string[]) => readFileSync(join(__dirname, "..", ...p), "utf-8");
const header = read("components", "ui", "ScreenHeader.tsx");
const avatar = read("components", "ui", "Avatar.tsx");

/** Every opening `<Text …>` tag in `src` whose attributes mention `needle`. */
function textTags(src: string, needle: string): string[] {
  return (src.match(/<Text\b[^>]*>/gs) ?? []).filter((t) => t.includes(needle));
}

describe("the back button's glyph does not outgrow its 44 pt circle (R6-F5)", () => {
  it("the scan found what it is scanning", () => {
    expect(textTags(header, "styles.backGlyph")).toHaveLength(1);
    expect(header).toContain("BACK_BUTTON_SIZE = 44");
  });
  it("the glyph does not scale with Dynamic Type", () => {
    expect(textTags(header, "styles.backGlyph")[0]).toMatch(/allowFontScaling=\{false\}/);
  });
  it("the title next to it still scales (only the glyph is pinned)", () => {
    expect(textTags(header, "styles.title")[0]).not.toMatch(/allowFontScaling/);
  });
});

describe("the avatar's initials do not outgrow their tile (R6-F5)", () => {
  it("the scan found what it is scanning: one Text per branch, tinted and flat", () => {
    expect(textTags(avatar, "styles.initials")).toHaveLength(2);
    expect(avatar).toContain('overflow: "hidden"');
  });
  it("both initials Text nodes do not scale with Dynamic Type", () => {
    for (const tag of textTags(avatar, "styles.initials")) {
      expect(tag).toMatch(/allowFontScaling=\{false\}/);
    }
  });
});
