/**
 * The shared dialogs and the failed-load state at AX5 (static risk from `dev/handoff-ax5.md`, then seen on a device where noted): `LoadStateView`'s
 * "Try again" was a fixed `height: 38` pill; `ConfirmModal`'s buttons were fixed `height: 52` / `44`, and neither it, `SignupWall` nor `DeclineSheet`
 * could scroll, so a dialog whose text outgrew the screen at AX5 pushed its buttons off it.
 *
 * The same fixes as the rest of the AX5 work: `minHeight` + padding instead of a fixed `height`, and the dialog's content in a ScrollView under a
 * `maxHeight`, so a short dialog is exactly as before and a tall one scrolls. Default-size layout is unchanged.
 *
 * A source scan in the style of homeAx5.test.ts; the device walk is the proof. Written in the same step as its fix (never seen red).
 */
import { readFileSync } from "fs";
import { join } from "path";

const comp = (...p: string[]) => readFileSync(join(__dirname, "..", "components", ...p), "utf-8");
const load = comp("LoadStateView.tsx");
const confirm = comp("ConfirmModal.tsx");
const wall = comp("SignupWall.tsx");
const decline = comp("applicant", "DeclineSheet.tsx");
const body = (s: string, name: string) => {
  const m = new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*\\{([^{}]*)\\}`).exec(s);
  return m ? m[1] : null;
};
const fixedHeight = /(^|[^a-zA-Z])height\s*:/;

test.each([
  ["LoadStateView", load, "retry"],
  ["ConfirmModal", confirm, "confirmButton"],
  ["ConfirmModal", confirm, "cancelButton"]
])("%s's %s grows with its text", (_n, src, style) => {
  const b = body(src, style) as string;
  expect(b).not.toBeNull();
  expect(b).not.toMatch(fixedHeight);
  expect(b).toMatch(/minHeight\s*:/);
  expect(b).toMatch(/paddingVertical\s*:/);
});

describe.each([
  ["ConfirmModal", confirm, "card"],
  ["SignupWall", wall, "sheet"],
  ["DeclineSheet", decline, "sheet"]
])("%s", (_n, src, container) => {
  test("scrolls under a maxHeight", () => {
    expect(src).toMatch(/<ScrollView/);
    const b = body(src, container) as string;
    expect(b).not.toBeNull();
    expect(b).toMatch(/maxHeight\s*:\s*"\d+%"/);
  });
});

test("the SignupWall's padding moved into the scroll content, so a short sheet looks as before", () => {
  const c = body(wall, "sheetContent") as string;
  expect(c).toMatch(/paddingHorizontal\s*:\s*28/);
  expect(c).toMatch(/paddingBottom\s*:\s*34/);
  expect(c).toMatch(/alignItems\s*:\s*"center"/);
});
