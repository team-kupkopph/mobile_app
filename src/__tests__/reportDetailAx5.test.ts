/**
 * The stray-report detail at AX5 (seen on `main` at `60c0987`, owner persona, one reported stray): the status chip under the title ("Reported") is a fixed
 * `height: 30` and its label was clipped; by reading, the "Possible matches" row is a fixed `height: 62`, the "Can't go? Offer help instead" button a fixed `height: 54`, and the
 * title is the screen's one uncapped heading. The rest of the screen is flowing text and rows that already fit.
 *
 * The same fixes as the rest of the AX5 work: `minHeight` + padding instead of a fixed `height` (the row also gets a gap so its label and chevron cannot touch); the title is
 * capped (`maxFontScale.title`). Default-size layout is unchanged.
 *
 * A source scan in the style of homeAx5.test.ts; the device walk is the proof (the chip was seen; the matches row and offer button were not on screen). Written
 * in the same step as its fix (never seen red).
 */
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(__dirname, "..", "screens", "ReportDetailScreen.tsx"), "utf-8");
const body = (name: string) => {
  const m = new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*\\{([^{}]*)\\}`).exec(src);
  return m ? m[1] : null;
};

test.each(["chip", "matchesRow", "offerBtn"])("%s grows with its content", (n) => {
  const b = body(n) as string;
  expect(b).not.toBeNull();
  expect(b).not.toMatch(/(^|[^a-zA-Z])height\s*:/);
  expect(b).toMatch(/minHeight\s*:/);
  expect(b).toMatch(/paddingVertical\s*:/);
});

test("the title is capped", () => {
  expect(src).toMatch(/styles\.h1\}[^>]*maxFontSizeMultiplier=\{maxFontScale\.title\}/);
});
