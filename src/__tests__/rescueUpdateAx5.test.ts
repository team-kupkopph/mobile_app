/**
 * "Update case" (the claiming rescuer's screen) at AX5 (static risk from `dev/handoff-ax5.md`, then walked where the PR says): the headline is the one uncapped `display` title,
 * the "Currently: …" chip is a fixed `height: 30`, the outcome-photo button a fixed `height: 64`, and the "List for adoption | Place with someone" hand-off pair sits
 * side by side (each half about 160 pt wide), which breaks both labels mid-word at AX5 (the same pair of buttons broke in #193).
 *
 * The same fixes as the rest of the AX5 work: the title is capped (`maxFontScale.title`); `minHeight` + padding instead of fixed heights; the button pair stacks above
 * `fontScale > 1.5`, cancelling the `flex: 1` that a style array would keep with `flex: 0` (#189). Default-size layout is unchanged.
 *
 * A source scan in the style of homeAx5.test.ts. Written in the same step as its fix (never seen red).
 */
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(__dirname, "..", "screens", "RescueUpdateScreen.tsx"), "utf-8");
const body = (name: string) => {
  const m = new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*\\{([^{}]*)\\}`).exec(src);
  return m ? m[1] : null;
};

test("the headline is capped", () => {
  expect(src).toMatch(/styles\.h1\}[^>]*maxFontSizeMultiplier=\{maxFontScale\.title\}/);
});

test.each(["currentChip", "photoBtn"])("%s grows with its content", (n) => {
  const b = body(n) as string;
  expect(b).not.toBeNull();
  expect(b).not.toMatch(/(^|[^a-zA-Z])height\s*:/);
  expect(b).toMatch(/minHeight\s*:/);
  expect(b).toMatch(/paddingVertical\s*:/);
});

test("the hand-off pair stacks at large text", () => {
  expect(src).toMatch(/useLargeText\(\)/);
  expect(body("handoffRowLarge")).toMatch(/flexDirection\s*:\s*"column"/);
  expect(src).toMatch(/styles\.handoffRow, large && styles\.handoffRowLarge/);
});

test("My rescues' card stacks (the same card as My reports) and its chip grows", () => {
  const mine = readFileSync(join(__dirname, "..", "screens", "MyRescuesScreen.tsx"), "utf-8");
  const b = (name: string) => { const m = new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*\\{([^{}]*)\\}`).exec(mine); return m ? m[1] : null; };
  expect(mine).toMatch(/useLargeText\(\)/);
  expect(b("cardLarge")).toMatch(/flexDirection\s*:\s*"column"/);
  const c = b("cardCopyLarge") as string;
  expect(c).toMatch(/\bflex\s*:\s*0\b/);
  expect(c).toMatch(/flexBasis\s*:\s*"auto"/);
  expect(mine).toMatch(/styles\.card, large && styles\.cardLarge/);
  expect(mine).toMatch(/large \? styles\.cardCopyLarge : styles\.cardCopy/);
  const chip = b("chip") as string;
  expect(chip).not.toMatch(/(^|[^a-zA-Z])height\s*:/);
  expect(chip).toMatch(/minHeight\s*:/);
});
