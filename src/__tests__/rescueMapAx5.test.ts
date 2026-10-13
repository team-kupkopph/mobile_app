/**
 * "Nearby strays" (the rescue map) at AX5 (static risk from `dev/handoff-ax5.md`; walked where the PR says): the badge laid over the map ("1 nearby · within 10 km of
 * Marikina") is absolute, a fixed `height: 34` and only as wide as its text, inside a fixed `height: 200` map; the three-item legend is a `gap: 18` row that runs off
 * the screen; and each stray card is a `flex: 1` copy column beside a fixed `height: 28` chip (the same card as My reports, seen broken in #210).
 *
 * The same fixes as the rest of the AX5 work, above `fontScale > 1.5` only: the map is taller and the badge grows and spans its width; the legend wraps; the
 * card row stacks, cancelling the surviving `flex: 1` with `flex: 0` (#189); the chip takes `minHeight` + padding. Default-size layout is unchanged.
 *
 * A source scan in the style of homeAx5.test.ts. Written in the same step as its fix (never seen red).
 */
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(__dirname, "..", "screens", "RescueMapScreen.tsx"), "utf-8");
const body = (name: string) => {
  const m = new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*\\{([^{}]*)\\}`).exec(src);
  return m ? m[1] : null;
};
const fixedHeight = /(^|[^a-zA-Z])height\s*:/;

test("the badge and the chip grow with their text", () => {
  for (const n of ["mapBadge", "chip"]) {
    const b = body(n) as string;
    expect(b).not.toBeNull();
    expect(b).not.toMatch(fixedHeight);
    expect(b).toMatch(/minHeight\s*:/);
    expect(b).toMatch(/paddingVertical\s*:/);
  }
  expect(body("mapBadgeLarge")).toMatch(/right\s*:\s*12/);
});

test("the map is taller at large text and the legend wraps", () => {
  expect(src).toMatch(/useLargeText\(\)/);
  expect(body("mapWrapLarge")).toMatch(/height\s*:\s*\d+/);
  expect(src).toMatch(/large \? styles\.mapWrapLarge : styles\.mapWrap/);
  expect(body("legendRow")).toMatch(/flexWrap\s*:\s*"wrap"/);
});

test("the stray card stacks and cancels the surviving flex: 1", () => {
  expect(body("cardLarge")).toMatch(/flexDirection\s*:\s*"column"/);
  expect(body("cardLarge")).toMatch(/alignItems\s*:\s*"flex-start"/);
  const c = body("cardCopyLarge") as string;
  expect(c).toMatch(/\bflex\s*:\s*0\b/);
  expect(c).toMatch(/alignSelf\s*:\s*"stretch"/);
  expect(c).toMatch(/flexGrow\s*:\s*0/);
  expect(c).toMatch(/flexBasis\s*:\s*"auto"/);
  expect(src).toMatch(/styles\.card, large && styles\.cardLarge/);
  expect(src).toMatch(/large \? styles\.cardCopyLarge : styles\.cardCopy/);
  expect(src).toMatch(/styles\.cardTitle\}[^>]*maxFontSizeMultiplier=\{maxFontScale\.title\}/);
});
