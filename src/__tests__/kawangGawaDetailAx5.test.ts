/**
 * The volunteer's shift detail at AX5 (seen on `main` at `4dfa81e`, owner persona): the hero card put a 52 pt avatar beside a `flex: 1` `hero` title, so "Dog walking" broke mid-word
 * ("walkin / g") in a column about 200 pt wide. The rest (the date, the contact rows, the two consent checkboxes, "Request") flowed and fit.
 *
 * The same fixes as the rest of the AX5 work, above `fontScale > 1.5` only: the avatar | title row stacks, cancelling the surviving `flex: 1` with `flex: 0` (#189); the title is capped
 * (`maxFontScale.title`). Default-size layout is unchanged.
 *
 * A source scan in the style of homeAx5.test.ts; the device walk is the proof. Written in the same step as its fix (never seen red).
 */
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(__dirname, "..", "screens", "KawangGawaDetailScreen.tsx"), "utf-8");
const body = (name: string) => {
  const m = new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*\\{([^{}]*)\\}`).exec(src);
  return m ? m[1] : null;
};

test("the hero row stacks at large text and cancels the surviving flex: 1", () => {
  expect(src).toMatch(/useLargeText\(\)/);
  expect(body("heroRowLarge")).toMatch(/flexDirection\s*:\s*"column"/);
  expect(body("heroRowLarge")).toMatch(/alignItems\s*:\s*"flex-start"/);
  const t = body("heroTitleLarge") as string;
  expect(t).toMatch(/\bflex\s*:\s*0\b/);
  expect(t).toMatch(/alignSelf\s*:\s*"stretch"/);
  expect(t).toMatch(/flexGrow\s*:\s*0/);
  expect(t).toMatch(/flexBasis\s*:\s*"auto"/);
  expect(src).toMatch(/styles\.heroRow, large && styles\.heroRowLarge/);
  expect(src).toMatch(/styles\.heroTitle, large && styles\.heroTitleLarge\]\}\s+maxFontSizeMultiplier=\{maxFontScale\.title\}/);
});
