import { readFileSync } from "fs";
import { join } from "path";
import { LIST_PET_LABEL, MY_PETS_EMPTY, PetFormState, petBody, petFormError } from "../petForm";

const read = (rel: string) => readFileSync(join(__dirname, "..", rel), "utf8");
const state: PetFormState = {
  name: " Mochi ", species: "cat", breed: "", sex: "female", birthdate: "", size: "", spayed: true,
  temperament: "Lap cat", medical: "", vet: "Dr Reyes", photos: ["a", "b"]
};

describe("adding a pet (AQ8)", () => {
  it("sends what was entered, trimmed, and leaves blanks out", () => {
    const b = petBody(state);
    expect(b).toMatchObject({ name: "Mochi", species: "cat", spayed_neutered: true, temperament: "Lap cat", vet_contact: "Dr Reyes" });
    expect(b.breed).toBeUndefined();
    expect(b.medical_conditions).toBeUndefined();
    expect(b.photos).toEqual([{ file_url: "a", is_primary: true }, { file_url: "b", is_primary: false }]);
  });
  it("keeps the codes it names and nothing else (field refusals go through serverFieldErrors)", () => {
    expect(petFormError("pet_listed")).toMatch(/Withdraw/);
    expect(petFormError("boom")).toBeNull();
  });
  it("is reachable from My pets and posts to /me/pets", () => {
    expect(read("navigation/types.ts")).toMatch(/petForm: \{ petId\?: string \} \| undefined/);
    expect(read("navigation/RootNavigator.tsx")).toMatch(/name="petForm" component=\{PetFormScreen\}/);
    expect(read("screens/MyPetsScreen.tsx")).toMatch(/navigation\.navigate\("petForm"\)/);
    expect(read("screens/PetFormScreen.tsx")).toMatch(/api\.post\("\/me\/pets"/);
  });
});

describe("listing one of my pets (AQ8)", () => {
  it("each pet row opens the pet's screen, which offers the listing form with its petId (PP12)", () => {
    expect(read("screens/MyPetsScreen.tsx")).toMatch(/navigation\.navigate\("petDetail", \{ petId: p\.pet_id \}\)/);
    expect(read("screens/PetDetailScreen.tsx")).toMatch(/navigation\.navigate\("listingForm", \{ petId \}\)/);
    expect(LIST_PET_LABEL).toBe("List for adoption");
  });
  it("the empty state no longer promises only adopted pets", () => {
    expect(MY_PETS_EMPTY).toMatch(/Add one/);
    expect(read("screens/MyPetsScreen.tsx")).not.toMatch(/Pets you adopt will appear here/);
  });
});

describe("managing a pet (PP12, My Pets review 2026-10-28)", () => {
  const { ageLabel, petPatchBody, petActionError, petFormError, REMOVE_REASONS } = require("../petForm");
  const today = new Date(2026, 9, 28);   // 28 Oct 2026

  it("an edit sends a cleared field as a blank, not as 'leave it'", () => {
    const b = petPatchBody({ ...state, breed: "  ", birthdate: "" });
    expect(b.breed).toBe("");
    expect(b.birthdate).toBeNull();
    expect(b.medical_conditions).toBe("");
    expect(b.name).toBe("Mochi");
    expect(b.photos[0]).toEqual({ file_url: "a", is_primary: true });
  });

  it("works out an age, and refuses to invent one", () => {
    expect(ageLabel("2023-10-28", today)).toBe("3 years");
    expect(ageLabel("2023-10-29", today)).toBe("2 years");          // birthday is tomorrow
    expect(ageLabel("2026-03-01", today)).toBe("7 months");
    expect(ageLabel("2026-09-28", today)).toBe("1 month");
    expect(ageLabel("2026-10-15", today)).toBe("Under a month");
    expect(ageLabel("2024-02-29", new Date(2025, 1, 28))).toBe("11 months");   // leap day
    expect(ageLabel("2027-01-01", today)).toBeNull();               // a typo, not an unborn pet
    expect(ageLabel(null, today)).toBeNull();
    expect(ageLabel("01/03/2022", today)).toBeNull();
  });

  it("offers only the reasons an owner gives; the system's own reason is not one", () => {
    expect(REMOVE_REASONS.map((r: { value: string }) => r.value)).toEqual(["passed_away", "given_away", "other"]);
  });

  it("names what to do for each refusal", () => {
    expect(petActionError("pet_listed")).toMatch(/Withdraw the listing/);
    expect(petActionError("not_for_shelters")).toMatch(/Animals tab/);
    expect(petFormError("not_found")).toMatch(/isn't in My pets/);
    expect(petActionError("boom")).toBeNull();
  });

  it("the pet screen is wired: registered, removes with DELETE, edits through the form", () => {
    expect(read("navigation/RootNavigator.tsx")).toMatch(/name="petDetail" component=\{PetDetailScreen\}/);
    expect(read("screens/PetDetailScreen.tsx")).toMatch(/api\.del\(`\/me\/pets\/\$\{petId\}`, \{ reason \}\)/);
    expect(read("screens/PetDetailScreen.tsx")).toMatch(/navigate\("petForm", \{ petId \}\)/);
    expect(read("screens/PetFormScreen.tsx")).toMatch(/api\.patch\(`\/me\/pets\/\$\{petId\}`/);
    expect(read("screens/ReportStrayScreen.tsx")).toMatch(/route\.params\?\.petId/);
  });
});


describe("errors that say what is wrong, under the field (PP9/PP10, My Pets review 2026-10-28)", () => {
  const { serverFieldErrors, birthdateError, BIRTHDATE_FORMAT, BIRTHDATE_FUTURE, BIRTHDATE_NO_SUCH_DAY } = require("../petForm");
  const invalid = (details: object) => ({ ok: false, status: 400,
    data: { error: { code: "invalid", message: "x", details } } });
  const today = new Date(2026, 9, 28);

  it("maps the server's field details to the form's fields, in our words", () => {
    const r = serverFieldErrors(invalid({
      birthdate: ["A birthdate can't be in the future."], name: ["This field may not be blank."],
      medical_conditions: ["Ensure this field has no more than 9 characters."]
    }));
    expect(r.fields).toEqual({ birthdate: BIRTHDATE_FUTURE, name: "Give your pet a name.",
      medical: "Ensure this field has no more than 9 characters." });
    expect(r.form).toBeNull();
  });

  it("reads a listing's animal, nested under pet, the same way", () => {
    const r = serverFieldErrors(invalid({ pet: [{ birthdate: ["Date has wrong format. Use one of these formats instead: YYYY-MM-DD."] }],
      adoption_fee: ["A valid number is required."] }));
    expect(r.fields).toEqual({ birthdate: BIRTHDATE_FORMAT, fee: "Enter the fee as a number, like 250." });
  });

  it("finds a photo's refusal inside a list of photo objects", () => {
    const r = serverFieldErrors(invalid({ photos: [{}, { file_url: ["That photo was not uploaded through Kupkop."] }] }));
    expect(r.fields.photos).toMatch(/Remove it and add it again/);
  });

  it("sends a field it can't place to the form, never drops it", () => {
    const r = serverFieldErrors(invalid({ non_field_errors: ["Something else."] }));
    expect(r.fields).toEqual({});
    expect(r.form).toBe("Something else.");
  });

  it("names a coded refusal, and offline, and falls back to the server's sentence", () => {
    expect(serverFieldErrors({ ok: false, status: 409, data: { error: { code: "pet_listed", message: "m" } } }).form)
      .toMatch(/Withdraw the listing/);
    expect(serverFieldErrors({ ok: false, status: 0 }).form).toMatch(/offline/);
    expect(serverFieldErrors({ ok: false, status: 500, data: { error: { code: "error", message: "Boom." } } }).form)
      .toBe("Boom.");
  });

  it("checks a birthdate before it is sent", () => {
    expect(birthdateError("", today)).toBeNull();
    expect(birthdateError("2026-10-28", today)).toBeNull();        // today is fine
    expect(birthdateError("2026-10-29", today)).toBe(BIRTHDATE_FUTURE);
    expect(birthdateError("2023-02-29", today)).toBe(BIRTHDATE_NO_SUCH_DAY);   // not a real day
    expect(birthdateError("2023-13-01", today)).toBe(BIRTHDATE_NO_SUCH_DAY);
    expect(birthdateError("2024-02-29", today)).toBeNull();        // a real leap day
    expect(birthdateError("01/03/2022", today)).toBe(BIRTHDATE_FORMAT);
    expect(birthdateError(" 2023-03-01 ", today)).toBeNull();
  });

  it("both forms show a photo upload's failure instead of dropping it, and put errors under fields", () => {
    for (const f of ["screens/PetFormScreen.tsx", "screens/ListingFormScreen.tsx"]) {
      const src = read(f);
      expect(src).toMatch(/else if \(res\) setErrors\(\(e\) => \(\{ \.\.\.e, photos: uploadErrorMessage\(res\.reason\) \}\)\)/);
      expect(src).toMatch(/error=\{errors\.birthdate\}/);
      expect(src).toMatch(/serverFieldErrors\(/);
    }
  });
});

describe("what a pet is in the middle of (PP14, My Pets review 2026-10-28)", () => {
  const { petChips, petCardAction, myPetsHint, VIEW_LISTING_LABEL } = require("../petForm");
  const pet = (open_listing: object | null = null, lost_report_id: string | null = null) =>
    ({ pet_id: "p1", open_listing, lost_report_id });
  const listing = (status: string, removed = false) => ({ listing_id: "l1", status, removed });

  it("names each listing state and a lost report, with the shared status tones", () => {
    expect(petChips(pet())).toEqual([]);
    expect(petChips(pet(listing("draft")))).toEqual([{ label: "Listing draft", tone: "neutral" }]);
    expect(petChips(pet(listing("available")))).toEqual([{ label: "Listed for adoption", tone: "info" }]);
    expect(petChips(pet(listing("pending")))).toEqual([{ label: "Adoption pending", tone: "warning" }]);
    expect(petChips(pet(listing("available", true)))).toEqual([{ label: "Listing removed", tone: "danger" }]);
    expect(petChips(pet(null, "r1"))).toEqual([{ label: "Reported lost", tone: "warning" }]);
    expect(petChips(pet(listing("draft"), "r1")).map((c: { label: string }) => c.label))
      .toEqual(["Listing draft", "Reported lost"]);
  });

  it("the card's action is its listing when it has one, else the way to list it", () => {
    expect(petCardAction(pet(listing("draft")))).toEqual(
      { label: VIEW_LISTING_LABEL, route: "posterListing", params: { listingId: "l1" } });
    expect(petCardAction(pet())).toEqual(
      { label: "List for adoption", route: "listingForm", params: { petId: "p1" } });
  });

  it("the Profile hint counts listed pets, not drafts or removed ones", () => {
    expect(myPetsHint([pet(listing("available")), pet(listing("pending")), pet(listing("draft"))]))
      .toBe("2 listed for adoption");
    expect(myPetsHint([pet(listing("available", true)), pet()])).toBe("2 pets");
    expect(myPetsHint([pet()])).toBe("1 pet");
    expect(myPetsHint([])).toBe("Add your pets");
  });

  it("is wired: the card's chips and action, the pet screen's chips, the Profile hint", () => {
    const list = read("screens/MyPetsScreen.tsx");
    expect(list).toMatch(/petChips\(p\)/);
    expect(list).toMatch(/petCardAction\(p\)/);
    expect(list).toMatch(/testID=\{`btn\.myPets\.action\.\$\{p\.pet_id\}`\}/);
    expect(read("screens/PetDetailScreen.tsx")).toMatch(/petChips\(pet\)/);
    expect(read("screens/PetDetailScreen.tsx")).toMatch(/navigate\("reportDetail", \{ reportId: pet\.lost_report_id! \}\)/);
    const profile = read("screens/ProfileScreen.tsx");
    expect(profile).toMatch(/api\.get\("\/me\/pets"\)/);
    expect(profile).toMatch(/myPetsHint\(/);
  });
});

describe("the rest of Feature Spec §3.2 (step 12 / PQ4)", () => {
  const f = require("../petForm");
  const today = new Date(2026, 9, 29);   // 29 Oct 2026

  it("checks weight and microchip before sending, with the column's limits", () => {
    for (const ok of ["", "4", "4.2", "4.25", "0.01", "999.99"]) expect(f.weightError(ok)).toBeNull();
    for (const bad of ["0", "-1", "1000", "4.123", "heavy", "4,2"]) expect(f.weightError(bad)).toBe(f.WEIGHT_ERROR);
    for (const ok of ["", "985-112009", "A".repeat(40)]) expect(f.microchipError(ok)).toBeNull();
    for (const bad of ["985 112", "98#5", "A".repeat(41)]) expect(f.microchipError(bad)).toBe(f.MICROCHIP_ERROR);
    expect(f.weightLabel("4.20")).toBe("4.2 kg");
    expect(f.weightLabel(null)).toBeNull();
  });

  it("a picked birthdate is blank until complete; approximate needs only the month", () => {
    expect(f.birthdateValue(2023, 3, 9, false)).toBe("2023-03-09");
    expect(f.birthdateValue(2023, 3, null, false)).toBe("");
    expect(f.birthdateValue(2023, 3, 9, true)).toBe("2023-03-01");
    expect(f.birthdateValue(2023, null, null, true)).toBe("");
    expect(f.birthdateParts("2023-03-09")).toEqual({ year: 2023, month: 3, day: 9 });
    expect(f.birthdateParts("")).toEqual({ year: null, month: null, day: null });
    expect(f.daysIn(2024, 2)).toBe(29);
    expect(f.daysIn(2023, 2)).toBe(28);
    expect(f.birthdateSummary(2023, 3, null, true)).toBe("Born around March 2023");
    expect(f.birthdateSummary(2023, 3, 9, false)).toBe("Born 9 March 2023");
    expect(f.birthdateSummary(2023, 3, null, false)).toMatch(/pick the day, or choose Approximate/);
    expect(f.birthdateSummary(null, null, null, false)).toMatch(/Not set/);
  });

  it("an approximate age says so", () => {
    expect(f.ageLabel("2023-03-01", today, true)).toBe("About 3 years");
    expect(f.ageLabel("2023-03-01", today)).toBe("3 years");
    expect(f.ageLabel("2026-10-15", today, true)).toBe("Under a month");
  });

  it("sends every new field, and clears them on an edit", () => {
    const base = { ...state, birthdate: "2023-03-01", approximate: true, weight: " 4.2 ", microchip: "985",
      feeding: "Twice", allergies: "Chicken", medications: "", emergency: "Ana" };
    expect(f.petBody(base)).toMatchObject({ dob_approximate: true, weight_kg: "4.2", microchip_no: "985",
      feeding_routine: "Twice", allergies: "Chicken", emergency_contact: "Ana" });
    expect(f.petBody(base).medications).toBeUndefined();
    const cleared = f.petPatchBody({ ...base, birthdate: "", weight: "", allergies: "" });
    expect(cleared).toMatchObject({ dob_approximate: false, weight_kg: null, allergies: "", medications: "" });
  });

  it("puts each server refusal under its new field", () => {
    const r = f.serverFieldErrors({ ok: false, status: 400, data: { error: { code: "invalid", message: "x",
      details: { weight_kg: ["Ensure this value is greater than or equal to 0.01."], microchip_no: ["bad"],
        emergency_contact: ["Ensure this field has no more than 160 characters."] } } } });
    expect(r.fields).toEqual({ weight: f.WEIGHT_ERROR, microchip: "bad",
      emergency: "Ensure this field has no more than 160 characters." });
  });

  it("the pet screen lists the new facts, grouped as §3.2 groups them", () => {
    const rows = f.petFactRows({ breed: "Puspin", sex: "female", size_category: "small", color_markings: null,
      spayed_neutered: true, temperament: "Lap cat", medical_conditions: "Asthma", vet_contact: "Dr Reyes",
      weight_kg: "4.20", microchip_no: "985", feeding_routine: "Twice", allergies: "Chicken", medications: "Inhaler",
      emergency_contact: "Ana" }).map(([k]: [string]) => k);
    expect(rows).toEqual(["Breed", "Sex", "Size", "Weight", "Spayed / neutered", "Microchip", "Temperament",
      "Feeding routine", "Allergies", "Medications", "Medical notes", "Vet", "Emergency contact"]);
  });

  it("the form uses the picker, not a typed date, and the card and screen say About", () => {
    const form = read("screens/PetFormScreen.tsx");
    expect(form).toMatch(/<BirthdatePicker /);
    expect(form).not.toMatch(/placeholder="YYYY-MM-DD"/);
    for (const id of ["field.petForm.weight", "field.petForm.microchip", "field.petForm.feeding",
      "field.petForm.allergies", "field.petForm.medications", "field.petForm.emergency"]) expect(form).toContain(id);
    expect(read("screens/MyPetsScreen.tsx")).toMatch(/ageLabel\(p\.birthdate, undefined, !!p\.dob_approximate\)/);
    expect(read("screens/PetDetailScreen.tsx")).toMatch(/ageLabel\(pet\.birthdate, undefined, !!pet\.dob_approximate\)/);
  });
});

describe("step 14 cleanups (PP11)", () => {
  const f = require("../petForm");
  it("the pet form has a size, and sends and clears it", () => {
    expect(f.petBody({ ...state, size: "small" }).size_category).toBe("small");
    expect(f.petBody({ ...state, size: "" }).size_category).toBeUndefined();
    expect(f.petPatchBody({ ...state, size: "" }).size_category).toBe("");
    expect(read("screens/PetFormScreen.tsx")).toMatch(/testID="seg\.petForm\.size"/);
    expect(read("screens/PetFormScreen.tsx")).not.toMatch(/size: ""/);
  });
  it("photo rows are keyed by position too, so a repeated URL can't collide", () => {
    for (const f2 of ["screens/PetFormScreen.tsx", "screens/ListingFormScreen.tsx"]) {
      expect(read(f2)).not.toMatch(/key=\{url\}/);
      expect(read(f2)).toMatch(/key=\{`\$\{i\}-\$\{url\}`\}/);
    }
  });
});
