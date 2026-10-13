/**
 * "My impact" at AX5 (static risk from `dev/handoff-ax5.md`, then walked): three stat tiles share one row, each `flex: 1` holding a hero-size number and a
 * label, so at AX5 the numbers overflow and the labels break; the badge grid is two `width: "48%"` columns whose name and criteria are
 * `numberOfLines={2}`, so a badge's name and what it takes are cut off after two lines of a ~150 pt column; and the ★ is a text glyph in a fixed 56 pt medal.
 *
 * The same fixes as the rest of the AX5 work, above `fontScale > 1.5` only: the stat tiles stack, cancelling the surviving `flex: 1` with `flex: 0` (#189);
 * the badge grid is one column and its text is not truncated; the glyph in the fixed medal does not scale; the stat numbers are capped
 * (`maxFontScale.title`). Default-size layout is unchanged.
 *
 * A source scan in the style of homeAx5.test.ts; the device walk is the proof. Written in the same step as its fix (never seen red).
 */
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(__dirname, "..", "screens", "ImpactScreen.tsx"), "utf-8");
const body = (name: string) => {
  const m = new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*\\{([^{}]*)\\}`).exec(src);
  return m ? m[1] : null;
};

test("the screen reads the large-text flag", () => {
  expect(src).toMatch(/useLargeText\(\)/);
});

test("the stat tiles stack at large text and cancel the surviving flex: 1", () => {
  const row = body("statRowLarge") as string;
  expect(row).toMatch(/flexDirection\s*:\s*"column"/);
  const tile = body("statTileLarge") as string;
  expect(tile).toMatch(/\bflex\s*:\s*0\b/);
  expect(tile).toMatch(/alignSelf\s*:\s*"stretch"/);
  expect(tile).toMatch(/flexGrow\s*:\s*0/);
  expect(tile).toMatch(/flexBasis\s*:\s*"auto"/);
  expect(src).toMatch(/styles\.statRow, large && styles\.statRowLarge/);
  expect(src).toMatch(/styles\.statTile, large && styles\.statTileLarge/);
});

test("the badge grid is one column at large text", () => {
  expect(body("badgeTileLarge")).toMatch(/width\s*:\s*"100%"/);
  expect(src).toMatch(/styles\.badgeTile, large && styles\.badgeTileLarge/);
});

test.each(["badgeName", "badgeCriteria"])("%s is truncated to two lines only at default size", (n) => {
  const m = new RegExp(`styles\\.${n}[^>]*numberOfLines=\\{([^}]*)\\}`, "s").exec(src);
  expect(m).not.toBeNull();
  expect(m![1]).toMatch(/large \? undefined : 2/);
});

test("the ★ in the fixed medal does not scale, and the stat number is capped", () => {
  expect((src.match(/styles\.medalGlyph[^>]*allowFontScaling=\{false\}/gs) ?? []).length).toBe(1);
  expect(src).toMatch(/styles\.statValue\}[^>]*maxFontSizeMultiplier=\{maxFontScale\.title\}/);
});
