/**
 * "My shifts" (the volunteer's list, `components/volunteer/MyShifts`) at AX5 (seen on `main` at `c31ee99`, owner persona, one pending request): the three-column stats card
 * ("0 Completed | 0h Hours | 0 No-shows") is a row of three `flex: 1` columns with hero-size numbers, so "Completed" broke "Com / plete / d" and "No-shows" "No- / show / s"; each shift card is
 * an icon | `flex: 1` copy | status chip row, which left the copy one character wide ("s / h / e / l / t / e / r" down the card); the "Add to calendar | Cancel" link row has no room to wrap.
 *
 * The same fixes as the rest of the AX5 work, above `fontScale > 1.5` only: the stats stack one stat per row (the divider turns horizontal), cancelling the surviving `flex: 1` with `flex: 0` (#189); each card's
 * row stacks the same way; the link row wraps; the numbers and titles are capped (`maxFontScale.title`). Default-size layout is unchanged.
 *
 * A source scan in the style of homeAx5.test.ts; the device walk is the proof. Written in the same step as its fix (never seen red).
 */
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(__dirname, "..", "components", "volunteer", "MyShifts.tsx"), "utf-8");
const body = (name: string) => {
  const m = new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*\\{([^{}]*)\\}`).exec(src);
  return m ? m[1] : null;
};
const cancelFlex = (b: string | null) => {
  expect(b).not.toBeNull();
  expect(b).toMatch(/\bflex\s*:\s*0\b/);
  expect(b).toMatch(/alignSelf\s*:\s*"stretch"/);
  expect(b).toMatch(/flexGrow\s*:\s*0/);
  expect(b).toMatch(/flexBasis\s*:\s*"auto"/);
};

test("the stats card stacks at large text", () => {
  expect(src).toMatch(/useLargeText\(\)/);
  expect(body("statsCardLarge")).toMatch(/flexDirection\s*:\s*"column"/);
  cancelFlex(body("statColLarge"));
  expect(body("statDividerLarge")).toMatch(/width\s*:\s*"100%"/);
  expect(src).toMatch(/styles\.statsCard, large && styles\.statsCardLarge/);
  expect(src).toMatch(/styles\.statValue\}[^>]*maxFontSizeMultiplier=\{maxFontScale\.title\}/);
});

test("each shift card row stacks and cancels the surviving flex: 1", () => {
  expect(body("cardRowLarge")).toMatch(/flexDirection\s*:\s*"column"/);
  expect(body("cardRowLarge")).toMatch(/alignItems\s*:\s*"flex-start"/);
  cancelFlex(body("cardCopyLarge"));
  expect((src.match(/styles\.cardRow, large && styles\.cardRowLarge/g) ?? []).length).toBe(3);
  expect((src.match(/large \? styles\.cardCopyLarge : styles\.cardCopy/g) ?? []).length).toBe(2);
  expect((src.match(/styles\.cardTitle\}[^>]*maxFontSizeMultiplier=\{maxFontScale\.title\}/g) ?? []).length).toBe(2);
});

test("the Calendar | Cancel link row wraps", () => {
  expect(body("cardLinkRow")).toMatch(/flexWrap\s*:\s*"wrap"/);
});
