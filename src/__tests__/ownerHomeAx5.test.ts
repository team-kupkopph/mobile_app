/**
 * The owner's Home at AX5 (the shared Home sections and header were fixed in #186; walked here: the "Verified Member" hero was a row of a 46 pt tile and a
 * `flex: 1` text column, so "You're a Verified Member" wrapped one word per line beside it): the rows that are specific to this screen. The "Verified
 * Member in review" card is a row of an icon, a `flex: 1` copy column and a "Documents ›" link; the spotlight card's eyebrow | status-chip row and the
 * chip's fixed `height: 26`; and the three "My reports / My rescues / My offers" pills are `flex: 1` in one row with a fixed `height: 46`, so each label
 * gets about 100 pt.
 *
 * The same fixes as the rest of the AX5 work, above `fontScale > 1.5` only: each row stacks, cancelling the surviving `flex: 1` with `flex: 0` (#189); the
 * chip and the pills take `minHeight` + padding. Default-size layout is unchanged.
 *
 * A source scan in the style of homeAx5.test.ts; the device walk is the proof. Written in the same step as its fix (never seen red).
 */
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(__dirname, "..", "screens", "HomeScreen.tsx"), "utf-8");
const body = (name: string) => {
  const m = new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*\\{([^{}]*)\\}`).exec(src);
  return m ? m[1] : null;
};
const fixedHeight = /(^|[^a-zA-Z])height\s*:/;

test("the screen reads the large-text flag", () => {
  expect(src).toMatch(/useLargeText\(\)/);
});

test.each([
  ["reviewCardLarge", "reviewCopyLarge", /styles\.reviewCard, large && styles\.reviewCardLarge/, /large \? styles\.reviewCopyLarge : styles\.reviewCopy/],
  ["verifiedHeroLarge", "verifiedHeroCopyLarge", /styles\.verifiedHero, large && styles\.verifiedHeroLarge/, /large \? styles\.verifiedHeroCopyLarge : styles\.verifiedHeroCopy/]
])("%s stacks and %s cancels the surviving flex: 1", (row, copy, rowUse, copyUse) => {
  const r = body(row) as string;
  expect(r).not.toBeNull();
  expect(r).toMatch(/flexDirection\s*:\s*"column"/);
  expect(r).toMatch(/alignItems\s*:\s*"flex-start"/);
  const c = body(copy) as string;
  expect(c).not.toBeNull();
  expect(c).toMatch(/\bflex\s*:\s*0\b/);
  expect(c).toMatch(/alignSelf\s*:\s*"stretch"/);
  expect(c).toMatch(/flexGrow\s*:\s*0/);
  expect(c).toMatch(/flexBasis\s*:\s*"auto"/);
  expect(src).toMatch(rowUse);
  expect(src).toMatch(copyUse);
});

test("the spotlight's eyebrow | chip row stacks and the chip grows", () => {
  expect(body("spotTopLarge")).toMatch(/flexDirection\s*:\s*"column"/);
  expect(body("spotTopLarge")).toMatch(/alignItems\s*:\s*"flex-start"/);
  expect(src).toMatch(/styles\.spotTop, large && styles\.spotTopLarge/);
  const c = body("spotChip") as string;
  expect(c).not.toMatch(fixedHeight);
  expect(c).toMatch(/minHeight\s*:/);
  expect(c).toMatch(/paddingVertical\s*:/);
});

test("the three trail pills stack at large text and grow with their label", () => {
  const row = body("trailRowLarge") as string;
  expect(row).toMatch(/flexDirection\s*:\s*"column"/);
  expect(src).toMatch(/styles\.trailRow, large && styles\.trailRowLarge/);
  const p = body("trailPill") as string;
  expect(p).not.toMatch(fixedHeight);
  expect(p).toMatch(/minHeight\s*:/);
  expect(p).toMatch(/paddingVertical\s*:/);
  const pl = body("trailPillLarge") as string;
  expect(pl).toMatch(/\bflex\s*:\s*0\b/);
  expect(pl).toMatch(/alignSelf\s*:\s*"stretch"/);
  expect(pl).toMatch(/flexGrow\s*:\s*0/);
  expect(pl).toMatch(/flexBasis\s*:\s*"auto"/);
  expect((src.match(/styles\.trailPill, large && styles\.trailPillLarge/g) ?? []).length).toBe(3);
});
