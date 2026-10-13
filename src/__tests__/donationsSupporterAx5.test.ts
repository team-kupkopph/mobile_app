/**
 * The supporter's donation screens at AX5 (static risk from `dev/handoff-ax5.md`; Donate and My donations' empty state walked where the PR says): the Donate and Pledge titles are uncapped `hero`
 * text and the "Pledge" button a fixed `height: 38`; the pledge stepper is a fixed `height: 68` pill holding a 30 pt "–", the quantity and a 30 pt "+" that all scale with Dynamic Type inside fixed
 * 52 pt circles (the same fixed-shape text glyph pattern as #168), as is the ✓ in the 84 pt "Pledge recorded" tile; My donations puts a `flex: 1` need title beside its status chip and
 * has a fixed `height: 38` "Cancel pledge" button.
 *
 * The same fixes as the rest of the AX5 work: titles capped (`maxFontScale.title`); glyphs in fixed shapes do not scale and the quantity is capped (`maxFontScale.code`); `minHeight` + padding instead
 * of fixed heights; above `fontScale > 1.5` the pledge row stacks, cancelling the surviving `flex: 1` with `flex: 0` (#189). Default-size layout is unchanged.
 *
 * A source scan in the style of homeAx5.test.ts. Written in the same step as its fix (never seen red).
 */
import { readFileSync } from "fs";
import { join } from "path";

const read = (f: string) => readFileSync(join(__dirname, "..", "screens", f), "utf-8");
const donate = read("DonateScreen.tsx");
const pledge = read("DonatePledgeScreen.tsx");
const mine = read("MyDonationsScreen.tsx");
const body = (s: string, name: string) => {
  const m = new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*\\{([^{}]*)\\}`).exec(s);
  return m ? m[1] : null;
};
const fixedHeight = /(^|[^a-zA-Z])height\s*:/;

test("the titles are capped", () => {
  expect(donate).toMatch(/styles\.orgName\}[^>]*maxFontSizeMultiplier=\{maxFontScale\.title\}/);
  expect((pledge.match(/styles\.needTitle\}[^>]*maxFontSizeMultiplier=\{maxFontScale\.title\}/g) ?? []).length).toBe(1);
  expect(pledge).toMatch(/styles\.confirmTitle\}[^>]*maxFontSizeMultiplier=\{maxFontScale\.title\}/);
});

test.each([["Pledge", donate, "pledgeBtn"], ["Cancel pledge", mine, "cancelBtn"]])("the %s button grows with its label", (_n, src, style) => {
  const b = body(src, style) as string;
  expect(b).not.toBeNull();
  expect(b).not.toMatch(fixedHeight);
  expect(b).toMatch(/minHeight\s*:/);
  expect(b).toMatch(/paddingVertical\s*:/);
});

test("the stepper grows and its glyphs in fixed shapes do not scale", () => {
  const s = body(pledge, "stepper") as string;
  expect(s).not.toMatch(fixedHeight);
  expect(s).toMatch(/minHeight\s*:\s*68/);
  expect((pledge.match(/styles\.stepGlyph\}[^>]*allowFontScaling=\{false\}/g) ?? []).length).toBe(2);
  expect(pledge).toMatch(/styles\.checkGlyph\}[^>]*allowFontScaling=\{false\}/);
  expect(pledge).toMatch(/styles\.qty\}[^>]*maxFontSizeMultiplier=\{maxFontScale\.code\}/);
});

test("My donations' pledge row stacks at large text and cancels the surviving flex: 1", () => {
  expect(mine).toMatch(/useLargeText\(\)/);
  expect(body(mine, "rowLarge")).toMatch(/flexDirection\s*:\s*"column"/);
  expect(body(mine, "rowLarge")).toMatch(/alignItems\s*:\s*"flex-start"/);
  const c = body(mine, "needTitleLarge") as string;
  expect(c).toMatch(/\bflex\s*:\s*0\b/);
  // Seen on a device (Run 6 part 18): with `alignSelf: "stretch"` AND `maxFontSizeMultiplier` on the title, iOS reserves the frame for the
  // UNCAPPED size, so a three-line title sat above ~100 pt of empty card. The column container's `alignItems: "flex-start"` already gives
  // the text its natural width, so the stretch is dropped here (the other `*Large` copy styles carry no font cap and keep it).
  expect(c).not.toMatch(/alignSelf/);
  expect(c).toMatch(/flexGrow\s*:\s*0/);
  expect(c).toMatch(/flexBasis\s*:\s*"auto"/);
  expect(mine).toMatch(/styles\.row, large && styles\.rowLarge/);
  expect(mine).toMatch(/styles\.needTitle, large && styles\.needTitleLarge\]\}\s+maxFontSizeMultiplier=\{maxFontScale\.title\}/);
});
