// R6-F1 · the adopter's side of R5-F6. A listing with a blank name rendered no title in My
// inquiries and on the inquiry screen, and its notes read "where  would live". Titles fall
// back to "Unnamed" (as the shelter's rows do); prose falls back to "this animal" (as the
// server's notices do, notices.py `_name`).
import { readFileSync } from "fs";
import { join } from "path";
import { STAGE_STEP, inquiryClosedNote, inquiryPetName } from "../adoption";

const read = (...p: string[]) => readFileSync(join(__dirname, "..", ...p), "utf8");
const list = read("components", "InquiryList.tsx");
const screen = read("screens", "InquiryScreen.tsx");

describe("inquiryPetName — the animal's name inside a sentence (R6-F1)", () => {
  it("is 'this animal' for a blank, whitespace or missing name, and trims a real one", () => {
    expect(inquiryPetName("")).toBe("this animal");
    expect(inquiryPetName("   ")).toBe("this animal");
    expect(inquiryPetName(undefined)).toBe("this animal");
    expect(inquiryPetName(null)).toBe("this animal");
    expect(inquiryPetName("  Milo ")).toBe("Milo");
  });
});

describe("sentences that name the animal still read when it has no name (R6-F1)", () => {
  const pet = inquiryPetName("");
  const ctx = { shelter: "Paws" };
  it("the closed note starts a sentence with a capital", () => {
    expect(inquiryClosedNote("declined", "another_adopter_chosen", { pet, poster: "Paws" })).toBe(
      "This animal was adopted by someone else. Thank you for offering a home."
    );
  });
  it("the vet-clearance note, which opens with the name, is capitalised; the mid-sentence ones are not", () => {
    expect(STAGE_STEP.vet_clearance.note({ pet, ...ctx })).toBe(
      "This animal's vaccination and neuter records are finalised before handover."
    );
    expect(STAGE_STEP.home_check.note({ pet, ...ctx })).toBe("A volunteer visits to see where this animal would live.");
    expect(STAGE_STEP.interview.note({ pet, ...ctx })).toBe(
      "A volunteer talks with you about this animal's routine and your home."
    );
  });
  it("a real name is left exactly as before", () => {
    expect(STAGE_STEP.vet_clearance.note({ pet: "Milo", ...ctx })).toBe(
      "Milo's vaccination and neuter records are finalised before handover."
    );
    expect(inquiryClosedNote("declined", "another_adopter_chosen", { pet: "Milo", poster: "Paws" })).toBe(
      "Milo was adopted by someone else. Thank you for offering a home."
    );
  });
});

describe("the adopter's screens go through the helpers rather than the raw name (R6-F1)", () => {
  it("the files were read (a guard that matches nothing proves nothing)", () => {
    expect(list.length).toBeGreaterThan(500);
    expect(screen.length).toBeGreaterThan(500);
    expect(list).toContain("iq.listing");
    expect(screen).toContain("inquiry.listing");
  });
  it("My inquiries titles a card with listingTitle", () => {
    expect(list).toContain("listingTitle(iq.listing.name)");
    expect(list).not.toMatch(/\{iq\.listing\.name\}/);
  });
  it("the inquiry screen titles the pet card with listingTitle and uses inquiryPetName in prose", () => {
    expect(screen).toContain("listingTitle(inquiry.listing.name)");
    expect(screen).toContain("inquiryPetName(inquiry.listing.name)");
    expect(screen).not.toMatch(/const pet = inquiry\.listing\.name;/);
    expect(screen).not.toMatch(/\{pet\}<\/Text>/);
  });
});
