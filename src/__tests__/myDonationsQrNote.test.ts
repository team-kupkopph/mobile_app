/**
 * DW4 (Abot-tulong QR plan, OQ6): a gift sent by QR leaves no record on the platform (it goes straight to the shelter's wallet), so My donations says
 * so, in both the empty and the list state: "Gifts you send by QR go straight to the shelter and don't appear here." Without it a donor who gave by QR
 * and then opens My donations reads "You haven't pledged anything yet" and wonders whether the gift was lost.
 */
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(__dirname, "..", "screens", "MyDonationsScreen.tsx"), "utf-8");

describe("My donations", () => {
  it("explains that QR gifts do not appear here", () => {
    expect(src).toContain("Gifts you send by QR go straight to the shelter and don't appear here.");
  });
  it("shows it as a direct child of the scroll content (outside every state branch), so both states carry it", () => {
    // 8-space indent = a top-level child of <ScrollView>, not inside the list's ternary/map (which indents deeper).
    expect(src).toMatch(/\n {8}<Text style=\{styles\.qrNote\}>Gifts you send by QR/);
  });
});
