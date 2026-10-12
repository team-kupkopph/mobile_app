/**
 * R6-F11 · AX-1 — On the code screens the six code boxes are a fixed 46 x 56 pt, and the digit inside is a
 * 22 pt text that follows Dynamic Type. At AX5 (about 3x) each digit comes out as tall as its box and spills over
 * the box edges; the sixth touches the screen edge (seen on the sign-up OTP in the Run 6 part 9 walk; the error
 * border of the expired-code state draws the box bounds around the digits). The same "text in a fixed shape" fault
 * as R6-F5 (avatar initials, back chevron) and R6-F10's card glyphs.
 *
 * The digits are content a person reads, so they are capped (`maxFontScale.code`) rather than frozen: they still
 * grow with the setting, but not past their box. Five screens each define their own `otpBox`.
 *
 * A source scan in the style of titleScaleAx5.test.ts and fixedTileGlyphs.test.ts; the device walk is the proof.
 */
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { maxFontScale } from "../theme";

const SCREENS = join(__dirname, "..", "screens");
const read = (f: string) => readFileSync(join(SCREENS, f), "utf-8");

const CODE_SCREENS = [
  "OtpScreen.tsx",
  "ResetOtpScreen.tsx",
  "VerifyPhoneScreen.tsx",
  "ShelterPhoneVerifyScreen.tsx",
  "OtpLockedScreen.tsx"
];

/** The element that draws a digit: the box's TextInput, or (OtpLockedScreen) the Text inside the box. */
function digitElements(src: string): string[] {
  const out: string[] = [];
  // Whole self-closing element: the props contain `=>`, so a `[^>]*` tag pattern would stop inside them.
  for (const m of src.matchAll(/<TextInput\b[\s\S]*?\/>/g)) if (/styles\.otpBox\b/.test(m[0])) out.push(m[0]);
  for (const m of src.matchAll(/<Text\b[^>]*style=\{styles\.otpDigit\}[^>]*>/g)) out.push(m[0]);
  return out;
}

describe("maxFontScale.code (R6-F11)", () => {
  it("lets a digit grow with the setting, but keeps it inside a 56 pt box", () => {
    // 22 pt x cap x ~1.2 line height must fit in 56 pt: cap <= ~2. Below 1.2 it would barely follow the setting.
    expect(maxFontScale.code).toBeGreaterThanOrEqual(1.2);
    expect(maxFontScale.code).toBeLessThanOrEqual(1.8);
  });
});

describe("every code box's digit is capped (R6-F11)", () => {
  it("the scan found a digit in each of the five code screens (a guard that matches nothing proves nothing)", () => {
    for (const f of CODE_SCREENS) expect(digitElements(read(f)).length).toBeGreaterThan(0);
  });

  it.each(CODE_SCREENS)("%s: the digit carries maxFontSizeMultiplier={maxFontScale.code}", (f) => {
    const src = read(f);
    for (const el of digitElements(src)) {
      expect(el).toMatch(/maxFontSizeMultiplier=\{maxFontScale\.code\}/);
    }
    expect(src).toMatch(/import\s*\{[^}]*\bmaxFontScale\b[^}]*\}\s*from\s*"\.\.\/theme"/);
  });

  it("no other screen defines code boxes without being in the list (a new one cannot skip the cap)", () => {
    const owners = readdirSync(SCREENS)
      .filter((f) => f.endsWith(".tsx"))
      .filter((f) => /\botpBox\s*:\s*\{/.test(read(f)));
    expect(owners.sort()).toEqual([...CODE_SCREENS].sort());
  });
});
