/**
 * The individual poster's listing screen ("Your listing", reached from Profile → My listings) at AX5 (static risk from `dev/handoff-ax5.md`, then
 * walked): the head card's photo | name | status chip row and each applicant row's avatar | name row both keep a `flex: 1` text column, and the pet name,
 * the applicant's name and their sub-line are `numberOfLines={1}`, so at AX5 the name is squeezed beside a 62 pt photo and the chip, and an applicant's
 * name and "city · status" line are cut off.
 *
 * The same fixes as the rest of the AX5 work, above `fontScale > 1.5` only: both rows stack, cancelling the surviving `flex: 1` with `flex: 0` (#189);
 * the lines are no longer truncated; the pet name is capped (`maxFontScale.title`). Default-size layout is unchanged.
 *
 * A source scan in the style of homeAx5.test.ts; the device walk is the proof. Written in the same step as its fix (never seen red).
 */
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(__dirname, "..", "screens", "PosterListingScreen.tsx"), "utf-8");
const body = (name: string) => {
  const m = new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*\\{([^{}]*)\\}`).exec(src);
  return m ? m[1] : null;
};

test("the screen reads the large-text flag", () => {
  expect(src).toMatch(/useLargeText\(\)/);
});

test.each([
  ["headRowLarge", "styles.headRow, large && styles.headRowLarge"],
  ["rowLarge", "styles.row, large && styles.rowLarge"]
])("%s stacks", (name, usage) => {
  const r = body(name) as string;
  expect(r).not.toBeNull();
  expect(r).toMatch(/flexDirection\s*:\s*"column"/);
  expect(r).toMatch(/alignItems\s*:\s*"flex-start"/);
  expect(src).toContain(usage);
});

test("the surviving flex: 1 on the text column is cancelled at large text", () => {
  const c = body("rowTextLarge") as string;
  expect(c).not.toBeNull();
  expect(c).toMatch(/\bflex\s*:\s*0\b/);
  expect(c).toMatch(/alignSelf\s*:\s*"stretch"/);
  expect(c).toMatch(/flexGrow\s*:\s*0/);
  expect(c).toMatch(/flexBasis\s*:\s*"auto"/);
  expect((src.match(/large \? styles\.rowTextLarge : styles\.rowText/g) ?? []).length).toBe(2);
});

test.each(["title", "rowTitle", "rowSub"])("%s is truncated to one line only at default size", (n) => {
  const m = new RegExp(`styles\\.${n}\\}[^>]*numberOfLines=\\{([^}]*)\\}`).exec(src);
  expect(m).not.toBeNull();
  expect(m![1]).toMatch(/large \? undefined : 1/);
});

test("the pet name is capped like every other title", () => {
  expect(src).toMatch(/styles\.title\}[^>]*maxFontSizeMultiplier=\{maxFontScale\.title\}/);
});
