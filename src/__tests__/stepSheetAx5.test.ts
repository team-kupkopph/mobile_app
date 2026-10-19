/**
 * The applicant step sheet at AX5 (device walk, run1.indp, Interview step): with the note field focused the keyboard lifts the sheet past the
 * status bar and the "Skip" button ends up under the keyboard. Unlike ConfirmModal / SignupWall / DeclineSheet (sharedModalsAx5.test.ts) the
 * sheet had no ScrollView and no maxHeight, so nothing could scroll or shrink.
 *
 * The same fix as those: the content in a ScrollView under a `maxHeight` ("92%" of the keyboard-avoided root, so it shrinks with the keyboard),
 * the padding in the scroll content so a short sheet looks as before, and taps still reach the buttons while the keyboard is up.
 *
 * A source scan in the style of sharedModalsAx5.test.ts; the device walk is the proof.
 */
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(__dirname, "..", "components", "applicant", "StepSheet.tsx"), "utf-8");
const body = (name: string) => {
  const m = new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*\\{([^{}]*)\\}`).exec(src);
  return m ? m[1] : null;
};

test("found the sheet style", () => {
  expect(body("sheet")).not.toBeNull();
});

test("the sheet scrolls under a maxHeight", () => {
  expect(src).toMatch(/<ScrollView/);
  expect(body("sheet") as string).toMatch(/maxHeight\s*:\s*"\d+%"/);
});

test("the padding moved into the scroll content, so a short sheet looks as before", () => {
  const c = body("sheetContent") as string;
  expect(c).not.toBeNull();
  expect(c).toMatch(/padding\s*:\s*spacing\.lg/);
  expect(c).toMatch(/paddingBottom\s*:\s*36/);
  expect(body("sheet") as string).not.toMatch(/padding/);
});

test("buttons stay tappable while the keyboard is up", () => {
  expect(src).toMatch(/keyboardShouldPersistTaps\s*=\s*"handled"/);
});
