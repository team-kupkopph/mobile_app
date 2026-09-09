/**
 * US-FD4 · the guard that keeps a converted screen converted.
 *
 * WHY THIS EXISTS AT ALL. Sprint 11 collapsed 77 distinct hex literals into a theme. Nothing
 * about that is durable on its own — this project has already watched a corrected value come
 * back twice. The pale #C9CEC7 tab icon was fixed, reintroduced by a palette consolidation, and
 * the test that should have caught it had quietly stopped testing anything when the export it
 * imported was renamed.
 *
 * ⚠️ THE ALLOW-LIST IS EXPLICIT, NOT DERIVED. A guard that computes its own scope from "files
 * that currently pass" can never fail: add a screen with raw hex and it simply excludes itself.
 * The list below is a claim about which screens have been converted, and adding to it is a
 * deliberate act in the story that converts one.
 *
 * ⚠️ COMMENTS ARE STRIPPED BEFORE SCANNING. MyInquiries documents the one tint that moved
 * during US-AD1 and names both hexes to do it. A guard that flags its own documentation is a
 * guard someone disables, and the explanation is worth more than the literal is harmful.
 *
 * ⚠️ COLOUR ONLY, FOR NOW, AND THAT IS AN HONEST LIMIT. Sprint 11 migrated colour; radii and
 * type were given scales (radii.ts, typography.ts) but no screen has been moved onto them yet,
 * so there is nothing to enforce and pretending otherwise would make this file a decoration.
 * The last test below asserts the scales EXIST and are the shape a later track can enforce.
 */
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const SCREENS = join(__dirname, "..", "screens");
const THEME = join(__dirname, "..", "theme");

const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const HEX = /#[0-9A-Fa-f]{6}\b/;

/** Screens migrated onto the theme. Grows in the story that migrates one — never automatically. */
const CONVERTED = [
  "AdjustPinScreen.tsx",
  "AdoptScreen.tsx",
  "ListingDetailScreen.tsx",
  "ListingFormScreen.tsx",
  "LocationPickerScreen.tsx",
  "MatchDetailScreen.tsx",
  "MemberSubmittedScreen.tsx",
  "MemberUpgradeScreen.tsx",
  "MemberVerifyScreen.tsx",
  "MyInquiriesScreen.tsx",
  "MyOffersScreen.tsx",
  "MyPetsScreen.tsx",
  "MyReportsScreen.tsx",
  "MyRescuesScreen.tsx",
  "PlaceAcceptedScreen.tsx",
  "PlaceRequestScreen.tsx",
  "ReportDetailScreen.tsx",
  "ReportMatchesScreen.tsx",
  "ReportSentScreen.tsx",
  "ReportStrayScreen.tsx",
  "RescueListScreen.tsx",
  "RescueListedScreen.tsx",
  "RescueMapScreen.tsx",
  "RescueOfferScreen.tsx",
  "RescueOfferSentScreen.tsx",
  "RescuePlaceConfirmScreen.tsx",
  "RescuePlaceScreen.tsx",
  "RescuePlaceSentScreen.tsx",
  "RescueUpdateScreen.tsx",
  "ShelterContactScreen.tsx",
  "SigninScreen.tsx",
  "WaiverScreen.tsx"
];

describe("design system · converted screens stay converted", () => {
  it("the allow-list is non-empty", () => {
    // A guard scoped to nothing passes forever.
    expect(CONVERTED.length).toBeGreaterThan(0);
  });

  it("every screen on the allow-list still exists", () => {
    const present = new Set(readdirSync(SCREENS));
    expect(CONVERTED.filter((f) => !present.has(f))).toEqual([]);
  });

  it.each(CONVERTED)("%s defines no colour of its own", (file) => {
    const src = stripComments(readFileSync(join(SCREENS, file), "utf8"));
    const found = src.match(new RegExp(HEX.source, "g")) ?? [];
    expect(found).toEqual([]);
  });

  it("no screen declares its own `const colors` while on the list", () => {
    const offenders = CONVERTED.filter((f) =>
      /^const colors = \{/m.test(stripComments(readFileSync(join(SCREENS, f), "utf8")))
    );
    expect(offenders).toEqual([]);
  });

  it("the theme is where colour lives", () => {
    // ⚠️ Assert the scan found something before trusting that it found nothing.
    const palette = readFileSync(join(THEME, "colors.ts"), "utf8");
    expect((palette.match(/#[0-9A-Fa-f]{6}/g) ?? []).length).toBeGreaterThan(20);
  });

  it("the radius and type scales exist, ready for a later track to enforce", () => {
    const radii = readFileSync(join(THEME, "radii.ts"), "utf8");
    const type = readFileSync(join(THEME, "typography.ts"), "utf8");
    expect(radii).toMatch(/squircle/);
    expect(radii).toMatch(/pill/);
    expect(type).toMatch(/display/);
    expect(type).toMatch(/label/);
  });
});
