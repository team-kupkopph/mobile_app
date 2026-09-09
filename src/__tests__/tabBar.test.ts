/**
 * US-CH1 · the tab bar's GEOMETRY and its e2e contract.
 *
 * Two things nearly went wrong in this story, and each has an assertion here.
 *
 * ⚠️ 1 — THE 44 pt TARGET, RE-CHECKED RATHER THAN COPIED. The old ShelterTabs gave its items no
 * height at all: they sized to their content, a 28 pt icon slot plus a 9 pt label, which measured
 * about 41 pt — under the minimum. The owner bar was fine only because its items were
 * `height: "100%"` of a 68 pt bar. The story warned specifically against copying the owner's
 * numbers, because the shelter bar has FIVE tabs, not four, and the horizontal arithmetic is the
 * one that differs.
 *
 * ⚠️ 2 — THE testID CONTRACT. Rewriting three bars into one moves every testID. Six of them are
 * named by the Maestro flows, and a renamed selector does not fail a unit test — it fails a flow,
 * later, somewhere else. So this reads the flows and asserts against what they actually ask for,
 * rather than against a list retyped here that could drift with the code it is meant to pin.
 */
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

import { TAB_BAR } from "../components/ui/TabBar";

const SRC = join(__dirname, "..");
const FLOWS = join(__dirname, "..", "..", "e2e", "flows");

/** Narrowest screen this app supports. Below this, iOS 26 does not run. */
const NARROWEST_SCREEN = 375;
const MIN_TARGET = 44;
/** The shelter shell's bar — the crowded one. */
const MOST_TABS = 5;

describe("tab bar geometry", () => {
  it("gives every tab item at least 44 pt of height", () => {
    // Items are `height: "100%"` of the bar, so the bar's height IS the target height.
    expect(TAB_BAR.height).toBeGreaterThanOrEqual(MIN_TARGET);
  });

  it("gives every tab item at least 44 pt of width, even with five tabs on the narrowest screen", () => {
    const barWidth = NARROWEST_SCREEN - TAB_BAR.gutter * 2;
    expect(barWidth / MOST_TABS).toBeGreaterThanOrEqual(MIN_TARGET);
  });

  it("floats clear of the bottom edge", () => {
    // The old shelter bar sat at bottom: 0, height 78, so its labels rendered inside the
    // home-indicator zone. Any positive inset lifts the whole control out of it.
    expect(TAB_BAR.inset).toBeGreaterThan(0);
  });

  it("keeps tabBarClearance consistent with the bar it is meant to clear", () => {
    // spacing.tabBarClearance is what scrolling screens pad by. If the bar's height or inset
    // changes and this does not, content gets trapped behind it — the comment on that token
    // says it "tracks OwnerTabs' geometry", so make that a check rather than a hope.
    const { tabBarClearance } = require("../theme/spacing");
    expect(tabBarClearance).toBeGreaterThanOrEqual(TAB_BAR.height + TAB_BAR.inset);
  });
});

/**
 * ⚠️ NOT A DUPLICATE OF e2eSelectors.test.ts, which asks a different question. That file asks
 * whether each flow selector exists ANYWHERE in the app. This one asks whether the BARS still
 * provide them. A tab id that survived somewhere else entirely would satisfy that file and
 * still leave the tab bar untappable, which is precisely the shape of this story's risk.
 */
describe("tab bar testID contract", () => {
  const flowFiles = readdirSync(FLOWS).filter((f) => f.endsWith(".yaml"));
  const flowText = flowFiles.map((f) => readFileSync(join(FLOWS, f), "utf8")).join("\n");
  const wanted = Array.from(new Set(flowText.match(/\btab\.[a-zA-Z0-9._]+/g) ?? [])).sort();

  const barText = ["components/ui/TabBar.tsx", "components/OwnerTabs.tsx", "components/ShelterTabs.tsx", "screens/HomeGuestScreen.tsx"]
    .map((rel) => readFileSync(join(SRC, rel), "utf8"))
    .join("\n");
  const provided = Array.from(
    new Set(Array.from(barText.matchAll(/testID: "(tab\.[a-zA-Z0-9._]+)"/g), (m) => m[1]))
  );

  it("found flows to read, and selectors in them", () => {
    // Guard the guard: an empty flow dir would make the assertion below vacuously true, which
    // is exactly how a selector scan in this repo has reported "all clear" before.
    expect(flowFiles.length).toBeGreaterThan(0);
    expect(wanted.length).toBeGreaterThan(0);
  });

  it("found the bars' own testIDs", () => {
    expect(provided.length).toBeGreaterThanOrEqual(wanted.length);
  });

  it.each(wanted.map((s) => [s]))("still provides %s, which a flow taps", (selector: string) => {
    expect(provided).toContain(selector);
  });
});
