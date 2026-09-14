/**
 * Test-plan finding F8 (device, 2026-09-14): a RETURNING Google user saw "How will you join?"
 * and then "You're in! Your email is verified" on every sign-in. The backend's
 * POST /auth/social/{provider} answers `is_new: false` when the identity or the email already
 * belongs to an account — and the client ignored it, so a returning user was walked through
 * the first-signup recap, and a tap on "Shelter / Organization" would have posted
 * `account_type: shelter` for an existing personal account (the server ignores the field for
 * existing accounts, but the question was wrong).
 *
 * The routing decision is one pure helper, so both screens that post to the social endpoint
 * make the same call: returning → tokens + reset to home (OtpScreen's unverified-resume branch
 * is the precedent); new → carry on with the signup they chose.
 */
import { readFileSync } from "fs";
import { join } from "path";

import { isReturningSocialAccount } from "../auth/socialRouting";

const read = (rel: string) => readFileSync(join(__dirname, "..", rel), "utf8");
const accountType = read("screens/AccountTypeScreen.tsx");
const shelterTier = read("screens/ShelterTierScreen.tsx");

describe("isReturningSocialAccount", () => {
  it("is true when the backend says the identity already belonged to an account", () => {
    expect(isReturningSocialAccount({ is_new: false, access: "a", refresh: "r" })).toBe(true);
  });
  it("is false when the backend just created the account", () => {
    expect(isReturningSocialAccount({ is_new: true, access: "a", refresh: "r" })).toBe(false);
  });
  it("treats a missing flag as new — the pre-existing behaviour, never a silent home reset", () => {
    expect(isReturningSocialAccount({ access: "a", refresh: "r" })).toBe(false);
    expect(isReturningSocialAccount({})).toBe(false);
    expect(isReturningSocialAccount(null)).toBe(false);
    expect(isReturningSocialAccount(undefined)).toBe(false);
  });
});

describe("the two screens that post to /auth/social", () => {
  it("both route on the helper, not on their own reading of the response", () => {
    for (const src of [accountType, shelterTier]) {
      expect(src).toMatch(/import \{ isReturningSocialAccount \} from "\.\.\/auth\/socialRouting";/);
      expect(src).toMatch(/isReturningSocialAccount\(res\.data\)/);
      expect(src).not.toMatch(/res\.data\.is_new/);
    }
  });

  it("reset a returning user straight to home after setting tokens (OtpScreen's resume branch)", () => {
    for (const src of [accountType, shelterTier]) {
      expect(src).toMatch(/navigation\.reset\(\{ index: 0, routes: \[\{ name: "home" \}\] \}\);/);
    }
  });

  it("still send a new pet owner to signupSuccess and a new shelter to shelterSetup", () => {
    expect(accountType).toMatch(/navigation\.navigate\("signupSuccess"\)/);
    expect(shelterTier).toMatch(/navigation\.navigate\("shelterSetup", \{ tier \}\)/);
  });

  it("say why a returning user still sees the chooser for one tap", () => {
    // The backend decides identity on the same call that creates the account; there is no
    // lookup that does not create. Whoever removes this comment should be removing the reason.
    expect(accountType).toMatch(/same call that creates/);
  });
});
