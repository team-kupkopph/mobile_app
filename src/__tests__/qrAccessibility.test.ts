/**
 * Abot-tulong QR plan, Run 5 (AX-1 / AT23, AX-9): the QR image had no accessible name (VoiceOver skipped or said "image"), and the locked states were told
 * only by a glyph. The accessibility tree (what VoiceOver reads) is checked on the sim with `maestro hierarchy`; these are the source guards.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { qrImageLabel } from "../ownQr";

const read = (f: string) => readFileSync(join(__dirname, "..", "screens", f), "utf-8");

describe("qrImageLabel", () => {
  it("names the provider and the account", () => {
    expect(qrImageLabel("gcash", "Abot LIVE")).toBe("GCash QR code for Abot LIVE");
    expect(qrImageLabel("maya", "Abot LIVE")).toBe("Maya QR code for Abot LIVE");
  });
  it("falls back to the raw provider key", () => {
    expect(qrImageLabel("other", "X")).toBe("other QR code for X");
  });
});

describe("screens", () => {
  it("the donor's QR image carries the label", () => {
    expect(read("DonateScreen.tsx")).toMatch(/accessibilityLabel=\{qrImageLabel\(/);
    expect(read("DonateScreen.tsx")).toMatch(/accessible/);
  });
  it("the shelter's QR thumbnails and the form's live/pending thumbnails carry it", () => {
    expect(read("ShelterDonateScreen.tsx")).toMatch(/accessibilityLabel=\{qrImageLabel\(/);
    expect(read("DonationQrScreen.tsx")).toMatch(/accessibilityLabel=\{qrImageLabel\(/);
  });
  it("the Donate tab's card says whether donations are on, off or pending, not just 'Open your donation QR'", () => {
    expect(read("ShelterDonateScreen.tsx")).toMatch(/accessibilityLabel=\{`Open your donation QR\. \$\{chip\.sub\}/);
  });
  it("AX-9: the locked row reads 'locked' (the glyph is decorative)", () => {
    const p = read("ShelterProfileScreen.tsx");
    expect(p).toMatch(/accessibilityLabel=\{locked \? `\$\{label\}, locked/);
    expect(read("ShelterDonateScreen.tsx")).toMatch(/importantForAccessibility="no-hide-descendants"|accessibilityElementsHidden/);
  });
});
