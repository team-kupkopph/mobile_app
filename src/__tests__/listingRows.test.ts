import { readFileSync } from "fs";
import { join } from "path";
import { listingInitial, listingTitle } from "../shelterAnimals";

const body = readFileSync(join(__dirname, "..", "components", "ListingsByStatus.tsx"), "utf8");

describe("a listing row's title and tile for an animal with no name (R5-F6, CP-1)", () => {
  it("falls back to 'Unnamed' for a blank or whitespace name, and trims a real one", () => {
    expect(listingTitle("")).toBe("Unnamed");
    expect(listingTitle("   ")).toBe("Unnamed");
    expect(listingTitle(undefined)).toBe("Unnamed");
    expect(listingTitle(null)).toBe("Unnamed");
    expect(listingTitle("  Milo ")).toBe("Milo");
  });
  it("the tile shows the first letter, or a question mark when there is no name", () => {
    expect(listingInitial("milo")).toBe("M");
    expect(listingInitial("  luna")).toBe("L");
    expect(listingInitial("")).toBe("?");
    expect(listingInitial(undefined)).toBe("?");
  });
  it("every row, and the drafts strip, go through the helpers rather than the raw name", () => {
    expect(body).toContain("listingTitle(l.pet.name)");
    expect(body).toContain("listingInitial(l.pet.name)");
    expect(body).toContain("listingTitle(d.pet.name)");
    expect(body).not.toMatch(/l\.pet\.name\.charAt/);
    expect(body).not.toMatch(/\{l\.pet\.name\}/);
  });
});

describe("a row's applicants chip does not squeeze the animal's name (R5-F4)", () => {
  it("sits under the subtitle in the text column, not beside the status chip", () => {
    const copy = body.indexOf("styles.rowCopy");
    const applicants = body.indexOf("{applicants ?");
    const statusChip = body.indexOf("tone={chip.tone}");
    expect(copy).toBeGreaterThan(-1);
    expect(applicants).toBeGreaterThan(copy);
    expect(applicants).toBeLessThan(statusChip);
  });
});
