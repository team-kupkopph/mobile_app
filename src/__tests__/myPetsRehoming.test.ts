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
  it("explains a validation refusal and nothing else", () => {
    expect(petFormError("validation_error")).toMatch(/name/);
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
