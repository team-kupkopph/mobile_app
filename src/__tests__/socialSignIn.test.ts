/**
 * The provider row is the canvas's, appears on both entry screens, and never offers Google
 * without Apple.
 *
 * ⚠️ WHAT THIS STORY IS AND IS NOT. The re-scan plan listed "Sign-in has no Apple" as a
 * structural gap and named `expo-apple-authentication` as the fix. Both halves of that were
 * off. The canvas draws the provider row on the LOG IN artboard, where the app had nothing —
 * not on Welcome, which has no artboard at all. And neither provider is wired: socialAuth.ts
 * and the backend's accounts/social.py are matching seams, both deliberately unfilled until
 * the Apple Developer Program (S0-05) and Google OAuth client (S0-06) exist, and both say
 * that installing the SDKs before then "would add native dependencies that cannot be
 * exercised". That decision stands. What this change ships is the designed row, on the
 * designed screen, through the existing seam — so both buttons say the same honest thing
 * today, and both light up together the day the credentials land.
 *
 * ⚠️ THE PAIRING IS THE INVARIANT, not the button. App Store Review Guideline 4.8 requires
 * Sign in with Apple wherever a third-party sign-in is offered. The old Welcome screen — one
 * full-width "Continue with Google", no Apple — was exactly that rejection. SocialSignIn takes
 * no `providers` prop so that shape cannot be rebuilt by passing a shorter list.
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";

import { typography } from "../theme";

const SRC = join(__dirname, "..");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");
const row = read("components/ui/SocialSignIn.tsx");
const welcome = read("WelcomeScreen.tsx");
const signin = read("screens/SigninScreen.tsx");
const icons = read("components/AppIcons.tsx");

function findCanvas(): string | null {
  let dir = __dirname;
  for (let i = 0; i < 8; i++) {
    const c = join(dir, "design", "mobile-v3", "SignIn.dc.html");
    if (existsSync(c)) return c;
    const up = dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return null;
}
const canvasPath = findCanvas();
const canvas = canvasPath ? readFileSync(canvasPath, "utf8") : "";
const describeParity = canvasPath ? describe : describe.skip;
if (!canvasPath) {
  // eslint-disable-next-line no-console
  console.warn("[social] design/mobile-v3 not found — parity assertions skipped, not failed.");
}

describe("the provider row", () => {
  it("always renders Apple beside Google, and cannot be told otherwise", () => {
    expect(row).toMatch(/\{ id: "google", label: "Google" \}/);
    expect(row).toMatch(/\{ id: "apple", label: "Apple" \}/);
    // No way to pass a subset. The prop must not exist.
    expect(row).not.toMatch(/providers\??:/);
  });

  it("claims its own width, whatever its parent does", () => {
    // Found on device: Log in centres its children, Welcome does not, and the row collapsed
    // on one and not the other. `alignSelf: "stretch"` on the root is what makes a shared
    // component render the same in both.
    expect(row).toMatch(/wrap: \{[\s\S]*?alignSelf: "stretch"/);
    expect(row).toMatch(/<View style=\{styles\.wrap\}>/);
    expect(read("screens/SigninScreen.tsx")).toMatch(/content: \{[\s\S]*?alignItems: "center"/);
  });

  it("is rendered on both entry screens, with distinct selectors", () => {
    expect(welcome).toMatch(/<SocialSignIn testIDPrefix="welcome"/);
    expect(signin).toMatch(/<SocialSignIn testIDPrefix="signin"/);
    expect(row).toMatch(/testID=\{`btn\.\$\{testIDPrefix\}\.\$\{id\}`\}/);
  });

  it("left no lone Google button behind on Welcome", () => {
    // The 4.8 shape: a Google control with no Apple beside it.
    expect(welcome).not.toMatch(/btn\.welcome\.google/);
    expect(welcome).not.toMatch(/continueWithGoogle/);
  });

  it("routes both screens through the one shared handler — the call, not the import", () => {
    // ⚠️ Two guards this sprint passed on an unused import.
    expect(welcome).toMatch(/onSocial\?\.\(p\)/);
    expect(signin).toMatch(/const onSocial = useSocialSignIn\(navigation\)/);
    expect(read("navigation/RootNavigator.tsx")).toMatch(/const onSocial = useSocialSignIn\(navigation\)/);
    // And the handler is no longer duplicated in the navigator.
    expect(read("navigation/RootNavigator.tsx")).not.toMatch(/Alert\.alert\(/);
  });

  it("tints the Apple mark and never the Google one", () => {
    const apple = /export function AppleIcon[\s\S]*?\n\}/.exec(icons)![0];
    const google = /export function GoogleIcon[\s\S]*?\n\}/.exec(icons)![0];
    expect(apple).toMatch(/tintColor: color/);
    expect(google).not.toMatch(/tintColor/);
    for (const asset of ["apple-logo-white.png", "google-g.png"]) {
      expect(existsSync(join(SRC, "..", "assets", asset))).toBe(true);
    }
  });

  it("keeps the SDK-before-credentials rule for the provider that is still paperwork", () => {
    // 2026-09-13: S0-06 (Google) landed and expo-auth-session is installed for it —
    // googleSignIn.test.ts covers that flow. S0-05 (Apple) is deferred to before launch, so
    // its SDK stays out until its credentials exist. Reversing THIS is the deliberate act
    // that closes the Guideline 4.8 gap; see googleSignIn.test.ts for why the gap is named.
    const pkg = JSON.parse(readFileSync(join(SRC, "..", "package.json"), "utf8"));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(deps["expo-auth-session"]).toBeDefined();
    expect(deps["expo-apple-authentication"]).toBeUndefined();
  });
});

describeParity("the provider row matches the Log in artboard", () => {
  const google = /class="press" style="([^"]*)"[^>]*>\s*<svg[^>]*>(?:\s*<path[^>]*\/>)+\s*<\/svg>\s*<span style="([^"]*)">Google<\/span>/.exec(canvas);
  const divider = /gap:\s*14px;\s*margin-top:\s*(\d+)px;">\s*<div style="flex-grow: 1; height: 1px; background: (#[0-9A-F]{6});"><\/div>\s*<span style="font-size: (\d+)px; color: (#[0-9A-F]{6});">([^<]+)<\/span>/.exec(canvas);
  const rowBox = /<div style="display: flex; gap: (\d+)px; margin-top: (\d+)px;">\s*<div class="press"/.exec(canvas);

  it("located the pill, the divider and the row in the artboard", () => {
    expect(google).not.toBeNull();
    expect(divider).not.toBeNull();
    expect(rowBox).not.toBeNull();
  });

  it("has the artboard's pill: 52 tall, fully rounded, soft shadow, 9 between mark and label", () => {
    const pillStyle = google![1];
    expect(pillStyle).toMatch(/height: 52px/);
    expect(pillStyle).toMatch(/border-radius: 26px/);
    expect(pillStyle).toMatch(/gap: 9px/);
    expect(pillStyle).toMatch(/var\(--sh-soft\)/);
    expect(row).toMatch(/const HEIGHT = 52;/);
    expect(row).toMatch(/borderRadius: pill\(HEIGHT\)/); // 26, and stays half the height
    expect(row).toMatch(/gap: 9,/);
    expect(row).toMatch(/\.\.\.elevation\.soft/);
  });

  it("sets the label at the artboard's 15 / 700 — which is now the `strong` step", () => {
    expect(google![2]).toMatch(/font-size: 15px; font-weight: 700/);
    // Written as a literal when the ramp had no bold fifteen; bound the day it gained one.
    expect(row).toMatch(/\.\.\.typography\.strong,\s*fontWeight: "700"/);
    expect(typography.strong.fontSize).toBe(15);
  });

  it("draws the mark at the artboard's 19", () => {
    expect(canvas).toMatch(/<svg width="19" height="19" viewBox="0 0 24 24">/);
    expect(row).toMatch(/const MARK = 19;/);
  });

  it("spaces the divider and row as the artboard does", () => {
    expect(Number(divider![1])).toBe(26);
    expect(Number(rowBox![2])).toBe(18);
    expect(Number(rowBox![1])).toBe(12);
    expect(row).toMatch(/divider: \{[\s\S]*?marginTop: 26/);
    expect(row).toMatch(/row: \{[\s\S]*?gap: 12,\s*marginTop: 18/);
  });

  it("uses the artboard's caption, verbatim", () => {
    expect(divider![5]).toBe("or continue with");
    expect(row).toMatch(/caption = "or continue with"/);
  });
});
