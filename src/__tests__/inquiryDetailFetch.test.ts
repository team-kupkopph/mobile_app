/**
 * The adopter's inquiry screen resolved its inquiry from page 1 of GET /me/inquiries (`results.find`), so every inquiry past the
 * first page (run1.adpv: 54 inquiries, all three reserved ones on page 2) opened as "This inquiry is no longer available".
 * It now asks the server for the one inquiry, GET /inquiries/{id} (an adopter's own row, the same shape; 404 for anyone else),
 * as PlaceRequestScreen has since C25.
 *
 * A source scan in the style of inquiryListPagination.test.ts; the device walk is the proof.
 */
import { readFileSync } from "fs";
import { join } from "path";

const screen = readFileSync(join(__dirname, "..", "screens", "InquiryScreen.tsx"), "utf-8");
const place = readFileSync(join(__dirname, "..", "screens", "PlaceRequestScreen.tsx"), "utf-8");

describe("InquiryScreen loads one inquiry by id", () => {
  it("the reference pattern is still there to copy", () => {
    expect(place).toMatch(/api\.get\(`\/inquiries\/\$\{inquiryId\}`\)/);
  });
  it("fetches /inquiries/{id}, not a page of the list", () => {
    expect(screen).toMatch(/api\.get\(`\/inquiries\/\$\{inquiryId\}`\)/);
    expect(screen).not.toMatch(/api\.get\("\/me\/inquiries"\)/);
    expect(screen).not.toMatch(/\.find\(\(iq/);
  });
});
