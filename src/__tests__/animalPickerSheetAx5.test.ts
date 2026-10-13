/**
 * The shelter's animal picker sheets ("Assign an animal" on a Pending card's Approve, "Change the assigned animal" on a Confirmed card) at AX5
 * (seen on `main` at `170e179`, Run 6 part 18, after #218-#226 fixed the sheets' header and skip button): the sheet is capped at 78% of the screen
 * and holds a header, a sub-line, the animal list (a ScrollView) and the pinned Skip / Clear button. At AX5 the header, sub-line and button alone fill
 * the 78%, so the list ScrollView had no height: **the shelter's animals were not on the sheet at all**, only "Skip", and a walking shift's volunteer
 * could not be given an animal.
 *
 * Fix at large text only (the default-size tree is unchanged): the sheet may use 92% of the screen, the title is capped, and the Skip / Clear
 * button moves inside the list's ScrollView so the whole body scrolls as one (above `fontScale > 1.5`; at default size it stays pinned below the list).
 *
 * A source scan in the style of needsRowsAx5.test.ts; the device walk is the proof.
 */
import { readFileSync } from "fs";
import { join } from "path";

const comp = (f: string) => readFileSync(join(__dirname, "..", "components", "shelterVolunteer", f), "utf-8");
const body = (s: string, name: string) => {
  const m = new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*\\{([^{}]*)\\}`).exec(s);
  return m ? m[1] : null;
};

describe.each([
  ["PendingSection", comp("PendingSection.tsx")],
  ["ConfirmedSection", comp("ConfirmedSection.tsx")]
])("%s's animal picker sheet", (_n, s) => {
  it("the scan found the styles (a guard that matches nothing proves nothing)", () => {
    for (const n of ["pickerSheet", "pickerTitle", "pickerList", "skipBtn"]) expect(body(s, n)).not.toBeNull();
    expect(s).toMatch(/const large = useLargeText\(\)/);
  });
  it("lets the sheet use 92% of the screen when large", () => {
    expect(s).toMatch(/styles\.pickerSheet,\s*large && styles\.pickerSheetLarge/);
    expect(body(s, "pickerSheetLarge") as string).toMatch(/maxHeight\s*:\s*"92%"/);
  });
  it("caps the sheet title", () => {
    expect(s).toMatch(/styles\.pickerTitle\}\s+maxFontSizeMultiplier=\{maxFontScale\.title\}/);
  });
  it("moves the skip / clear button into the list's ScrollView when large, so the list cannot be squeezed to nothing", () => {
    expect(s).toMatch(/\{large \? skip : null\}/);
    expect(s).toMatch(/\{large \? null : skip\}/);
    expect(s).toMatch(/const skip = \(/);
  });
});
