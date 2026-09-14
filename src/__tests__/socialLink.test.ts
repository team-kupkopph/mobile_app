/**
 * F9 (test-plan, 2026-09-14) · the Verified Member / shelter "social link" only checked for
 * non-empty, so `javascript:alert(1)` went to the server and on to the reviewer console.
 * dev/onboarding-validation.md: required · parses as an http(s) URL · warn-don't-block if the
 * host isn't a known social domain.
 */
import { SOCIAL_LINK_RULE, normalizeSocialLink, socialLinkError, socialLinkNote } from "../socialLink";

describe("socialLinkError", () => {
  it("names the rule, with the example, when the field is empty", () => {
    expect(socialLinkError("")).toBe(SOCIAL_LINK_RULE);
    expect(socialLinkError("   ")).toBe(SOCIAL_LINK_RULE);
    expect(SOCIAL_LINK_RULE).toBe("Enter a link, e.g. https://facebook.com/yourpage");
  });

  it("refuses a non-http(s) scheme — the value is rendered to reviewers", () => {
    expect(socialLinkError("javascript:alert(1)")).toBe(SOCIAL_LINK_RULE);
    expect(socialLinkError("ftp://ana.rescues/x")).toBe(SOCIAL_LINK_RULE);
    expect(socialLinkError("data:text/html,hi")).toBe(SOCIAL_LINK_RULE);
  });

  it("refuses something that is not a URL at all", () => {
    expect(socialLinkError("not a url")).toBe(SOCIAL_LINK_RULE);
    expect(socialLinkError("https://")).toBe(SOCIAL_LINK_RULE);
    expect(socialLinkError("https://no-tld")).toBe(SOCIAL_LINK_RULE);
  });

  it("accepts http(s) links, social or not", () => {
    expect(socialLinkError("https://facebook.com/x")).toBeUndefined();
    expect(socialLinkError("https://linktr.ee/x")).toBeUndefined();
    expect(socialLinkError("http://ana.rescues/about")).toBeUndefined();
  });

  it("accepts the placeholder's scheme-less form, as people type it", () => {
    expect(socialLinkError("facebook.com/your.name")).toBeUndefined();
    expect(socialLinkError(" facebook.com/your.shelter ")).toBeUndefined();
  });
});

describe("normalizeSocialLink", () => {
  it("is what gets sent: trimmed, and https:// prepended when no scheme was typed", () => {
    expect(normalizeSocialLink(" facebook.com/your.name ")).toBe("https://facebook.com/your.name");
    expect(normalizeSocialLink("https://linktr.ee/x")).toBe("https://linktr.ee/x");
    expect(normalizeSocialLink("http://ana.rescues")).toBe("http://ana.rescues");
  });

  it("does not disguise a bad scheme as https", () => {
    expect(normalizeSocialLink("javascript:alert(1)")).toBe("javascript:alert(1)");
  });
});

describe("socialLinkNote", () => {
  it("says nothing for a known social host", () => {
    expect(socialLinkNote("https://facebook.com/x")).toBeUndefined();
    expect(socialLinkNote("https://www.instagram.com/x")).toBeUndefined();
    expect(socialLinkNote("facebook.com/your.name")).toBeUndefined();
    expect(socialLinkNote("https://linktr.ee/x")).toBeUndefined();
  });

  it("warns, without blocking, when the host isn't a social site we know", () => {
    expect(socialLinkError("https://ana.rescues/about")).toBeUndefined();
    expect(socialLinkNote("https://ana.rescues/about")).toBe(
      "Not a social site we recognise — that's fine if it's your public page."
    );
  });

  it("says nothing while the link is empty or still invalid — the error speaks then", () => {
    expect(socialLinkNote("")).toBeUndefined();
    expect(socialLinkNote("javascript:alert(1)")).toBeUndefined();
  });

  it("does not treat a look-alike host as social", () => {
    expect(socialLinkNote("https://facebook.com.evil.example/x")).toBeDefined();
    expect(socialLinkNote("https://notfacebook.com/x")).toBeDefined();
  });
});

// The rule only protects reviewers if every screen that sends `social_proof_url` goes through
// it. Source-scanning guard in the style of fieldAdoption.test.ts.
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

describe("every screen that sends social_proof_url validates it with the helper", () => {
  const SCREENS = join(__dirname, "..", "screens");
  const senders = readdirSync(SCREENS)
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => ({ f, src: readFileSync(join(SCREENS, f), "utf8") }))
    .filter(({ src }) => /social_proof_url:/.test(src));

  it("found the senders", () => {
    expect(senders.map(({ f }) => f).sort()).toEqual([
      "MemberVerifyScreen.tsx", "ShelterVerifyNgoScreen.tsx", "ShelterVerifyScreen.tsx"
    ]);
  });

  it.each(["MemberVerifyScreen.tsx", "ShelterVerifyScreen.tsx"])("%s validates and normalises the typed link", (f) => {
    const src = senders.find((s) => s.f === f)!.src;
    expect(src).toMatch(/import \{[^}]*\bsocialLinkError\b[^}]*\} from "\.\.\/socialLink"/);
    expect(src).toMatch(/socialLinkNote\(/);
    // What is sent is the normalised form, never the raw trimmed text.
    expect(src).toMatch(/social_proof_url: normalizeSocialLink\(/);
    expect(src).not.toMatch(/social_proof_url: \w+\.trim\(\)/);
  });

  it("ShelterVerifyNgoScreen only forwards the link ShelterVerifyScreen already validated", () => {
    const src = senders.find((s) => s.f === "ShelterVerifyNgoScreen.tsx")!.src;
    expect(src).toMatch(/socialUrl \} = route\.params/);
    // ShelterVerifyScreen hands over the normalised value.
    const shelter = senders.find((s) => s.f === "ShelterVerifyScreen.tsx")!.src;
    expect(shelter).toMatch(/socialUrl: normalizeSocialLink\(/);
  });
});
