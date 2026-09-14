/**
 * F12 (test-plan run 2, 2026-09-14, row C-N5) · the three phone screens sent whatever was
 * typed to POST /me/phone, so `0281234567` (a Manila landline) got an SMS code issued to it
 * and was stored verbatim. dev/onboarding-validation.md rule 5: a PH mobile is 10 digits
 * after +63, first digit 9; every spelling normalises to E.164 before anything is checked.
 */
import { PH_MOBILE_RULE, normalizePhMobile, phoneError } from "../phone";

describe("normalizePhMobile", () => {
  it.each([
    "09171234567",
    "9171234567",
    "+639171234567",
    "639171234567",
    "0917 123 4567",
    "+63 917 123 4567",
    "63 917 123 4567",
    "0917-123-4567",
    "+63 (917) 123-4567",
    "  09171234567  "
  ])("normalises %j to +639171234567", (raw) => {
    expect(normalizePhMobile(raw)).toBe("+639171234567");
  });

  it.each([
    "0281234567",      // Manila landline — the F12 repro
    "+6328123 4567",
    "6328 1234567",
    "0812345678",      // not a 9-series number
    "+638123456789",
    "0917123456",      // too short
    "091712345678",    // too long
    "+63917123456",
    "+19171234567",    // wrong country
    "917123456a",
    "",
    "   ",
    "+63"
  ])("refuses %j", (raw) => {
    expect(normalizePhMobile(raw)).toBeUndefined();
  });
});

describe("phoneError", () => {
  it("names the rule, with the example, for anything that doesn't normalise", () => {
    expect(PH_MOBILE_RULE).toBe("Enter a Philippine mobile number, e.g. 0917 123 4567");
    expect(phoneError("0281234567")).toBe(PH_MOBILE_RULE);
    expect(phoneError("917 12")).toBe(PH_MOBILE_RULE);
  });

  it("asks for the number when the field is empty", () => {
    expect(phoneError("")).toBe("Enter a mobile number.");
    expect(phoneError("   ")).toBe("Enter a mobile number.");
  });

  it("is silent for an acceptable number, however it was spelled", () => {
    expect(phoneError("0917 123 4567")).toBeUndefined();
    expect(phoneError("+639171234567")).toBeUndefined();
  });
});

// The rule only holds if every screen that sends a phone goes through it. Source-scanning
// guard in the style of socialLink.test.ts.
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

describe("every screen that sends a phone validates and normalises it with the helper", () => {
  const SCREENS = join(__dirname, "..", "screens");
  const senders = readdirSync(SCREENS)
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => ({ f, src: readFileSync(join(SCREENS, f), "utf8") }))
    .filter(({ src }) => /"\/me\/phone"|official_phone:/.test(src));

  it("found the senders", () => {
    expect(senders.map(({ f }) => f).sort()).toEqual([
      "ShelterContactScreen.tsx", "ShelterPhoneVerifyScreen.tsx", "VerifyPhoneScreen.tsx"
    ]);
  });

  it.each(["ShelterContactScreen.tsx", "VerifyPhoneScreen.tsx"])("%s checks the format on blur and on submit, and sends the E.164 form", (f) => {
    const src = senders.find((s) => s.f === f)!.src;
    expect(src).toMatch(/import \{[^}]*\bphoneError\b[^}]*\} from "\.\.\/phone"/);
    expect(src).toMatch(/import \{[^}]*\bnormalizePhMobile\b[^}]*\} from "\.\.\/phone"/);
    // Rule 2: format fires on blur, not per keystroke.
    expect(src).toMatch(/onBlur=\{[^}]*phoneError\(/);
    // What is sent is the normalised form, never the raw trimmed text.
    expect(src).not.toMatch(/phone: \w+\.trim\(\)/);
    expect(src).not.toMatch(/official_phone: \w+\.trim\(\)/);
  });

  it("ShelterContactScreen hands the verify step the normalised number", () => {
    const src = senders.find((s) => s.f === "ShelterContactScreen.tsx")!.src;
    expect(src).toMatch(/navigate\("shelterPhoneVerify", \{ tier, phone: (?!phone\.trim)/);
  });

  it("ShelterPhoneVerifyScreen only resends the number ShelterContactScreen already normalised", () => {
    const src = senders.find((s) => s.f === "ShelterPhoneVerifyScreen.tsx")!.src;
    expect(src).toMatch(/phone \} = route\.params/);
    expect(src).not.toMatch(/<TextInput[^>]*keyboardType="phone-pad"/);
  });
});
