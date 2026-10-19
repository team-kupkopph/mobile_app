/**
 * A need's meta line read "Food · 0 Of 1 Received" (device walk, shelter Wishlist): the meta Text had `textTransform: "capitalize"`, which
 * upper-cases the first letter of every word, so "0 of 1 received" became "0 Of 1 Received". The transform was only there to capitalise the
 * lower-case category ("food"). The same style was on the Donate tab's need cards.
 *
 * The fix capitalises the category in code (`needCategoryLabel`) and drops the transform, so the progress copy keeps the case it is written in.
 *
 * A source scan in the style of needsRowsAx5.test.ts plus a unit test of the helper; the device walk is the proof.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { needCategoryLabel, needProgressLabel } from "../community";

const src = (f: string) => readFileSync(join(__dirname, "..", "screens", f), "utf-8");
const body = (s: string, name: string) => {
  const m = new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*\\{([^{}]*)\\}`).exec(s);
  return m ? m[1] : null;
};

describe.each([
  ["ShelterNeedsScreen.tsx", "meta"],
  ["DonateScreen.tsx", "needMeta"]
])("%s", (file, style) => {
  const s = src(file);
  test("found the meta style", () => {
    expect(body(s, style)).not.toBeNull();
  });
  test("does not capitalise every word of the meta line", () => {
    expect(body(s, style) as string).not.toMatch(/textTransform/);
  });
  test("capitalises only the category, in code", () => {
    expect(s).toMatch(/needCategoryLabel\(need\.category\)/);
  });
});

test("needCategoryLabel upper-cases the first letter only", () => {
  expect(needCategoryLabel("food")).toBe("Food");
  expect(needCategoryLabel("Food")).toBe("Food");
  expect(needCategoryLabel("")).toBe("");
});

test("the progress copy keeps its own case", () => {
  expect(`${needCategoryLabel("food")} · ${needProgressLabel(0, 1)}`).toBe("Food · 0 of 1 received");
});
