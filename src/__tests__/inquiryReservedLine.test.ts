/**
 * AD-9 / candidate C-P6 (Run 6 O6-1): for an inquiry the poster has reserved for the adopter, the bell says "<pet> is reserved for you"
 * but the ladder said nothing ("Step 2 of 6" only). The pet card now carries the same line, from `reserved_at`.
 *
 * Wording is a draft from the previous session, not yet confirmed by the owner. A blank name reads "This animal" at the start of the
 * sentence (R6-F1: `inquiryPetName` / `THIS_ANIMAL`; titles keep "Unnamed" via `listingTitle`).
 *
 * A source scan in the style of inquiryScreenAx5.test.ts plus the pure function; the device walk is the proof.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { THIS_ANIMAL, inquiryReservedNote } from "../adoption";
import { MyInquiry } from "../api/types";

const screen = readFileSync(join(__dirname, "..", "screens", "InquiryScreen.tsx"), "utf-8");
const iq = (o: Partial<MyInquiry>) => ({ status: "active", reserved_at: "2026-10-11T00:00:00Z", ...o }) as MyInquiry;

describe("the ladder says the animal is reserved for the adopter", () => {
  it("the scan found the screen's pet card (a guard that matches nothing proves nothing)", () => {
    expect(screen).toMatch(/closedNote/);
    expect(screen).toMatch(/card\.inquiry\.pet/);
  });
  it("the screen renders the note from the helper", () => {
    expect(screen).toMatch(/inquiryReservedNote\(inquiry, pet\)/);
    expect(screen).toMatch(/testID="text\.inquiry\.reservedNote"/);
  });
  it("names the animal, or falls back to 'This animal' at the start of the sentence", () => {
    expect(inquiryReservedNote(iq({}), "Biscuit")).toBe("Biscuit is reserved for you.");
    expect(inquiryReservedNote(iq({}), THIS_ANIMAL)).toBe("This animal is reserved for you.");
  });
  it("says nothing when not reserved, or once the inquiry is over", () => {
    expect(inquiryReservedNote(iq({ reserved_at: null }), "Biscuit")).toBeNull();
    expect(inquiryReservedNote(iq({ reserved_at: undefined }), "Biscuit")).toBeNull();
    for (const status of ["withdrawn", "declined", "adopted"]) expect(inquiryReservedNote(iq({ status }), "Biscuit")).toBeNull();
  });
});
