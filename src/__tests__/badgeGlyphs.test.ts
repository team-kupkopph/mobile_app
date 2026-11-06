/**
 * V5 · a glyph per badge, and the Profile row's heart (V10). The seeded `icon` names are Tabler's (`ti-paw` and so on); each is rasterised to a white
 * mask in assets/glyphs and tinted, like paw-white.png. A badge whose icon nothing here knows (a new row, a typo, an empty string) shows the star,
 * never nothing.
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";

import { badgeGlyph, BADGE_GLYPH_NAMES } from "../badgeGlyphs";

const read = (rel: string) => readFileSync(join(__dirname, "..", rel), "utf-8");
const SEEDED = ["ti-paw", "ti-walk", "ti-shoe", "ti-heart-handshake", "ti-home-heart", "ti-award", "ti-star"];

describe("badgeGlyph", () => {
  it("knows every icon the catalog is seeded with, each with its own picture", () => {
    expect(SEEDED.length).toBeGreaterThan(0);
    const seen = new Set<unknown>();
    for (const name of SEEDED) {
      expect(BADGE_GLYPH_NAMES).toContain(name);
      seen.add(badgeGlyph(name));
    }
    expect(seen.size).toBe(SEEDED.length);
  });

  it("falls back to the star for an icon it does not know, or none", () => {
    for (const name of ["", "ti-unicorn", "paw", "  "]) expect(badgeGlyph(name)).toBe(badgeGlyph("ti-star"));
  });

  it("has a PNG on disk for every name, and the Tabler licence beside them", () => {
    for (const name of [...SEEDED, "ti-heart"]) {
      expect(existsSync(join(__dirname, "..", "..", "assets", "glyphs", `${name.replace(/^ti-/, "")}.png`))).toBe(true);
    }
    expect(existsSync(join(__dirname, "..", "..", "assets", "glyphs", "LICENSE-tabler.txt"))).toBe(true);
  });
});

describe("BadgeMedal draws the badge's own glyph", () => {
  const medal = read("components/BadgeMedal.tsx");
  const impact = read("screens/ImpactScreen.tsx");
  const detail = read("screens/BadgeDetailScreen.tsx");

  it("an image tinted for held or not held, no ★ drawn as text", () => {
    expect(medal).toMatch(/<Image\b/);
    expect(medal).toMatch(/badgeGlyph\(icon\)/);
    expect(medal).toMatch(/tintColor/);
    expect(medal).not.toMatch(/★/);
  });

  it("every medal the screens draw is told which badge it is", () => {
    expect((impact.match(/<BadgeMedal\b[^>]*icon=\{/g) ?? []).length).toBe(3);
    expect(detail).toMatch(/<BadgeMedal\b[^>]*icon=\{badge\.icon\}/);
  });
});

describe("V10 · the Profile row has its heart", () => {
  const profile = read("screens/ProfileScreen.tsx");
  it("a heart image beside 'My impact', hidden from readers", () => {
    expect(profile).toMatch(/glyphs\/heart\.png/);
    expect(profile).toMatch(/testID="icon\.profile\.impact"/);
  });
  it("is dropped at large text, so the wrapped hint keeps its width and the row lines up (walked at AX5)", () => {
    expect(profile).toMatch(/\{large \? null : \(\s*<Image source=\{heartGlyph\}/);
  });
});
