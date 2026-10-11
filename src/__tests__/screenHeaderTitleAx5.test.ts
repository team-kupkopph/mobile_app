/**
 * R6-F9 · AX-1 — The shared screen header truncated its title at Dynamic Type AX5: "Forgot password"
 * read "Forgot…", "Choose account type" "Choose…", "Create account" "Create…" (Run 6 part 8). The title
 * was `numberOfLines={1}` beside a fixed 44 pt back button, so at AX5 a two-word title could only be
 * ellipsised, and the screen's name was lost. Every screen uses this header (and the auth kit's
 * SimpleHeader wraps it), so one fix covers them all.
 *
 * At a large font scale (fontScale > 1.5, as elsewhere in this app) the title may take up to three lines
 * before it truncates. Up to three, not unlimited: a few titles are dynamic (a need's title, a shift's
 * headline), and an unbounded header could eat the screen. At default size it stays one line, so no
 * existing screen changes.
 *
 * A source scan in the style of buttonDynamicType.test.ts; the device walk is still the proof.
 */
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(__dirname, "..", "components", "ui", "ScreenHeader.tsx"), "utf-8");
const titleTag = () => {
  const m = /<Text\b[^>]*accessibilityRole="header"[^>]*>|<Text\b[^>]*numberOfLines[^>]*>/s.exec(src);
  return m ? m[0] : null;
};

describe("the header title wraps at a large font scale (R6-F9)", () => {
  it("the scan found what it is scanning (a guard that matches nothing proves nothing)", () => {
    expect(src).toContain("export function ScreenHeader");
    expect(titleTag()).not.toBeNull();
    expect(titleTag()).toContain('accessibilityRole="header"');
  });

  it("reads the font scale", () => {
    expect(src).toMatch(/useWindowDimensions/);
    expect(src).toMatch(/\bfontScale\b/);
    expect(src).toMatch(/const\s+large\s*=\s*fontScale\s*>\s*1\.5/);
  });

  it("allows up to three lines when large, and exactly one otherwise", () => {
    expect(titleTag()).toMatch(/numberOfLines=\{large \? 3 : 1\}/);
  });

  it("no longer limits the title to one line unconditionally", () => {
    expect(src).not.toMatch(/numberOfLines=\{1\}/);
  });

  it("the title can shrink beside the back button, so it wraps instead of overflowing", () => {
    const m = /(?:^|\s)title\s*:\s*\{([^{}]*)\}/m.exec(src);
    expect(m).not.toBeNull();
    expect((m as RegExpExecArray)[1]).toMatch(/flexShrink\s*:\s*1/);
  });
});
