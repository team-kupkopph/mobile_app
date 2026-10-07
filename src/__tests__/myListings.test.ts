import { readFileSync } from "fs";
import { join } from "path";
import { STATUS_CHIP, applicantsChip } from "../shelterAnimals";
const read = (rel: string) => readFileSync(join(__dirname, "..", rel), "utf8");

describe("My listings and the shared list body (spec §3)", () => {
  it("the visible word is Reserved", () => {
    expect(STATUS_CHIP.pending).toEqual({ label: "Reserved", tone: "warning" });
    expect(read("components/ListingsByStatus.tsx")).toContain('["Live", "Reserved", "Adopted"]');
  });
  it("counts applicants only when someone is waiting", () => {
    expect(applicantsChip(0)).toBeNull();
    expect(applicantsChip(undefined)).toBeNull();
    expect(applicantsChip(1)).toBe("1 applicant");
    expect(applicantsChip(3)).toBe("3 applicants");
  });
  it("both screens share one body, and rows open the poster view", () => {
    expect(read("screens/ShelterAnimalsScreen.tsx")).toContain("<ListingsByStatus");
    expect(read("screens/MyListingsScreen.tsx")).toContain("<ListingsByStatus");
    expect(read("screens/ShelterAnimalsScreen.tsx")).toMatch(/navigation\.navigate\("posterListing", \{ listingId \}\)/);
  });
  it("owners reach it from Profile, under My pets", () => {
    const profile = read("screens/ProfileScreen.tsx");
    expect(profile).toMatch(/testID="row\.profile\.myListings"/);
    expect(profile.indexOf("My pets")).toBeLessThan(profile.indexOf("My listings"));
    expect(read("navigation/types.ts")).toMatch(/myListings: undefined/);
  });
});
