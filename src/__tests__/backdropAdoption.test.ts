/**
 * Task A0.2 · the backdrop adoption guard.
 *
 * Actual V3 surface adoption is 7 owner screens on <ScreenBackdrop>. The other 34 screens
 * in spec §4.2's scope (see v3Scope.ts for why 34, not the plan's 35) do not sit on it yet.
 * This STARTED as a RATCHET with a NAMED holdout list, in the shape of themeAdoption.test.ts —
 * unlike that guard's flat `REMAINING = 0` count, each conversion story removed exactly its own
 * screens from BACKDROP_HOLDOUTS by name, so the list was the plan, not a summary of it.
 *
 * Starts at all 34: no in-scope screen has been converted yet in this PR.
 *
 * Task A1 (shell roots) converts ShelterDashboardScreen and ShelterProfileScreen onto
 * <ScreenBackdrop>, so those two leave the list here — 34 -> 32.
 *
 * Task A2 (shelter listings + needs) converts ListingFormScreen, ListingDetailScreen,
 * PlaceRequestScreen and ShelterNeedsScreen onto <ScreenBackdrop>, so those four leave
 * the list here — 32 -> 28.
 *
 * Task A3 (shelter donations) converts DonationQrScreen, DonateScreen, DonatePledgeScreen
 * and MyDonationsScreen onto <ScreenBackdrop>, so those four leave the list here — 28 -> 24.
 *
 * Task A4 (shelter volunteer) converts the nine ShelterVolunteer* screens onto
 * <ScreenBackdrop>, so those nine leave the list here — 24 -> 15.
 *
 * Task A5 (verified member) converts MemberUpgradeScreen, MemberVerifyScreen and
 * MemberSubmittedScreen onto <ScreenBackdrop>, so those three leave the list here — 15 -> 12.
 *
 * ZERO, AND IT IS NO LONGER A RATCHET (the `themeAdoption` precedent). Task A6 (Sagip rescuer)
 * converts the last twelve in-scope screens — MyRescuesScreen, MyOffersScreen, RescueMapScreen,
 * RescueListScreen, RescueListedScreen, RescueOfferScreen, RescueOfferSentScreen,
 * RescuePlaceScreen, RescuePlaceConfirmScreen, RescuePlaceSentScreen, RescueUpdateScreen,
 * PlaceAcceptedScreen — onto <ScreenBackdrop>, so those twelve leave the list here — 12 -> 0.
 * BACKDROP_HOLDOUTS stays `[]` from here: this is now a FLAT RULE, not "how many are left". A
 * screen inside V3_SCOPE that lacks <ScreenBackdrop> is a regression, full stop — raising this
 * list is not "recording progress", it is reintroducing the surface V3 was written to end.
 */
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { V3_SCOPE, V3_EXCLUDED } from "./v3Scope";

const SCREENS = join(__dirname, "..", "screens");
const read = (n: string) => readFileSync(join(SCREENS, `${n}.tsx`), "utf8");
const HAS_BACKDROP = /<ScreenBackdrop\b/;

/** Flat rule at zero — every V3 scope screen must be converted. */
const BACKDROP_HOLDOUTS: string[] = [];

describe("V3 screens sit on the backdrop", () => {
  it("found screens to classify", () => {
    expect(readdirSync(SCREENS).filter((f) => f.endsWith(".tsx")).length).toBeGreaterThan(80);
    expect(V3_SCOPE.length).toBe(36);
  });

  it("every in-scope screen not in the holdout list renders ScreenBackdrop", () => {
    const missing = V3_SCOPE.filter((n) => !BACKDROP_HOLDOUTS.includes(n) && !HAS_BACKDROP.test(read(n)));
    expect(missing).toEqual([]);
  });

  it("the holdout list only shrinks (a converted screen must leave it)", () => {
    const converted = BACKDROP_HOLDOUTS.filter((n) => HAS_BACKDROP.test(read(n)));
    expect(converted).toEqual([]);
  });

  it("names every excluded screen rather than implying it", () => {
    const all = readdirSync(SCREENS).filter((f) => f.endsWith(".tsx")).map((f) => f.replace(/\.tsx$/, ""));
    expect([...V3_SCOPE, ...V3_EXCLUDED].sort()).toEqual(all.sort());
  });
});
