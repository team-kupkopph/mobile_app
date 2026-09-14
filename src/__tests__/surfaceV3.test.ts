// Task A0.1 · the V3 surface, re-derived (spec §1).
//
// Sprint 11 pushed V3 tokens through all 90 screens, but actual V3 SURFACE adoption —
// <ScreenBackdrop> + <Card> — was only 7 owner screens. This test locks the re-derived
// baseline `surfaceV3()` measures, so the 35-screen conversion has ground truth instead
// of a remembered number.
//
// Task A1 (shell roots) converts ShelterDashboardScreen and ShelterProfileScreen onto
// <ScreenBackdrop> — the first two of the 34 in-scope screens to land — so the baseline
// grows from 7 to 9 here. Each conversion story updates this the same way it updates the
// named holdout lists in backdropAdoption.test.ts / cardAdoption.test.ts.
//
// Task A2 (shelter listings + needs) converts ListingFormScreen, ListingDetailScreen,
// PlaceRequestScreen and ShelterNeedsScreen onto <ScreenBackdrop> — the baseline grows
// from 9 to 13 here.
import { surfaceV3 } from "../../scripts/surface-v3.cjs";

describe("surface, re-derived", () => {
  const s = surfaceV3();

  it("found the screens", () => {
    expect(s.screens.length).toBeGreaterThan(80);
  });

  it("found the thirteen V3 screens on the backdrop (7 owner + 2 shell roots + 4 listings/needs)", () => {
    expect(s.backdrop.sort()).toEqual([
      "AdoptScreen",
      "HomeGuestScreen",
      "HomeScreen",
      "InquiryScreen",
      "ListingDetailScreen",
      "ListingFormScreen",
      "MyInquiriesScreen",
      "PlaceRequestScreen",
      "ProfileScreen",
      "ShelterDashboardScreen",
      "ShelterNeedsScreen",
      "ShelterProfileScreen",
      "SigninScreen"
    ]);
  });

  it("found the dead shelter tabs", () => {
    expect(s.deadTabs.sort()).toEqual(["animals", "donate", "requests"]);
  });
});
