/**
 * The report-match screens at AX5 (static risk from `dev/handoff-ax5.md`; NOT walked: they need a lost report with a suggested match, and the walk's data had none):
 * a match card is a 96 pt avatar beside a `flex: 1` copy column with a "type | strength chip" row and a two-line `numberOfLines` reasons text, which leaves about 200 pt for
 * the text at AX5; the match detail's "Species | value" fact rows are a space-between row of two texts with a 16 pt gap.
 *
 * The same fixes as the rest of the AX5 work, above `fontScale > 1.5` only: the card's avatar | copy row stacks, cancelling the surviving `flex: 1` with `flex: 0`
 * (#189); the type | chip row wraps; the reasons text is not truncated; a fact row stacks key over value. Default-size layout is unchanged.
 *
 * A source scan in the style of homeAx5.test.ts. Written in the same step as its fix (never seen red).
 */
import { readFileSync } from "fs";
import { join } from "path";

const read = (f: string) => readFileSync(join(__dirname, "..", "screens", f), "utf-8");
const matches = read("ReportMatchesScreen.tsx");
const detail = read("MatchDetailScreen.tsx");
const body = (s: string, name: string) => {
  const m = new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*\\{([^{}]*)\\}`).exec(s);
  return m ? m[1] : null;
};

test("the match card stacks and cancels the surviving flex: 1", () => {
  expect(matches).toMatch(/useLargeText\(\)/);
  expect(body(matches, "rowLarge")).toMatch(/flexDirection\s*:\s*"column"/);
  const c = body(matches, "copyLarge") as string;
  expect(c).toMatch(/\bflex\s*:\s*0\b/);
  expect(c).toMatch(/alignSelf\s*:\s*"stretch"/);
  expect(c).toMatch(/flexGrow\s*:\s*0/);
  expect(c).toMatch(/flexBasis\s*:\s*"auto"/);
  expect(matches).toMatch(/styles\.row, large && styles\.rowLarge/);
  expect(matches).toMatch(/large \? styles\.copyLarge : styles\.copy/);
});

test("the type | chip row wraps and the reasons are not truncated at large text", () => {
  expect(body(matches, "topRow")).toMatch(/flexWrap\s*:\s*"wrap"/);
  expect(matches).toMatch(/styles\.reasons\}[^>]*numberOfLines=\{large \? undefined : 2\}/);
});

test("a fact row stacks key over value at large text", () => {
  expect(detail).toMatch(/useLargeText\(\)/);
  expect(body(detail, "factRowLarge")).toMatch(/flexDirection\s*:\s*"column"/);
  expect(body(detail, "factRowLarge")).toMatch(/alignItems\s*:\s*"flex-start"/);
  expect(detail).toMatch(/styles\.factRow, large && styles\.factRowLarge/);
  expect(body(detail, "factValLarge")).toMatch(/textAlign\s*:\s*"left"/);
});
