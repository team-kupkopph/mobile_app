/**
 * R6-F13 · AX-1 — At Dynamic Type AX5 a focused text field on the auth screens sits behind the keyboard: the page
 * does not scroll the field into view, so a person types blind (seen on sign-up details, on Forgot password and on
 * the code screens in the Run 6 part 9 walk; it is also why a scripted tap-by-id typed one field's text into the
 * previous field). AX5 makes it obvious because the form is much taller than the screen, but it follows from the
 * screens' layout, not from the text size alone.
 *
 * The auth screens became ScrollViews in R6-F7/F8 (#176, #177) for this reason. A ScrollView on iOS does not move
 * for the keyboard by itself; `automaticallyAdjustKeyboardInsets` makes it add a bottom inset for the keyboard and
 * scroll the focused input into view. Android already resizes the window.
 *
 * A source scan in the style of authScreensScroll.test.ts; the device walk is the proof.
 */
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const SCREENS = join(__dirname, "..", "screens");
const read = (f: string) => readFileSync(join(SCREENS, f), "utf-8");

const files = readdirSync(SCREENS)
  .filter((f) => f.endsWith(".tsx") && f !== "AuthFormKit.tsx")
  .filter((f) => /<SimpleHeader\b|from "\.\/AuthFormKit"/.test(read(f)));

/** Each `<ScrollView ...>` opening tag (the props contain `=>` rarely, but end in `}` or `"` before the `>`). */
const scrollTags = (src: string) => [...src.matchAll(/<ScrollView\b[\s\S]*?[}"]\s*>/g)].map((m) => m[0]);

describe("the auth screens' ScrollViews follow the keyboard (R6-F13)", () => {
  it("the scan found the screens and their ScrollViews (a guard that matches nothing proves nothing)", () => {
    expect(files.length).toBeGreaterThanOrEqual(17);
    const tags = files.flatMap((f) => scrollTags(read(f)));
    expect(tags.length).toBeGreaterThanOrEqual(15);
    for (const t of tags) expect(t).toMatch(/keyboardShouldPersistTaps/);
  });

  it.each(files)("%s: its ScrollView has automaticallyAdjustKeyboardInsets", (f) => {
    const tags = scrollTags(read(f));
    expect(tags.length).toBeGreaterThan(0);
    for (const t of tags) expect(t).toMatch(/\bautomaticallyAdjustKeyboardInsets\b/);
  });
});
