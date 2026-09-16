/**
 * Task A0.2 · the card adoption ratchet.
 *
 * Adopting <Card> retires the raw `...elevation.*` style spread screens use today to fake a
 * card surface by hand — <Card> owns elevation internally. So this guard's polarity is
 * inverted from backdropAdoption.test.ts: the desired end state is the ABSENCE of the match,
 * not its presence. Same shape otherwise (named holdouts in the shape of themeAdoption.test.ts;
 * a conversion story removes exactly its screens).
 *
 * CARD_HOLDOUTS starts as the SUBSET of V3_SCOPE that currently spreads `...elevation.` (24
 * of the 34) — not all 34. The other 10 in-scope screens (ListingFormScreen, DonationQrScreen,
 * MemberSubmittedScreen, RescueListScreen, RescueListedScreen, RescueOfferSentScreen,
 * RescuePlaceScreen, RescuePlaceConfirmScreen, RescuePlaceSentScreen, PlaceAcceptedScreen)
 * never had a raw elevation spread to retire in the first place, so they already satisfy this
 * guard's end state and were never a real holdout for it — seeding them into CARD_HOLDOUTS
 * would make the "no longer matches must leave the list" assertion fail on this PR's very
 * first run, for screens this guard has no conversion work to record.
 * Verified against `pnpm surface:v3`'s elevationSpreaders list; re-check if that list moves.
 *
 * Task A1 (shell roots) converts ShelterDashboardScreen and ShelterProfileScreen onto <Card>,
 * so those two leave the list here — 24 -> 22.
 *
 * Task A2 (shelter listings + needs) converts ListingDetailScreen, PlaceRequestScreen and
 * ShelterNeedsScreen onto <Card> — 22 -> 19. ListingFormScreen (the fourth screen in that
 * task) never spread `...elevation.*` in the first place (see the note above) and so was
 * never in this list.
 *
 * Task A3 (shelter donations) converts DonateScreen, DonatePledgeScreen and MyDonationsScreen
 * onto <Card> — 19 -> 16. DonationQrScreen (the fourth screen in that task) never spread
 * `...elevation.*` in the first place (see the note above) and so was never in this list.
 *
 * Task A4 (shelter volunteer) converts all nine ShelterVolunteer* screens onto <Card>,
 * so those nine leave the list here — 16 -> 7.
 */
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { V3_SCOPE, V3_EXCLUDED } from "./v3Scope";

const SCREENS = join(__dirname, "..", "screens");
const read = (n: string) => readFileSync(join(SCREENS, `${n}.tsx`), "utf8");
const SPREADS_ELEVATION = /\.\.\.elevation\./;

/**
 * Named holdouts: the in-scope screens that currently spread `...elevation.*` directly.
 * Each conversion story (adopting <Card>) removes exactly its screens.
 */
const CARD_HOLDOUTS: string[] = [
  "MemberUpgradeScreen",
  "MemberVerifyScreen",
  "MyRescuesScreen",
  "MyOffersScreen",
  "RescueMapScreen",
  "RescueOfferScreen",
  "RescueUpdateScreen"
];

describe("V3 screens adopt Card instead of a raw elevation spread", () => {
  it("found screens to classify", () => {
    expect(readdirSync(SCREENS).filter((f) => f.endsWith(".tsx")).length).toBeGreaterThan(80);
    expect(V3_SCOPE.length).toBe(34);
  });

  it("every in-scope screen not in the holdout list no longer spreads ...elevation.*", () => {
    const missing = V3_SCOPE.filter((n) => !CARD_HOLDOUTS.includes(n) && SPREADS_ELEVATION.test(read(n)));
    expect(missing).toEqual([]);
  });

  it("the holdout list only shrinks (a converted screen must leave it)", () => {
    const converted = CARD_HOLDOUTS.filter((n) => !SPREADS_ELEVATION.test(read(n)));
    expect(converted).toEqual([]);
  });

  it("names every excluded screen rather than implying it", () => {
    const all = readdirSync(SCREENS).filter((f) => f.endsWith(".tsx")).map((f) => f.replace(/\.tsx$/, ""));
    expect([...V3_SCOPE, ...V3_EXCLUDED].sort()).toEqual(all.sort());
  });
});
