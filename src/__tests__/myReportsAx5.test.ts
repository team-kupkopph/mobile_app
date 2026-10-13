/**
 * "My reports" at AX5 (seen on `main` at `60c0987`, owner persona, one report): the four filter chips are a fixed `height: 38`, so they overlapped each other
 * ("All / Reported / Rescued / Resolved" drawn on top of one another); each report card puts its title and city in a `flex: 1` column beside a
 * fixed `height: 28` status chip, so "Dog · Healthy" broke one syllable per line ("Dog · / He / alt / hy") with the chip off to the side.
 *
 * The same fixes as the rest of the AX5 work, above `fontScale > 1.5` only: the card's copy | chip row stacks (also the queued-report card), cancelling the
 * surviving `flex: 1` with `flex: 0` (#189); chips take `minHeight` + padding; the title is capped; the queued card's actions wrap. Default-size layout is unchanged.
 *
 * A source scan in the style of homeAx5.test.ts; the device walk is the proof. Written in the same step as its fix (never seen red).
 */
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(__dirname, "..", "screens", "MyReportsScreen.tsx"), "utf-8");
const body = (name: string) => {
  const m = new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*\\{([^{}]*)\\}`).exec(src);
  return m ? m[1] : null;
};
const fixedHeight = /(^|[^a-zA-Z])height\s*:/;

test.each(["filterChip", "chip"])("%s grows with its text", (n) => {
  const b = body(n) as string;
  expect(b).not.toBeNull();
  expect(b).not.toMatch(fixedHeight);
  expect(b).toMatch(/minHeight\s*:/);
  expect(b).toMatch(/paddingVertical\s*:/);
});

test("both card rows stack at large text and cancel the surviving flex: 1", () => {
  expect(src).toMatch(/useLargeText\(\)/);
  const row = body("cardLarge") as string;
  expect(row).toMatch(/flexDirection\s*:\s*"column"/);
  expect(row).toMatch(/alignItems\s*:\s*"flex-start"/);
  const c = body("cardCopyLarge") as string;
  expect(c).toMatch(/\bflex\s*:\s*0\b/);
  expect(c).toMatch(/alignSelf\s*:\s*"stretch"/);
  expect(c).toMatch(/flexGrow\s*:\s*0/);
  expect(c).toMatch(/flexBasis\s*:\s*"auto"/);
  expect((src.match(/large && styles\.cardLarge/g) ?? []).length).toBe(2);
  expect((src.match(/large \? styles\.cardCopyLarge : styles\.cardCopy/g) ?? []).length).toBe(2);
});

test("the titles are capped and the queued card's actions wrap", () => {
  expect((src.match(/styles\.cardTitle\}[^>]*maxFontSizeMultiplier=\{maxFontScale\.title\}/g) ?? []).length).toBe(2);
  expect(body("pendingActions")).toMatch(/flexWrap\s*:\s*"wrap"/);
});
