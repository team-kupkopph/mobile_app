/**
 * The "Contact support" screen (reached from Password changed's "Need help?") had no header and no back control, so a person who tapped
 * it could only leave by the system swipe-back (device walk, Run 6). It has a header with a back button that pops the stack,
 * like the other terminal auth screens. Review step 7b replaced the placeholder with a real screen (SupportScreen.tsx) and
 * this guard follows it, so the back control cannot be lost in the move.
 *
 * A source scan in the style of screenHeaderTitleAx5.test.ts; the device walk is the proof.
 */
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(__dirname, "..", "screens", "SupportScreen.tsx"), "utf-8");
const m = /export function SupportScreen\(([^)]*)\)\s*\{([\s\S]*?)\n\}\n/.exec(src);
const fn = m ? { args: m[1], body: m[2] } : null;

test("found the screen", () => {
  expect(src.length).toBeGreaterThan(200);
  expect(fn).not.toBeNull();
});

test("it receives the navigation prop", () => {
  expect((fn as { args: string }).args).toMatch(/navigation/);
});

test("it shows a header whose back pops the stack", () => {
  expect((fn as { body: string }).body).toMatch(/<ScreenHeader[^>]*title="Contact support"[^>]*onBack=\{\(\) => navigation\.goBack\(\)\}/);
});
