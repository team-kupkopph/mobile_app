/**
 * R2-F2 fix · SigninScreen carries two dev-only chips that mint tokens via
 * /auth/dev/seed_tokens for the two e2e fixture personas. The chips are what Maestro
 * flow 25 (and any sibling e2e flow) uses to sign in, because iOS 26.5's secure field
 * drops Maestro's inputText after clearKeychain + clearState. Pin the testIDs, the
 * target emails, the IS_DEV_PROFILE gate and the DevMenu-equivalent seed path.
 */
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(__dirname, "..", "screens", "SigninScreen.tsx"), "utf8");

describe("SigninScreen · dev-seed chips (R2-F2)", () => {
  it("gates the chips on IS_DEV_PROFILE (same gate SignupWall uses)", () => {
    expect(src).toMatch(/Constants\.expoConfig\?\.extra\?\.profile === "development"/);
    expect(src).toMatch(/\{IS_DEV_PROFILE \? \(/);
  });

  it("renders a chip for each fixture persona with Maestro-friendly testIDs", () => {
    expect(src).toMatch(/testID="btn\.signin\.devSeedOwner"/);
    expect(src).toMatch(/testID="btn\.signin\.devSeedShelter"/);
    expect(src).toMatch(/"e2e\.owner@kupkop\.invalid"/);
    expect(src).toMatch(/"e2e\.shelter@kupkop\.invalid"/);
  });

  it("mints tokens via /auth/dev/seed_tokens and lands on home — same path DevMenuScreen uses", () => {
    expect(src).toMatch(/api\.post\("\/auth\/dev\/seed_tokens", \{ email: seedEmail \}\)/);
    expect(src).toMatch(/setTokens\(\{ access: res\.data\.access, refresh: res\.data\.refresh \}\)/);
    expect(src).toMatch(/navigation\.reset\(\{ index: 0, routes: \[\{ name: "home" \}\] \}\)/);
  });

  it("surfaces a reachable-server error without disabling the chips", () => {
    expect(src).toMatch(/"Couldn't reach the server\. Check your connection and try again\."/);
    // The chips reuse SigninScreen's `submitting` guard (if (submitting) return) rather than
    // a disabled prop — same rule as the main Log in button and the design system.
    expect(src).toMatch(/if \(submitting\) return;/);
  });
});
