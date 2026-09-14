// Task A0.1 · the V3 surface, re-derived (spec §1).
//
// Sprint 11 pushed V3 tokens through all 90 screens, but actual V3 SURFACE adoption —
// <ScreenBackdrop> + <Card> — was only 7 owner screens. This test locks the re-derived
// baseline `surfaceV3()` measures, so the 35-screen conversion has ground truth instead
// of a remembered number.
import { surfaceV3 } from "../../scripts/surface-v3.cjs";

describe("surface, re-derived", () => {
  const s = surfaceV3();

  it("found the screens", () => {
    expect(s.screens.length).toBeGreaterThan(80);
  });

  it("found the seven V3 owner screens by backdrop", () => {
    expect(s.backdrop.sort()).toEqual([
      "AdoptScreen",
      "HomeGuestScreen",
      "HomeScreen",
      "InquiryScreen",
      "MyInquiriesScreen",
      "ProfileScreen",
      "SigninScreen"
    ]);
  });

  it("found the dead shelter tabs", () => {
    expect(s.deadTabs.sort()).toEqual(["animals", "donate", "requests"]);
  });
});
