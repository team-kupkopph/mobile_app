/**
 * R6-F13 (#183) put `automaticallyAdjustKeyboardInsets` on the 17 AUTH screens' ScrollViews, so a focused field is scrolled above the keyboard instead of
 * sitting behind it (at AX5 a form is far taller than the screen). Every OTHER form screen has the same ScrollView + text input and the same gap: the
 * listing form, the need form, the donation-QR form, the stray report, the rescue offer / update / place forms, story compose, member verify, delete
 * account, the shift create / edit forms, report content, and the profile screen's inline name field.
 *
 * `keyboardCoversFieldAx5.test.ts` only scans the screens that use the auth kit; this scans EVERY screen that renders a text input (`<Field>`,
 * `<TextInput>` or the shift form's fields) inside a ScrollView, so the next form screen cannot be added without it. `DevMenuScreen` is dev-only.
 *
 * A source scan; the device walk (a field low in the listing form at AX5, with the keyboard up) is the proof. Written in the same step as its fix
 * (never seen red).
 */
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const SCREENS = join(__dirname, "..", "screens");
const read = (f: string) => readFileSync(join(SCREENS, f), "utf-8");
const INPUT = /<TextInput\b|<Field\b|<ShiftFormFields\b/;
const DEV_ONLY = ["DevMenuScreen.tsx"];

const scrollTags = (src: string) => [...src.matchAll(/<ScrollView\b[\s\S]*?[}"]\s*>/g)].map((m) => m[0]);
const files = readdirSync(SCREENS)
  .filter((f) => f.endsWith(".tsx") && !DEV_ONLY.includes(f))
  .filter((f) => INPUT.test(read(f)) && scrollTags(read(f)).length > 0);

describe("every form screen's ScrollView follows the keyboard", () => {
  it("the scan found the form screens and their ScrollViews (a guard that matches nothing proves nothing)", () => {
    expect(files.length).toBeGreaterThanOrEqual(20);
    for (const must of ["ListingFormScreen.tsx", "NeedFormScreen.tsx", "ReportStrayScreen.tsx", "StoryComposeScreen.tsx", "ShelterVolunteerCreateScreen.tsx"]) {
      expect(files).toContain(must);
    }
  });

  it.each(files)("%s: every ScrollView has automaticallyAdjustKeyboardInsets and keyboardShouldPersistTaps", (f) => {
    const tags = scrollTags(read(f));
    expect(tags.length).toBeGreaterThan(0);
    for (const t of tags) {
      expect(t).toMatch(/\bautomaticallyAdjustKeyboardInsets\b/);
      expect(t).toMatch(/keyboardShouldPersistTaps/);
    }
  });
});
