/**
 * CP-1 (owner's pick: "Unnamed" where the name is a title, "this animal" inside a sentence). The Place request screen's heading fell back to
 * "This pet" for a listing with a blank name, the one title that did not follow the rule (R6-F1 fixed the adopter's rows and the inquiry screen).
 *
 * The heading now uses `listingTitle`, which trims and falls back to "Unnamed". A source scan in the style of adopterBlankName.test.ts plus a
 * unit check of the fallback; the device walk is the proof.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { listingTitle } from "../shelterAnimals";

const screen = readFileSync(join(__dirname, "..", "screens", "PlaceRequestScreen.tsx"), "utf8");

test("found the heading", () => {
  expect(screen).toMatch(/styles\.name/);
});

test("the heading no longer falls back to 'This pet'", () => {
  expect(screen).not.toMatch(/"This pet"/);
});

test("the heading uses listingTitle", () => {
  expect(screen).toMatch(/\{listingTitle\(inquiry\.listing\.name\)\}/);
});

test("listingTitle reads 'Unnamed' for a blank, whitespace or missing name", () => {
  expect(listingTitle("")).toBe("Unnamed");
  expect(listingTitle("   ")).toBe("Unnamed");
  expect(listingTitle(undefined)).toBe("Unnamed");
  expect(listingTitle(" Milo ")).toBe("Milo");
});
