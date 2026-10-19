/**
 * The "Contact support" placeholder (reached from Password changed's "Need help?") had no header and no back control, so a person who tapped
 * it could only leave by the system swipe-back (device walk, Run 6). It now has a header with a back button that pops the
 * stack, like the other terminal auth screens.
 *
 * A source scan in the style of screenHeaderTitleAx5.test.ts; the device walk is the proof.
 */
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(__dirname, "..", "navigation", "RootNavigator.tsx"), "utf-8");
const fn = (() => {
  const m = /function PlaceholderSupport\(([^)]*)\)\s*\{([\s\S]*?)\n\}\n/.exec(src);
  return m ? { args: m[1], body: m[2] } : null;
})();

test("found the placeholder", () => {
  expect(fn).not.toBeNull();
});

test("it receives the navigation prop", () => {
  expect((fn as { args: string }).args).toMatch(/navigation/);
});

test("it shows a header whose back pops the stack", () => {
  const b = (fn as { body: string }).body;
  expect(b).toMatch(/<ScreenHeader[^>]*title="Contact support"[^>]*onBack=\{\(\) => navigation\.goBack\(\)\}/);
});

test("the title is not repeated in the body", () => {
  expect((fn as { body: string }).body).not.toMatch(/<Text style=\{styles\.lockedTitle\}>/);
});
