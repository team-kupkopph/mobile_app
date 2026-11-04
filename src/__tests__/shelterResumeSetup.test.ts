// NT-14 (shelter home test plan; owner decision 2026-11-04) · a signed-in shelter that quit onboarding after the email
// code has an account but no organization profile. Home said "Documents not sent yet" with no working button, You's card
// opened the document form under a guessed tier-1 (which the server refuses, 409 no_profile), You's "Organization profile"
// row said "couldn't load your profile… check your connection", and You called it a "Community rescue". Now:
// - ONLY `GET /shelter/profile` answering 404 `no_profile` means "setup not finished" (a network failure never does);
// - Home and You offer "Finish setting up your organization › Continue", which opens the tier picker in a signed-in
//   resume mode that goes straight to Org setup (no signup), then Contact → Phone → Documents → Home;
// - Contact skips the phone code when the number entered is the account's already-verified phone.
import { readFileSync } from "fs";
import { join } from "path";

import { Me } from "../api/types";
import { RESUME_SETUP, phoneAlreadyVerified, setupNeeded } from "../shelterSetup";

const read = (rel: string) => readFileSync(join(__dirname, "..", rel), "utf8");

describe("setupNeeded", () => {
  it("is true only for the server's 404 no_profile", () => {
    expect(setupNeeded({ ok: false, status: 404, data: { error: { code: "no_profile" } } })).toBe(true);
  });
  it("is false for a profile, a network failure, another error, or no answer yet", () => {
    expect(setupNeeded({ ok: true, status: 200, data: { org_name: "Paws" } })).toBe(false);
    expect(setupNeeded({ ok: false, status: 0, data: { error: { code: "network_error" } } })).toBe(false);
    expect(setupNeeded({ ok: false, status: 404, data: { error: { code: "not_found" } } })).toBe(false);
    expect(setupNeeded({ ok: false, status: 500, data: null })).toBe(false);
    expect(setupNeeded(null)).toBe(false);
  });
});

describe("phoneAlreadyVerified", () => {
  const me = (p: Partial<Me>) => ({ phone: "+639171234567", phone_verified_at: "2030-01-01T00:00:00Z", ...p }) as Me;
  it("the same number, verified: skip the code", () => {
    expect(phoneAlreadyVerified(me({}), "+639171234567")).toBe(true);
  });
  it("a different number, an unverified one, or no /me: send the code", () => {
    expect(phoneAlreadyVerified(me({}), "+639170000000")).toBe(false);
    expect(phoneAlreadyVerified(me({ phone_verified_at: null }), "+639171234567")).toBe(false);
    expect(phoneAlreadyVerified(null, "+639171234567")).toBe(false);
  });
});

describe("the copy (owner-approved 2026-11-04)", () => {
  it("is the approved wording", () => {
    expect(RESUME_SETUP).toEqual({
      title: "Finish setting up your organization",
      body: "Add your organization's name and type, then upload your documents.",
      cta: "Continue ›"
    });
  });
});

describe("screens", () => {
  it("the tier picker has a signed-in resume mode that skips signup", () => {
    const tier = read("screens/ShelterTierScreen.tsx");
    expect(tier).toMatch(/const resume = route\.params\?\.resume === true;/);
    expect(tier).toMatch(/if \(resume\) \{\s*navigation\.navigate\("shelterSetup", \{ tier \}\);\s*return;\s*\}/);
    expect(tier).toMatch(/resume \? "Finish setting up" : "Shelter type"/);
    expect(read("navigation/types.ts")).toMatch(/shelterTier: \{ social\?: SocialIdentity; resume\?: true \} \| undefined;/);
  });

  it("Home: the banner offers the resume route when setup is not finished", () => {
    const home = read("screens/ShelterDashboardScreen.tsx");
    expect(home).toMatch(/setNeedsSetup\(setupNeeded\(r\)\)/);
    expect(home).toMatch(/if \(needsSetup\) \{\s*navigation\.navigate\("shelterTier", \{ resume: true \}\);\s*return;\s*\}/);
    expect(home).toMatch(/RESUME_SETUP\.title/);
  });

  it("You: the card and the Organization profile row both open the resume route", () => {
    const you = read("screens/ShelterProfileScreen.tsx");
    expect(you).toMatch(/setNeedsSetup\(setupNeeded\(r\)\)/);
    expect((you.match(/navigation\.navigate\("shelterTier", \{ resume: true \}\)/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(you).toMatch(/needsSetup \? null : <Text style=\{styles\.orgSub\}>/);
  });

  it("Contact skips the code for the already-verified number", () => {
    const contact = read("screens/ShelterContactScreen.tsx");
    expect(contact).toMatch(/if \(phoneAlreadyVerified\(me, e164\)\) \{\s*navigation\.navigate\("shelterVerify", \{ tier \}\);\s*return;\s*\}/);
  });
});
