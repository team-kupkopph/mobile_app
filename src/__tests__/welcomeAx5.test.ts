/**
 * R6-F6 (second half) — Stacking the social pills at AX5 (socialSignInDynamicType.test.ts) made the
 * Welcome sheet taller than the screen. The hero is `flex: 1` and shrinks to nothing, the sheet has no
 * scroll, so on the device "Get started" was pushed up under the status bar and the Dynamic Island.
 * At a large font scale the content has to scroll. Default size keeps the tree it has today.
 *
 * A source scan in the style of buttonDynamicType.test.ts; the device walk is still the proof.
 */
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(__dirname, "..", "WelcomeScreen.tsx"), "utf-8");

function styleBody(name: string): string | null {
  const m = new RegExp(`(?:^|\\s)${name}\\s*:\\s*\\{([^{}]*)\\}`, "m").exec(src);
  return m ? m[1] : null;
}

describe("Welcome scrolls at a large font scale (R6-F6)", () => {
  it("the scan found what it is scanning", () => {
    expect(src).toContain('testID="screen.welcome"');
    expect(src).toContain('testID="btn.welcome.getStarted"');
    expect(styleBody("hero")).toContain("overflow");
  });

  it("imports ScrollView and reads the font scale", () => {
    expect(src).toMatch(/import\s*\{[^}]*\bScrollView\b[^}]*\}\s*from\s*"react-native"/);
    expect(src).toMatch(/useWindowDimensions/);
    expect(src).toMatch(/\bfontScale\b/);
    expect(src).toMatch(/const\s+large\s*=/);
  });

  it("wraps the hero and the sheet in a ScrollView only when large", () => {
    const gate = src.indexOf("large ? (");
    const scroll = src.indexOf("<ScrollView");
    expect(gate).toBeGreaterThan(-1);
    expect(scroll).toBeGreaterThan(gate);
    expect(src).toMatch(/\)\s*:\s*body\b/);
  });

  it("the scroll content grows to the screen, so the sheet still sits at the bottom of a short page", () => {
    expect(src).toMatch(/contentContainerStyle=\{styles\.scrollContent\}/);
    expect(styleBody("scrollContent")).toMatch(/flexGrow\s*:\s*1/);
  });

  it("the hero sizes to its content when large, instead of stretching (flex: 1) inside the scroll view", () => {
    // Tried first: a minHeight on a flex: 1 hero. On the device the hero still stretched, with a screen-high
    // gap between the tagline and the subtitle and no action on the first screen.
    expect(src).toContain("[styles.hero, large && styles.heroLarge]");
    expect(styleBody("heroLarge")).toMatch(/flexGrow\s*:\s*0/);
    expect(styleBody("heroLarge")).toMatch(/flexBasis\s*:\s*"auto"/);
    expect(src).toContain("[styles.heroInner, large && styles.heroInnerLarge,");
    expect(styleBody("heroInnerLarge")).toMatch(/flexGrow\s*:\s*0/);
    expect(styleBody("heroInnerLarge")).toMatch(/flexBasis\s*:\s*"auto"/);
  });

  // Found on the device once the page scrolled: the hero's brand text scaled to AX5 unchecked ("Kinabuk /
  // asan." broke mid-word) and filled the first screen, pushing every action out of sight. The old layout
  // hid this by collapsing the hero. The hero is brand art, not controls, so its text is capped, as
  // SegmentedControl already caps its labels.
  it("the hero's brand text is capped, so it cannot fill the first screen or break mid-word", () => {
    for (const style of ["styles.tagline", "styles.subtitle", "styles.pillarText"]) {
      const tag = new RegExp(`<Text style=\\{${style.replace(".", "\\.")}\\}[^>]*>`).exec(src);
      expect(tag).not.toBeNull();
      expect((tag as RegExpExecArray)[0]).toMatch(/maxFontSizeMultiplier=\{1\.\d+\}/);
    }
  });
});
