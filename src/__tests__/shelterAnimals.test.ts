// Task B2 · ShelterAnimalsScreen — the shelter's Animals tab root.
import { readFileSync } from "fs";
import { join } from "path";
import { SEGMENT_STATUS, STATUS_CHIP } from "../shelterAnimals";

const SCREEN = join(__dirname, "..", "screens", "ShelterAnimalsScreen.tsx");
const readScreen = () => readFileSync(SCREEN, "utf8");
const DASHBOARD = join(__dirname, "..", "screens", "ShelterDashboardScreen.tsx");
const readDashboard = () => readFileSync(DASHBOARD, "utf8");

describe("SEGMENT_STATUS", () => {
  it("maps SegmentedControl's index to the status B-be1 accepts, in Live/Pending/Adopted order", () => {
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

  it("renders SegmentedControl", () => {
    expect(readScreen()).toMatch(/<SegmentedControl\b/);
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
