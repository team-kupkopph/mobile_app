/**
 * §12 · account-enumeration asymmetry, locked down.
 *
 * THE RULE, and it is deliberately asymmetric:
 *
 *   · SIGNUP may say "that email is already registered" — the user cannot proceed otherwise,
 *     so withholding it would just be a broken form.
 *   · SIGN-IN and every PASSWORD-RECOVERY screen must stay generic. If they distinguish "no
 *     such account" from "wrong password", the form becomes an oracle: anyone can test an
 *     email list against it and learn who has an account here. For an app whose users include
 *     rescuers and shelter staff, that is a real disclosure, not a theoretical one.
 *
 * WHY THIS FILE EXISTS RATHER THAN A COMMENT. The rule is currently satisfied by prose in
 * three places — SigninScreen's generic "Email or password is incorrect.", ForgotPassword's
 * "Generic on purpose: advance the same way whether or not the email exists", and the absence
 * of any existence claim in the reset flow. Prose does not survive a helpful refactor. US-AU1
 * has just rewritten error handling across five auth screens; the next such pass has nothing
 * stopping it "improving" one of these messages into a leak.
 */
import { readFileSync } from "fs";
import { join } from "path";

const SCREENS = join(__dirname, "..", "screens");
const read = (f: string) => readFileSync(join(SCREENS, f), "utf8");

/** Screens where a message may never depend on whether the account exists. */
const MUST_STAY_GENERIC = [
  "SigninScreen.tsx",
  "ForgotPasswordScreen.tsx",
  "ResetOtpScreen.tsx",
  "ResetPasswordScreen.tsx"
];

/** The one screen permitted to confirm existence. */
const MAY_DISCLOSE = "SignupScreen.tsx";

/**
 * Phrasings that tell the reader an account does or does not exist. Matched against string and
 * template literals only — a comment explaining the rule must not trip it.
 */
const DISCLOSURE =
  /(no account|not registered|isn'?t registered|does ?n'?t exist|never registered|unknown email|email not found|account not found|no user)/i;

function literals(src: string): string[] {
  const withoutComments = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  return [
    ...(withoutComments.match(/"[^"\n]*"/g) ?? []),
    ...(withoutComments.match(/`[^`]*`/g) ?? [])
  ];
}

describe("account-enumeration asymmetry", () => {
  it("has the screens it means to check", () => {
    // ⚠️ Assert the scan found something before trusting that it found nothing.
    expect(MUST_STAY_GENERIC.every((f) => read(f).length > 0)).toBe(true);
    expect(MUST_STAY_GENERIC.flatMap((f) => literals(read(f))).length).toBeGreaterThan(10);
  });

  it.each(MUST_STAY_GENERIC)("%s never reveals whether an account exists", (file) => {
    const offenders = literals(read(file)).filter((l) => DISCLOSURE.test(l));
    expect(offenders).toEqual([]);
  });

  it("sign-in's failure message does not separate the two causes", () => {
    // The message names both possibilities at once, which is what makes it useless as an oracle.
    expect(read("SigninScreen.tsx")).toContain("Email or password is incorrect.");
  });

  it("forgot-password advances the same way regardless of the response", () => {
    const src = read("ForgotPasswordScreen.tsx");
    // The navigate sits in a `finally`, so a 404 and a 200 leave by the same door.
    expect(/finally\s*\{[^}]*navigation\.navigate/s.test(src)).toBe(true);
  });

  it("signup remains the one screen allowed to say an email is taken", () => {
    expect(read(MAY_DISCLOSE)).toMatch(/already registered/i);
  });
});
