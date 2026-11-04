/**
 * Every shelter screen's bottom tab bar must route to the four OTHER tabs (Run 6 part 18 found the Donate tab's bar handled only
 * "Home", and the Animals tab's bar had no route to Requests). SH11 held that with eight hand-written chains, then one helper
 * that eight bars pressed through.
 *
 * SQ5 · the shell is ONE bottom-tab navigator (spec 2026-11-04-shelter-tab-navigator-design.md). The rule now holds by
 * construction: the navigator renders the single bar, so no screen can forget it or route it wrongly. This test pins that
 * construction, and the two helpers every inbound path uses.
 */
import { readFileSync } from "fs";
import { join } from "path";

import { SHELTER_TAB_ROUTE, enterShelterShell, openShelterTab } from "../shelterTabs";

const read = (rel: string) => readFileSync(join(__dirname, "..", rel), "utf-8");
const SCREENS = ["ShelterDashboardScreen", "ShelterAnimalsScreen", "ShelterDonateScreen", "ShelterRequestsScreen", "ShelterProfileScreen"];
const nav = read("navigation/ShelterTabNavigator.tsx");
const root = read("navigation/RootNavigator.tsx");

describe("the bar is the navigator's, once", () => {
  it("the navigator renders exactly one <ShelterTabs>", () => {
    const code = nav.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
    expect(code.match(/<ShelterTabs\b/g)).toHaveLength(1);
  });
  it("a press emits tabPress, then navigates to the pressed tab's route (all five keys exist)", () => {
    expect(nav).toMatch(/type: "tabPress"/);
    expect(nav).toMatch(/navigation\.navigate\(route\.name\)/);
    expect(Object.keys(SHELTER_TAB_ROUTE)).toEqual(["home", "animals", "donate", "requests", "profile"]);
  });
  it.each(SCREENS)("%s renders no bar of its own, and no longer presses through the old helper", (file) => {
    const src = read(`screens/${file}.tsx`);
    expect(src).not.toMatch(/<ShelterTabs\b/);
    expect(src).not.toMatch(/shelterTabNavigate/);
    expect(src).not.toMatch(/import \{ ShelterTabs \}/);
  });
  it("the five names are registered once, inside the tab navigator, and no longer as root stack routes", () => {
    for (const s of SCREENS) {
      expect(nav).toContain(`component={${s}}`);
      expect(root).not.toMatch(new RegExp(`component=\\{${s}\\}`));
    }
    expect(root).toMatch(/<Stack\.Screen name="shelterTabs" component=\{ShelterTabNavigator\} \/>/);
  });
});

describe("inbound helpers", () => {
  it("openShelterTab reaches each tab through the nested form, popping back to a shell already on the stack", () => {
    const calls: unknown[][] = [];
    for (const key of ["home", "animals", "donate", "requests", "profile"] as const) {
      openShelterTab({ navigate: (...a) => calls.push(a) }, key);
    }
    expect(calls).toEqual(
      ["shelterDashboard", "shelterAnimals", "shelterDonate", "shelterRequests", "shelterProfile"].map((screen) => [
        "shelterTabs", { screen }, { pop: true }
      ])
    );
  });
  it("enterShelterShell resets onto Home by default and onto the named tab otherwise", () => {
    const states: unknown[] = [];
    enterShelterShell({ reset: (s) => states.push(s) });
    enterShelterShell({ reset: (s) => states.push(s) }, "requests");
    expect(states).toEqual([
      { index: 0, routes: [{ name: "shelterTabs", params: { screen: "shelterDashboard" } }] },
      { index: 0, routes: [{ name: "shelterTabs", params: { screen: "shelterRequests" } }] }
    ]);
  });
});
