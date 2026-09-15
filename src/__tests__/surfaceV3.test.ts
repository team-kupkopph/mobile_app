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
//
// Task A3 (shelter donations) converts DonationQrScreen, DonateScreen, DonatePledgeScreen
// and MyDonationsScreen onto <ScreenBackdrop> — the baseline grows from 13 to 17 here.
//
// Task A4 (shelter volunteer) converts all nine ShelterVolunteer* screens onto
// <ScreenBackdrop> — the baseline grows from 17 to 26 here.
//
// Task A5 (verified member) converts MemberUpgradeScreen, MemberVerifyScreen and
// MemberSubmittedScreen onto <ScreenBackdrop> — the baseline grows from 26 to 29 here.
//
// Task A6 (Sagip rescuer) converts the 12 Sagip rescuer screens — MyRescuesScreen,
// MyOffersScreen, RescueMapScreen, RescueListScreen, RescueListedScreen, RescueOfferScreen,
// RescueOfferSentScreen, RescuePlaceScreen, RescuePlaceConfirmScreen, RescuePlaceSentScreen,
// RescueUpdateScreen, PlaceAcceptedScreen — onto <ScreenBackdrop>. This is the last A-story:
// the baseline grows from 29 to 41 here, and both `backdropAdoption`/`cardAdoption` holdout
// lists go to `[]` (flat rule at zero, the `themeAdoption` precedent).
import { surfaceV3 } from "../../scripts/surface-v3.cjs";

describe("surface, re-derived", () => {
  const s = surfaceV3();

  it("found the screens", () => {
    expect(s.screens.length).toBeGreaterThan(80);
  });

  it("found the forty-one V3 screens on the backdrop (7 owner + 2 shell roots + 4 listings/needs + 4 donations + 9 volunteer + 3 verified member + 12 Sagip rescuer)", () => {
    expect(s.backdrop.sort()).toEqual([
      "AdoptScreen",
      "DonatePledgeScreen",
      "DonateScreen",
      "DonationQrScreen",
      "HomeGuestScreen",
      "HomeScreen",
      "InquiryScreen",
      "ListingDetailScreen",
      "ListingFormScreen",
      "MemberSubmittedScreen",
      "MemberUpgradeScreen",
      "MemberVerifyScreen",
      "MyDonationsScreen",
      "MyInquiriesScreen",
      "MyOffersScreen",
      "MyRescuesScreen",
      "PlaceAcceptedScreen",
      "PlaceRequestScreen",
      "ProfileScreen",
      "RescueListScreen",
      "RescueListedScreen",
      "RescueMapScreen",
      "RescueOfferScreen",
      "RescueOfferSentScreen",
      "RescuePlaceConfirmScreen",
      "RescuePlaceScreen",
      "RescuePlaceSentScreen",
      "RescueUpdateScreen",
      "ShelterDashboardScreen",
      "ShelterNeedsScreen",
      "ShelterProfileScreen",
      "ShelterVolunteerActivityScreen",
      "ShelterVolunteerAttendanceScreen",
      "ShelterVolunteerCalendarScreen",
      "ShelterVolunteerCancelScreen",
      "ShelterVolunteerCreateScreen",
      "ShelterVolunteerDetailScreen",
      "ShelterVolunteerEditScreen",
      "ShelterVolunteerRequestsScreen",
      "ShelterVolunteerScreen",
      "SigninScreen"
    ]);
  });

  it("found the dead shelter tabs", () => {
    expect(s.deadTabs.sort()).toEqual(["animals", "donate", "requests"]);
  });
});
