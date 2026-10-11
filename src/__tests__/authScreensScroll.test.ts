/**
 * R6-F8 · AX-1 — The auth and onboarding screens did not scroll at Dynamic Type AX5 (Run 6 part 8,
 * walked on the device): Forgot password's email field sat on the bottom edge with "Send code" out of
 * reach, sign-up's account-type step offered only its first choice, and sign-up's details step showed
 * only Full name and Email, so a person at AX5 could not create an account or reset a password. Log in
 * had the same fault and was fixed in #176 (R6-F7). Every one of these screens put its content in a plain
 * `<View style={{ flex: 1 }}>`; the same layout fails on a small phone with the keyboard open.
 *
 * Each now uses a ScrollView whose content grows to the screen (`flexGrow`, so a short screen is
 * unchanged) and `keyboardShouldPersistTaps="handled"` (so the first tap on a button still lands with
 * the keyboard up). Two guards: the twelve screens named here, and a scan of every screen that uses the
 * shared auth kit, so a thirteenth cannot arrive without scrolling.
 *
 * A source scan in the style of signinScroll.test.ts; the device walk is still the proof.
 */
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const SCREENS = join(__dirname, "..", "screens");
const read = (f: string) => readFileSync(join(SCREENS, f), "utf-8");

const NAMED = [
  "SignupScreen", "AccountTypeScreen", "ForgotPasswordScreen", "OtpScreen", "ResetOtpScreen",
  "ResetPasswordScreen", "VerifyPhoneScreen", "ShelterPhoneVerifyScreen", "ShelterTierScreen",
  "SignupSuccessScreen", "PasswordChangedScreen", "OtpLockedScreen"
];

/** The body of a `content: { ... }` StyleSheet entry (one-line or multi-line), or null. */
function contentStyle(src: string): string | null {
  const m = /(?:^|\n)\s*content\s*:\s*\{([^{}]*)\}/.exec(src);
  return m ? m[1] : null;
}

describe.each(NAMED)("%s scrolls (R6-F8)", (name) => {
  const src = read(`${name}.tsx`);

  it("imports ScrollView from react-native", () => {
    expect(src).toMatch(/import\s*\{[^}]*\bScrollView\b[^}]*\}\s*from\s*"react-native"/s);
  });

  it("has exactly one ScrollView, around the content, with the persist-taps setting", () => {
    expect(src.match(/<ScrollView\b/g)).toHaveLength(1);
    expect(src.match(/<\/ScrollView>/g)).toHaveLength(1);
    const tag = (/<ScrollView[^>]*>/s.exec(src) as RegExpExecArray)[0];
    expect(tag).toMatch(/keyboardShouldPersistTaps="handled"/);
    expect(tag).toMatch(/contentContainerStyle=\{styles\.content\}/);
  });

  it("no longer wraps the content in a plain View", () => {
    expect(src).not.toContain("<View style={styles.content}>");
  });

  it("the content grows to the screen instead of being pinned to it", () => {
    const body = contentStyle(src);
    expect(body).not.toBeNull();
    expect(body).toMatch(/flexGrow\s*:\s*1/);
    expect(body).not.toMatch(/\bflex\s*:\s*1/);
    expect(body).toMatch(/paddingBottom\s*:/);
  });
});

describe("every screen that uses the shared auth kit scrolls (R6-F8)", () => {
  const files = readdirSync(SCREENS)
    .filter((f) => f.endsWith(".tsx") && f !== "AuthFormKit.tsx")
    .filter((f) => /<SimpleHeader\b|from "\.\/AuthFormKit"/.test(read(f)));

  it("the scan found the auth screens (a guard that matches nothing proves nothing)", () => {
    expect(files.length).toBeGreaterThanOrEqual(17);
    for (const n of NAMED) expect(files).toContain(`${n}.tsx`);
    expect(files).toContain("SigninScreen.tsx");
  });

  it("each has a ScrollView", () => {
    const without = files.filter((f) => !/<ScrollView\b/.test(read(f)));
    expect(without).toEqual([]);
  });
});
