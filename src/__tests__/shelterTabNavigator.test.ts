/**
 * SQ5 PR 1 · the shelter tab navigator is registered and shaped as the spec says (2026-11-04-shelter-tab-navigator-design.md §5).
 * It is inert: nothing navigates to `shelterTabs` yet, and the five screens still draw their own bar as stack routes.
 */
import { readFileSync } from "fs";
import { join } from "path";

import { SHELTER_TAB_ROUTE, enterShelterShell, openShelterTab } from "../shelterTabs";

const read = (rel: string) => readFileSync(join(__dirname, "..", rel), "utf8");
const nav = read("navigation/ShelterTabNavigator.tsx");
const root = read("navigation/RootNavigator.tsx");
const types = read("navigation/types.ts");

describe("ShelterTabNavigator", () => {
  it("registers the five tabs in the artboard's order, under their old route names", () => {
    const names = [...nav.matchAll(/<Tab\.Screen name="(\w+)"/g)].map((m) => m[1]);
    expect(names).toEqual(["shelterDashboard", "shelterAnimals", "shelterDonate", "shelterRequests", "shelterProfile"]);
    expect(names).toEqual(Object.values(SHELTER_TAB_ROUTE).sort((a, b) => names.indexOf(a) - names.indexOf(b)));
  });
  it("renders the shared bar through ShelterTabs, and sets the options the spec chose", () => {
    expect(nav).toMatch(/tabBar=\{\(props\) => <ShelterTabBar \{\.\.\.props\} \/>\}/);
    expect(nav).toMatch(/<ShelterTabs\s+active=\{active\}/);
    expect(nav).toMatch(/lazy: true/);
    expect(nav).toMatch(/freezeOnBlur: true/);
    expect(nav).toMatch(/animation: "none"/);
    expect(nav).toMatch(/backBehavior="firstRoute"/);
    expect(nav).toMatch(/initialRouteName="shelterDashboard"/);
  });
  it("is registered as the `shelterTabs` stack route, typed as a nested navigator", () => {
    expect(root).toMatch(/<Stack\.Screen name="shelterTabs" component=\{ShelterTabNavigator\} \/>/);
    expect(types).toMatch(/shelterTabs: NavigatorScreenParams<ShelterTabParamList> \| undefined;/);
    const list = /export type ShelterTabParamList = \{([^}]*)\}/.exec(types);
    expect(list).not.toBeNull();
    expect([...list![1].matchAll(/(\w+): undefined/g)].map((m) => m[1]).sort()).toEqual(Object.values(SHELTER_TAB_ROUTE).sort());
  });
  it("counts returns to the shell from a pushed screen (blur then focus)", () => {
    expect(nav).toMatch(/addListener\("blur"/);
    expect(nav).toMatch(/addListener\("focus"/);
    expect(nav).toMatch(/ShelterReturnContext\.Provider value=\{returns\}/);
  });
});

describe("inbound helpers (shims until the switch)", () => {
  it("openShelterTab navigates to the tab's route", () => {
    const calls: string[] = [];
    for (const key of ["home", "animals", "donate", "requests", "profile"] as const) openShelterTab({ navigate: (r) => calls.push(r) }, key);
    expect(calls).toEqual(["shelterDashboard", "shelterAnimals", "shelterDonate", "shelterRequests", "shelterProfile"]);
  });
  it("enterShelterShell resets onto Home by default and onto the named tab otherwise", () => {
    const states: unknown[] = [];
    enterShelterShell({ reset: (s) => states.push(s) });
    enterShelterShell({ reset: (s) => states.push(s) }, "requests");
    expect(states).toEqual([
      { index: 0, routes: [{ name: "shelterDashboard" }] },
      { index: 0, routes: [{ name: "shelterRequests" }] }
    ]);
  });
});
