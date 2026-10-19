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
    expect(read("navigation/types.ts")).toMatch(/petForm: undefined/);
    expect(read("navigation/RootNavigator.tsx")).toMatch(/name="petForm" component=\{PetFormScreen\}/);
    expect(read("screens/MyPetsScreen.tsx")).toMatch(/navigation\.navigate\("petForm"\)/);
    expect(read("screens/PetFormScreen.tsx")).toMatch(/api\.post\("\/me\/pets"/);
  });
});

describe("listing one of my pets (AQ8)", () => {
  it("each pet row opens the listing form with its petId", () => {
    expect(read("screens/MyPetsScreen.tsx")).toMatch(/navigation\.navigate\("listingForm", \{ petId: p\.pet_id \}\)/);
    expect(LIST_PET_LABEL).toBe("List for adoption");
  });
  it("the empty state no longer promises only adopted pets", () => {
    expect(MY_PETS_EMPTY).toMatch(/Add one/);
    expect(read("screens/MyPetsScreen.tsx")).not.toMatch(/Pets you adopt will appear here/);
  });
});
