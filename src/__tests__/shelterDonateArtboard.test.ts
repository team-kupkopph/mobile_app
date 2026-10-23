/**
 * Owner ruling 2026-10-22 (Abot-tulong QR plan, AT-D1): three differences between `ShelterDonate.dc.html` and `ShelterDonateScreen` are made to match the
 * artboard: (#1) the subtitle, (#3) the QR card's org name, its "Donations are on/paused" line and its On/Off chip, (#8) "Add a need" as a dashed
 * button below the wishlist. (#9, the backdrop: the screen already draws `ScreenBackdrop`.) The amber "Pending verification" chip waits for DW2: a
 * shelter cannot read its own pending QR yet (AT3).
 */
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(__dirname, "..", "screens", "ShelterDonateScreen.tsx"), "utf-8");

describe("ShelterDonateScreen vs the artboard", () => {
  it("#1 has the subtitle", () => {
    expect(src).toContain("Your donation QR and wishlist, in one place.");
  });
  it("#3 the QR card names the org, says on/paused and shows an On/Off chip", () => {
    expect(src).toContain("Donations are on");
    expect(src).toContain("Donations are paused");
    expect(src).toMatch(/label=\{donationsOn \? "On" : "Off"\}/);
    expect(src).toMatch(/orgName/);
  });
  it("#8 'Add a need' is a dashed button below the list, not a header action", () => {
    expect(src).not.toMatch(/actionLabel="Add a need"/);
    expect(src).toMatch(/borderStyle:\s*"dashed"/);
    expect(src).toMatch(/\+ Add a need|Add a need/);
    const list = src.indexOf("sections.needs.map(");
    const add = src.indexOf("styles.addNeed");
    expect(add).toBeGreaterThan(list);
  });
  it("#9 still draws the screen backdrop", () => {
    expect(src).toMatch(/<ScreenBackdrop \/>/);
  });
});
