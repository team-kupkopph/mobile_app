/**
 * The volunteer's Kawang-Gawa calendar's month header at AX5 (seen on `main` at `170e179`, Run 6 part 18; the calendar cells and cards were fixed in #218): the month label ("October 2026", an uncapped
 * `subtitle`) sat in a row with the previous / next-month buttons, claimed the row's width, and pushed the buttons off the right edge, so only a sliver of one arrow was on screen and a volunteer
 * could not change month.
 *
 * The chevrons are text glyphs in fixed 44 pt buttons and scaled out of them (their lower halves sat under the weekday row), so they do not scale. The label is capped (`maxFontScale.title`) and may shrink and wrap (`flexShrink: 1`); the button group never shrinks (`flexShrink: 0`). The default-size tree is unchanged.
 *
 * A source scan in the style of kawangGawaListAx5.test.ts; the device walk is the proof.
 */
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(__dirname, "..", "screens", "KawangGawaScreen.tsx"), "utf-8");
const cal = /const calStyles = StyleSheet\.create\(\{([\s\S]*?)\n\}\);/.exec(src)?.[1] ?? "";
const body = (name: string) => {
  const m = new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*\\{([^{}]*)\\}`).exec(cal);
  return m ? m[1] : null;
};

describe("the calendar's month header", () => {
  it("the scan found the styles (a guard that matches nothing proves nothing)", () => {
    expect(cal.length).toBeGreaterThan(500);
    for (const n of ["header", "monthLabel", "navGroup", "nav"]) expect(body(n)).not.toBeNull();
  });
  it("the month label is capped and may shrink, so the buttons stay on screen", () => {
    expect(src).toMatch(/calStyles\.monthLabel\}\s+maxFontSizeMultiplier=\{maxFontScale\.title\}/);
    expect(body("monthLabel") as string).toMatch(/flexShrink\s*:\s*1/);
  });
  it("the previous / next button group never shrinks", () => {
    expect(body("navGroup") as string).toMatch(/flexShrink\s*:\s*0/);
  });
  it("the chevrons are glyphs in a fixed 44 pt box, so they do not scale (they overflowed into the weekday row)", () => {
    expect((src.match(/calStyles\.chev\}\s+allowFontScaling=\{false\}/g) ?? []).length).toBe(2);
  });
});
