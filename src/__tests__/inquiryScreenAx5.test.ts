/**
 * The adopter's inquiry ladder ("Your inquiry") at AX5 (seen on `main` at `f1629a0`, owner persona): the pet card's tile | name | "Step 2 of 6" chip
 * row squeezed the name to one letter ("I…") with the chip on top of the screen title; each step's title | date row broke "Application & background
 * check" one word per line; the shelter contact's name was `numberOfLines={1}` ("E2E Test…"); and the ladder's connector line is `bottom: -22` of a
 * rail that is only as tall as its dot, so a tall step would leave a stub rather than a line to the next dot.
 *
 * The same fixes as the rest of the AX5 work, above `fontScale > 1.5` only: each icon | text | chip row stacks, cancelling the surviving `flex: 1`
 * with `flex: 0` (#189); names stop being one line and the title is capped; the rail stretches to its row. Default-size layout is unchanged.
 *
 * A source scan in the style of homeAx5.test.ts; the device walk is the proof. Written in the same step as its fix (never seen red).
 */
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(__dirname, "..", "screens", "InquiryScreen.tsx"), "utf-8");
const body = (name: string) => {
  const m = new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*\\{([^{}]*)\\}`).exec(src);
  return m ? m[1] : null;
};

function expectStacked(row: string) {
  const r = body(row) as string;
  expect(r).not.toBeNull();
  expect(r).toMatch(/flexDirection\s*:\s*"column"/);
  expect(r).toMatch(/alignItems\s*:\s*"flex-start"/);
}
function expectFlexCancelled(copy: string) {
  const c = body(copy) as string;
  expect(c).not.toBeNull();
  expect(c).toMatch(/\bflex\s*:\s*0\b/);
  expect(c).toMatch(/alignSelf\s*:\s*"stretch"/);
  expect(c).toMatch(/flexGrow\s*:\s*0/);
  expect(c).toMatch(/flexBasis\s*:\s*"auto"/);
}

test("the screen reads the large-text flag", () => {
  expect(src).toMatch(/useLargeText\(\)/);
});

test.each([
  ["petRowLarge", "petTextLarge", /styles\.petRow, large && styles\.petRowLarge/],
  ["contactRowLarge", "contactTextLarge", /styles\.contactRow, large && styles\.contactRowLarge/]
])("%s stacks and %s cancels the surviving flex: 1", (row, copy, usage) => {
  expectStacked(row);
  expectFlexCancelled(copy);
  expect(src).toMatch(usage);
});

test("a step's title | date head stacks", () => {
  expectStacked("stageHeadLarge");
  expectFlexCancelled("stageTitleLarge");
  expect(src).toMatch(/styles\.stageHead, large && styles\.stageHeadLarge/);
});

test("the phone | Call row stacks", () => {
  expectStacked("phoneRowLarge");
  expect(src).toMatch(/styles\.phoneRow, large && styles\.phoneRowLarge/);
});

test("the ladder's rail stretches to its row so the connector reaches the next dot", () => {
  expect(body("railLarge")).toMatch(/alignSelf\s*:\s*"stretch"/);
  expect(src).toMatch(/styles\.rail, large && styles\.railLarge/);
});

test("pet and contact names are not one line at large text; the pet name is capped", () => {
  for (const n of ["petName", "petMeta", "contactName"]) {
    const m = new RegExp(`styles\\.${n}\\}[^>]*numberOfLines=\\{([^}]*)\\}`).exec(src);
    expect(m).not.toBeNull();
    expect(m![1]).toMatch(/large \? undefined : 1/);
  }
  expect(src).toMatch(/styles\.petName\}[^>]*maxFontSizeMultiplier=\{maxFontScale\.title\}/);
});
