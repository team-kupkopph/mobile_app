import { readFileSync } from "fs";
import { join } from "path";

import { listingTitle } from "../shelterAnimals";

const read = (rel: string) => readFileSync(join(__dirname, "..", rel), "utf8");

// Run 12 · R12-F2: a listing with a blank name showed no title on Home, the Adopt deck and the listing detail,
// while My listings said "Unnamed" and Saved already used the fallback.
describe("a blank listing name still has a title on every public surface (R12-F2)", () => {
  it("the fallback is the one My listings uses", () => {
    expect(listingTitle("")).toBe("Unnamed");
    expect(listingTitle("   ")).toBe("Unnamed");
    expect(listingTitle(null)).toBe("Unnamed");
    expect(listingTitle(" Milo ")).toBe("Milo");
  });
  it("Home's Adopt-near-you row titles through it", () => {
    const src = read("components/home/HomeSections.tsx");
    expect(src).toContain("listingTitle(listing.pet.name)");
    expect(src).not.toMatch(/>\{listing\.pet\.name\}</);
  });
  it("the Adopt deck's card text and its accessibility label title through it", () => {
    const src = read("components/AdoptDeck.tsx");
    expect(src).toContain("`${listingTitle(l.pet.name)}, open listing`");
    expect(src).toMatch(/\{listingTitle\(l\.pet\.name\)\}<\/Text>/);
    expect(src).not.toMatch(/>\{l\.pet\.name\}</);
  });
  it("the listing detail titles through it, and says 'About this animal' rather than 'About Unnamed'", () => {
    const src = read("screens/ListingDetailScreen.tsx");
    expect(src).toMatch(/\{listingTitle\(listing\.pet\.name\)\}<\/Text>/);
    expect(src).toContain('`About ${listing.pet.name.trim() || "this animal"}`');
    expect(src).not.toMatch(/>\{listing\.pet\.name\}</);
  });
});
