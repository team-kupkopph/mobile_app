/**
 * The "Report sent" screen at AX5 (static risk from `dev/handoff-ax5.md`; NOT walked at AX5: it is only reachable by submitting a report, and the walk's one
 * approved report had been spent at default size): the "Reported" status chip is a fixed `height: 30`, the headline is uncapped hero text, and the numerals 1-3
 * are text in fixed 30 pt circles, so they would scale out of them.
 *
 * The same fixes as the rest of the AX5 work: `minHeight` + padding; the title is capped (`maxFontScale.title`); a glyph in a fixed shape gets
 * `allowFontScaling={false}`. Default-size layout is unchanged.
 *
 * A source scan in the style of homeAx5.test.ts. Written in the same step as its fix (never seen red).
 */
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(__dirname, "..", "screens", "ReportSentScreen.tsx"), "utf-8");
const body = (name: string) => {
  const m = new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*\\{([^{}]*)\\}`).exec(src);
  return m ? m[1] : null;
};

test("the status chip grows with its text", () => {
  const c = body("chip") as string;
  expect(c).not.toBeNull();
  expect(c).not.toMatch(/(^|[^a-zA-Z])height\s*:/);
  expect(c).toMatch(/minHeight\s*:/);
  expect(c).toMatch(/paddingVertical\s*:/);
});

test("the headline is capped and the numerals in their fixed circles do not scale", () => {
  expect(src).toMatch(/styles\.heroTitle\}[^>]*maxFontSizeMultiplier=\{maxFontScale\.title\}/);
  expect(src).toMatch(/styles\.nextNum\}[^>]*allowFontScaling=\{false\}/);
});
