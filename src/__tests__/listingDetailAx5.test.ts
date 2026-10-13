/**
 * The listing detail screen at AX5 (static risk from `dev/handoff-ax5.md`, then walked): the Spayed / Vaccinated / Walkable tag pills are a fixed
 * `height: 30`, the "Adoption fee | ₱300" card is a row of two texts that cannot share a line once the fee grows, and the hero pet name is the one
 * uncapped title on the screen.
 *
 * The same fixes as the rest of the AX5 work, above `fontScale > 1.5` only: the pills take `minHeight` + padding; the fee row stacks; the name is capped
 * (`maxFontScale.title`). Default-size layout is unchanged.
 *
 * A source scan in the style of homeAx5.test.ts; the device walk is the proof. Written in the same step as its fix (never seen red).
 */
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(__dirname, "..", "screens", "ListingDetailScreen.tsx"), "utf-8");
const body = (name: string) => {
  const m = new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*\\{([^{}]*)\\}`).exec(src);
  return m ? m[1] : null;
};

test("the tag pills grow with their text", () => {
  const t = body("tag") as string;
  expect(t).not.toBeNull();
  expect(t).not.toMatch(/(^|[^a-zA-Z])height\s*:/);
  expect(t).toMatch(/minHeight\s*:/);
  expect(t).toMatch(/paddingVertical\s*:/);
});

test("the fee card stacks at large text", () => {
  expect(src).toMatch(/useLargeText\(\)/);
  const f = body("feeCardLarge") as string;
  expect(f).toMatch(/flexDirection\s*:\s*"column"/);
  expect(f).toMatch(/alignItems\s*:\s*"flex-start"/);
  expect(src).toMatch(/styles\.feeCard, large && styles\.feeCardLarge/);
});

test("the pet name is capped like every other title", () => {
  expect(src).toMatch(/styles\.name\}[^>]*maxFontSizeMultiplier=\{maxFontScale\.title\}/);
});
