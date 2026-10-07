// Task B2 · ShelterAnimalsScreen — the shelter's Animals tab root.
import { readFileSync } from "fs";
import { join } from "path";
import { DRAFT_STATUS, SEGMENT_STATUS, STATUS_CHIP, acceptedPlacementParams, draftRoute } from "../shelterAnimals";

const SCREEN = join(__dirname, "..", "screens", "ShelterAnimalsScreen.tsx");
const readScreen = () => readFileSync(SCREEN, "utf8");
const BODY = join(__dirname, "..", "components", "ListingsByStatus.tsx");
const readBody = () => readFileSync(BODY, "utf8");
const DASHBOARD = join(__dirname, "..", "screens", "ShelterDashboardScreen.tsx");
const readDashboard = () => readFileSync(DASHBOARD, "utf8");

describe("SEGMENT_STATUS", () => {
  it("maps SegmentedControl's index to the status B-be1 accepts, in Live/Reserved/Adopted order", () => {
    expect(SEGMENT_STATUS).toEqual({ 0: "available", 1: "pending", 2: "adopted" });
  });
});

describe("STATUS_CHIP", () => {
  it("has one entry per SEGMENT_STATUS value", () => {
    expect(Object.keys(STATUS_CHIP).sort()).toEqual(Object.values(SEGMENT_STATUS).sort());
  });
});

describe("ShelterAnimalsScreen file guards", () => {
  it("renders ScreenBackdrop", () => {
    expect(readScreen()).toMatch(/<ScreenBackdrop\b/);
  });

  it('renders ShelterTabs active="animals"', () => {
    expect(readScreen()).toMatch(/<ShelterTabs[\s\S]*?active="animals"/);
  });

  it('carries testID="screen.shelterAnimals"', () => {
    expect(readScreen()).toMatch(/testID="screen\.shelterAnimals"/);
  });

  it("renders the shared list body, which renders SegmentedControl", () => {
    expect(readScreen()).toMatch(/<ListingsByStatus\b/);
    expect(readBody()).toMatch(/<SegmentedControl\b/);
  });
});

describe("the '+ List an animal' CTA moved here from the dashboard", () => {
  it("ShelterDashboardScreen no longer renders it", () => {
    const dash = readDashboard();
    expect(dash).not.toMatch(/List an animal/);
  });

  it("ShelterAnimalsScreen renders it instead", () => {
    expect(readScreen()).toMatch(/List an animal/);
  });
});


// D7 · a shelter that accepts a placement gets the animal as a DRAFT listing. Drafts sit in
// their own strip above the three segments — the segments follow the canvas artboard
// (Live / Reserved / Adopted) and stay exactly as drawn.
describe("drafts from accepted placements (D7)", () => {
  it("fetches drafts under their own wire status", () => {
    expect(DRAFT_STATUS).toBe("draft");
    expect(readBody()).toMatch(/status=\$\{DRAFT_STATUS\}/);
  });

  it("leaves the artboard's three segments untouched", () => {
    expect(Object.values(SEGMENT_STATUS)).not.toContain("draft");
  });

  it("opens a draft in the listing form, to finish it before publishing", () => {
    expect(draftRoute("l-1")).toEqual({ name: "listingForm", params: { listingId: "l-1" } });
  });

  it("threads the draft's id from the accept response to the confirmation", () => {
    expect(acceptedPlacementParams({ listing_id: "l-9", draft: true })).toEqual({ listingId: "l-9" });
    expect(acceptedPlacementParams({ pet_id: "p-1" })).toBeUndefined();
    expect(acceptedPlacementParams(null)).toBeUndefined();
  });

  it("offers Publish, not Inquire, on a draft", () => {
    const screen = readFileSync(join(__dirname, "..", "screens", "PosterListingScreen.tsx"), "utf8");
    expect(screen).toMatch(/btn\.posterListing\.publish/);
    expect(screen).toMatch(/listing\.status === "draft"/);
  });
});
