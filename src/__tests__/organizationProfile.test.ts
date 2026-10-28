/**
 * Plan Task 9 · the shelter's Organization profile (library plan 2026-10-27, AS7 / X6 / X13 / S4).
 *
 * What the review found, and what each group of tests pins:
 *
 *   · After onboarding a shelter could edit only its drop-off note and its vet. No screen for the
 *     description, logo, official email, hours or contact person (backend#113 added the API).
 *   · The Donation instructions screen read its OWN text back through the PUBLIC needs route,
 *     because there was no `GET /shelter/profile`.
 *   · The shelter's profile header showed the account's display name and a glyph, not the
 *     organisation's name and logo; its "Volunteers" tile was a hard-coded 0.
 *   · A form that PATCHes a profile must send only what changed, or an edit screen that loaded
 *     slowly overwrites a field with a blank.
 *
 * Pure helpers are tested directly; the wiring a helper cannot see is a source scan, and each scan
 * asserts it FOUND the file before it is allowed to say the file is fine.
 */
import { readFileSync } from "fs";
import { join } from "path";

import {
  OrganizationForm,
  organizationErrorFrom,
  organizationFieldErrors,
  organizationFormFrom,
  organizationPatch,
} from "../organizationProfile";

const SRC = join(__dirname, "..");
const read = (...p: string[]) => readFileSync(join(SRC, ...p), "utf8");

const profile = {
  org_name: "Happy Paws", description: "We rescue strays in Marikina.", logo_url: "https://bkt/shelter_logo/a/b",
  operating_hours: "Mon–Sat 9–5", website_url: "https://paws.example.org",
  contact_person_name: "Ate Mia", contact_person_role: "Coordinator",
  official_phone: "+639171234567", official_email: "hello@paws.example.org",
  donation_instructions: "Gate B", tier: "community_rescue",
};

describe("organizationFormFrom", () => {
  it("turns the server profile into the strings the fields show", () => {
    expect(organizationFormFrom(profile)).toMatchObject({
      orgName: "Happy Paws", description: "We rescue strays in Marikina.",
      hours: "Mon–Sat 9–5", website: "https://paws.example.org",
      contactName: "Ate Mia", contactRole: "Coordinator",
      phone: "+639171234567", email: "hello@paws.example.org",
    });
  });

  it("shows a blank for what the server sends as null, never the word 'null'", () => {
    const form = organizationFormFrom({ ...profile, description: null, operating_hours: null,
                                        official_email: null, contact_person_role: null });
    expect(form.description).toBe("");
    expect(form.hours).toBe("");
    expect(form.email).toBe("");
    expect(form.contactRole).toBe("");
  });
});

describe("organizationPatch", () => {
  const base = organizationFormFrom(profile);

  it("sends NOTHING when nothing changed", () => {
    expect(organizationPatch(profile, base, { logo: "keep" })).toEqual({});
  });

  it("sends only the fields that changed, under the server's names", () => {
    const form: OrganizationForm = { ...base, description: "New words.", hours: "Daily 8–6" };

    expect(organizationPatch(profile, form, { logo: "keep" }))
      .toEqual({ description: "New words.", operating_hours: "Daily 8–6" });
  });

  it("trims, so a stray space is not a change and not stored", () => {
    expect(organizationPatch(profile, { ...base, description: "  We rescue strays in Marikina.  " },
                             { logo: "keep" })).toEqual({});
    expect(organizationPatch(profile, { ...base, hours: "  Daily 8–6 " }, { logo: "keep" }))
      .toEqual({ operating_hours: "Daily 8–6" });
  });

  it("an emptied field clears it (a blank is a real value, not 'unchanged')", () => {
    expect(organizationPatch(profile, { ...base, description: "", email: "" }, { logo: "keep" }))
      .toEqual({ description: "", official_email: "" });
  });

  it("sends the phone in the form the server stores, not the one typed", () => {
    expect(organizationPatch(profile, { ...base, phone: "0918 765 4321" }, { logo: "keep" }))
      .toEqual({ official_phone: "+639187654321" });
  });

  it("an unchanged number typed the other way is still not a change", () => {
    expect(organizationPatch(profile, { ...base, phone: "0917 123 4567" }, { logo: "keep" })).toEqual({});
  });

  it("carries the logo: a new upload, or an explicit removal, or nothing", () => {
    expect(organizationPatch(profile, base, { logo: "new", fileUrl: "https://bkt/shelter_logo/a/c" }))
      .toEqual({ logo_file_url: "https://bkt/shelter_logo/a/c" });
    expect(organizationPatch(profile, base, { logo: "remove" })).toEqual({ logo_file_url: "" });
    expect(organizationPatch(profile, base, { logo: "keep" })).toEqual({});
  });

  it("maps every editable field to the key the backend accepts", () => {
    const all: OrganizationForm = {
      orgName: "A", description: "B", hours: "C", website: "D", contactName: "E",
      contactRole: "F", phone: "0918 765 4321", email: "g@h.org",
    };
    expect(Object.keys(organizationPatch({ ...profile, org_name: "", description: "", operating_hours: "",
      website_url: "", contact_person_name: "", contact_person_role: "", official_phone: "",
      official_email: "" }, all, { logo: "keep" })).sort()).toEqual([
      "contact_person_name", "contact_person_role", "description", "official_email", "official_phone",
      "operating_hours", "org_name", "website_url"]);
  });
});

describe("organizationFieldErrors", () => {
  const ok = organizationFormFrom(profile);

  it("accepts the profile as it stands", () => {
    expect(organizationFieldErrors(ok)).toEqual({});
  });

  it("names the field that is wrong, in the app's words", () => {
    expect(organizationFieldErrors({ ...ok, orgName: "   " }).orgName).toMatch(/name/i);
    expect(organizationFieldErrors({ ...ok, description: "x".repeat(1001) }).description).toMatch(/1000/);
    expect(organizationFieldErrors({ ...ok, hours: "x".repeat(121) }).hours).toMatch(/120/);
    expect(organizationFieldErrors({ ...ok, email: "not-an-email" }).email).toMatch(/email/i);
    expect(organizationFieldErrors({ ...ok, phone: "0281234567" }).phone)
      .toBe("Enter a Philippine mobile number, e.g. 0917 123 4567");
  });

  it("lets the optional fields be blank", () => {
    expect(organizationFieldErrors({ ...ok, description: "", hours: "", email: "", phone: "",
                                     website: "", contactName: "", contactRole: "" })).toEqual({});
  });
});

describe("organizationErrorFrom", () => {
  it("the verified-name lock reads as a plain instruction under the name field", () => {
    const err = organizationErrorFrom({ status: 409, data: { error: { code: "org_name_locked" } } });

    expect(err).toMatchObject({ field: "orgName" });
    expect(err.message).toMatch(/contact us/i);
  });

  it("puts a server validation message under the field it names", () => {
    const res = { status: 400, data: { error: { code: "invalid", details: {
      official_email: ["Enter a valid email address."] } } } };

    expect(organizationErrorFrom(res)).toEqual({ field: "email", message: "Enter a valid email address." });
  });

  it("maps each server field name to the form field it belongs under", () => {
    for (const [server, form] of [["description", "description"], ["operating_hours", "hours"],
      ["official_phone", "phone"], ["contact_person_name", "contactName"],
      ["contact_person_role", "contactRole"], ["website_url", "website"], ["org_name", "orgName"],
      ["logo_file_url", "logo"]] as const) {
      const res = { status: 400, data: { error: { details: { [server]: ["bad"] } } } };
      expect(organizationErrorFrom(res).field).toBe(form);
    }
  });

  it("says it plainly when the connection is the problem, and never blames the person for a 500", () => {
    expect(organizationErrorFrom({ status: 0 }).message).toMatch(/connect/i);
    expect(organizationErrorFrom({ status: 500 }).message).toMatch(/try again/i);
    expect(organizationErrorFrom({ status: 500 }).field).toBeUndefined();
  });
});

describe("the wiring", () => {
  const SCREENS = ["OrganizationProfileScreen.tsx", "ShelterProfileScreen.tsx", "DonationInstructionsScreen.tsx"];

  it("finds the files it means to check", () => {
    // ⚠️ Assert the scan found something before believing it found nothing.
    for (const f of SCREENS) expect(read("screens", f).length).toBeGreaterThan(500);
  });

  it("the screen loads the profile and saves through the one endpoint, uploading the logo as shelter_logo", () => {
    const src = read("screens", "OrganizationProfileScreen.tsx");
    expect(src).toContain('api.get("/shelter/profile")');
    expect(src).toContain('api.patch("/shelter/profile"');
    expect(src).toContain('pickAndUpload(api, "shelter_logo")');
    expect(src).toContain('testID="screen.organizationProfile"');
  });

  it("a failed prefill warns AND blocks the save, so a blank form can never overwrite a real profile", () => {
    const src = read("screens", "OrganizationProfileScreen.tsx");
    expect(src).toContain("<PrefillWarning");
    expect(src).toMatch(/async function submit\(/);
  });

  it("shelter_logo is a declared upload purpose", () => {
    expect(read("upload.ts")).toMatch(/UploadPurpose[\s\S]{0,300}"shelter_logo"/);
  });

  it("the shelter's profile shows ITS name, its logo and its real volunteer count", () => {
    const src = read("screens", "ShelterProfileScreen.tsx");
    expect(src).toContain('api.get("/shelter/profile")');
    expect(src).toContain("counts.volunteers");
    expect(src).not.toMatch(/<Stat n=\{0\} label="Volunteers"/);
    expect(src).toContain('"organizationProfile"');
  });

  it("Donation instructions reads its own text from the profile, not the public needs route", () => {
    const src = read("screens", "DonationInstructionsScreen.tsx");
    expect(src).toContain('api.get("/shelter/profile")');
    expect(src).not.toContain("/needs`");
  });

  it("registers the route", () => {
    expect(read("navigation", "RootNavigator.tsx")).toContain('name="organizationProfile"');
    expect(read("navigation", "types.ts")).toMatch(/organizationProfile: undefined/);
  });
});
