import { readFileSync } from "fs";
import { join } from "path";
import {
  FormState, MAX_PHOTOS, addPhoto, createBody, makeMain, patchBody, photoPayload, publishRefusal,
  removePhoto, triAt, triFromBool, triIndex, triToBool
} from "../listingForm";

const read = (rel: string) => readFileSync(join(__dirname, "..", rel), "utf8");
const base: FormState = {
  name: " Bantay ", species: "dog", breed: "", sex: "male", birthdate: "", description: " Sweet ",
  requirements: "Fenced yard", fee: "", city: " Marikina ", size: "", vaccinated: "yes", spayed: "unknown",
  walkable: true, temperament: "", photos: ["a", "b"]
};

describe("the photo strip (AD9)", () => {
  it("caps at six, ignores a duplicate, and removes by position", () => {
    let p: string[] = [];
    for (let i = 0; i < 9; i++) p = addPhoto(p, `u${i}`);
    expect(p).toHaveLength(MAX_PHOTOS);
    expect(addPhoto(["a"], "a")).toEqual(["a"]);
    expect(removePhoto(["a", "b", "c"], 1)).toEqual(["a", "c"]);
  });
  it("makes a photo main by moving it first, and leaves the rest in order", () => {
    expect(makeMain(["a", "b", "c"], 2)).toEqual(["c", "a", "b"]);
    expect(makeMain(["a", "b"], 0)).toEqual(["a", "b"]);
    expect(makeMain(["a", "b"], 5)).toEqual(["a", "b"]);
  });
  it("sends the first as primary", () => {
    expect(photoPayload(["a", "b"])).toEqual([{ file_url: "a", is_primary: true }, { file_url: "b", is_primary: false }]);
  });
});

describe("tri-state answers (AD11)", () => {
  it("round-trips null / true / false and the segmented index", () => {
    expect([null, true, false].map(triFromBool)).toEqual(["unknown", "yes", "no"]);
    expect(["unknown", "yes", "no"].map((t) => triToBool(t as any))).toEqual([null, true, false]);
    expect([0, 1, 2].map(triAt)).toEqual(["unknown", "yes", "no"]);
    expect(triIndex("no")).toBe(2);
    expect(triAt(9)).toBe("unknown");
  });
});

describe("request bodies", () => {
  it("create nests the pet fields, trims, links a pet, and carries photos (AD9, AD11, AQ8)", () => {
    const b = createBody({ ...base, petId: "p1" });
    expect(b.pet).toMatchObject({ name: "Bantay", vaccinated: true, spayed_neutered: null, walkable: true });
    expect(b.pet.breed).toBeUndefined();
    expect(b.pet_id).toBe("p1");
    expect(b).toMatchObject({ description: "Sweet", requirements: "Fenced yard", adoption_fee: "0", city: "Marikina" });
    expect(b.photos).toHaveLength(2);
  });
  it("patch is flat, sends photos always (the server replaces the set), and clears a blank birthdate", () => {
    const b = patchBody(base);
    expect(b).toMatchObject({ name: "Bantay", vaccinated: true, birthdate: null, requirements: "Fenced yard" });
    expect(b.photos[0]).toEqual({ file_url: "a", is_primary: true });
  });
});

describe("a refused publish (AD12)", () => {
  it("tells a person to get the badge and a shelter to wait for verification", () => {
    expect(publishRefusal("verification_required", false)).toMatchObject({ offerVerify: true });
    expect(publishRefusal("verification_required", true)).toMatchObject({ offerVerify: false });
    expect(publishRefusal("listing_removed", false)?.title).toMatch(/removed/);
    expect(publishRefusal("nope", false)).toBeNull();
  });
});

describe("the form screen", () => {
  const form = read("screens/ListingFormScreen.tsx");
  it("saves a draft and lands on Your listing, where Publish lives (AD12)", () => {
    expect(form).toMatch(/label=\{isEdit \? "Save changes" : "Save draft"\}/);
    expect(form).toMatch(/navigation\.replace\("posterListing", \{ listingId: id \}\)/);
  });
  it("sends the pet it was opened for (AQ8) and prefills from it", () => {
    expect(form).toMatch(/route\.params\?\.petId/);
    expect(form).toMatch(/api\.get\(`\/me\/pets\/\$\{petId\}`\)/);
  });
  it("offers photos in both modes now, not just create (AD9)", () => {
    expect(form).not.toMatch(/\{!isEdit \? \(\s*<>\s*<Text style=\{styles\.label\}>Photo/);
    expect(form).toContain("btn.listingForm.addPhoto");
  });
});

describe("a blank city (Run 8, R8-F1)", () => {
  it("is caught before the request, in words, instead of the server's nameless 'may not be blank'", () => {
    expect(read("screens/ListingFormScreen.tsx")).toMatch(/if \(!city\.trim\(\)\) \{ setError\("Add the city where the animal is\."\); return; \}/);
  });
});
