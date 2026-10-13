/**
 * The stray-report form at AX5 (static risk from `dev/handoff-ax5.md`; walked on a device where the PR says): the headline is the one uncapped `display`
 * title, the dashed "Add a photo" button is a fixed `height: 90`, the location card's "From your GPS | Adjust exact location ›" footer is a
 * row of two texts that cannot share a line, and the "Report anonymously" label has no flex of its own beside its Switch, so a wrapped label can push the Switch off the
 * card.
 *
 * The same fixes as the rest of the AX5 work: the title is capped (`maxFontScale.title`); the button takes `minHeight` + padding; the footer wraps; the label
 * takes the row's remaining width (`flex: 1`). Default-size layout is unchanged.
 *
 * A source scan in the style of homeAx5.test.ts; the device walk is the proof. Written in the same step as its fix (never seen red).
 */
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(__dirname, "..", "screens", "ReportStrayScreen.tsx"), "utf-8");
const body = (name: string) => {
  const m = new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*\\{([^{}]*)\\}`).exec(src);
  return m ? m[1] : null;
};

test("the headline is capped", () => {
  expect(src).toMatch(/<Text style=\{styles\.h1\} maxFontSizeMultiplier=\{maxFontScale\.title\}>/);
});

test("the photo button grows with its label", () => {
  const b = body("photoBtn") as string;
  expect(b).not.toBeNull();
  expect(b).not.toMatch(/(^|[^a-zA-Z])height\s*:/);
  expect(b).toMatch(/minHeight\s*:/);
  expect(b).toMatch(/paddingVertical\s*:/);
});

test("the location footer wraps and the anonymous label takes the row's width", () => {
  expect(body("locFooter")).toMatch(/flexWrap\s*:\s*"wrap"/);
  expect(body("anonLabel")).toMatch(/\bflex\s*:\s*1\b/);
});

test("the anonymous row and the shared contact-share row stack at large text and cancel the surviving flex: 1", () => {
  expect(src).toMatch(/useLargeText\(\)/);
  expect(body("anonRowLarge")).toMatch(/flexDirection\s*:\s*"column"/);
  const c = body("anonLabelLarge") as string;
  expect(c).toMatch(/\bflex\s*:\s*0\b/);
  expect(c).toMatch(/flexBasis\s*:\s*"auto"/);
  expect(src).toMatch(/styles\.anonRow, large && styles\.anonRowLarge/);
  const share = readFileSync(join(__dirname, "..", "components", "sagip", "ContactShareRow.tsx"), "utf-8");
  expect(share).toMatch(/useLargeText\(\)/);
  expect(share).toMatch(/styles\.row, large && styles\.rowLarge/);
  expect(share).toMatch(/large \? styles\.textLarge : styles\.text/);
  expect(share).toMatch(/\bflex\s*:\s*0\b[^}]*flexBasis\s*:\s*"auto"/);
});
