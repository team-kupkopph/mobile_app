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
  it("shows it outside the ready/empty branch, so both states carry it", () => {
    const i = src.indexOf("Gifts you send by QR");
    const scroll = src.indexOf("</ScrollView>");
    expect(i).toBeGreaterThan(-1);
    expect(i).toBeLessThan(scroll);
    // it is not inside the `.map(` list body or the LoadStateView element
    const before = src.slice(0, i);
    expect(before.lastIndexOf("(pledges ?? []).map(")).toBeLessThan(before.lastIndexOf("})\n        )}"));
  });
});
