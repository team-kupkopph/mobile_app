/**
 * Every shelter screen's bottom tab bar must route to the four OTHER tabs (found in the Run 6 part 18 default-size pass): the Donate tab's bar handled only "Home"
 * (`t === "home" && navigate(...)`), so Animals, Requests and You were dead taps from it, and the Animals tab's bar had no route to Requests. Nothing about text size:
 * a navigation dead end that the AX5 walks happened to step around (they entered each tab from Home).
 *
 * SH11 (shelter home review, step 14) · that rule was held by eight hand-written `if (t === …)` chains, one per bar (two on
 * Dashboard, You and Donate: their failure branches carry the bar too). They now all call `shelterTabNavigate`, so the
 * routing is tested once, on the helper, and the scan only checks that every bar uses it.
 */
import { readFileSync } from "fs";
import { join } from "path";

import { SHELTER_TAB_ROUTE, shelterTabNavigate } from "../shelterTabs";

const SCREENS = ["ShelterDashboardScreen", "ShelterAnimalsScreen", "ShelterDonateScreen", "ShelterRequestsScreen", "ShelterProfileScreen"];

describe("shelterTabNavigate", () => {
  it("routes each of the five tabs to its root", () => {
    const calls: string[] = [];
    const nav = { navigate: (route: string) => calls.push(route) };
    for (const key of ["home", "animals", "donate", "requests", "profile"] as const) shelterTabNavigate(nav, key);
    expect(calls).toEqual(["shelterDashboard", "shelterAnimals", "shelterDonate", "shelterRequests", "shelterProfile"]);
    expect(new Set(Object.values(SHELTER_TAB_ROUTE)).size).toBe(5);
  });
});

const blocks = (src: string) => {
  const out: string[] = [];
  const re = /<ShelterTabs[\s\S]*?\/>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) out.push(m[0]);
  return out;
};

describe.each(SCREENS)("%s's tab bars", (file) => {
  const src = readFileSync(join(__dirname, "..", "screens", `${file}.tsx`), "utf-8");
  const bs = blocks(src);
  it("the scan found the tab bar (a guard that matches nothing proves nothing)", () => {
    expect(bs.length).toBeGreaterThan(0);
  });
  it("every bar routes through the one helper, with no hand-written chain", () => {
    for (const b of bs) {
      expect(b).toMatch(/onTabPress=\{\(t\) => shelterTabNavigate\(navigation, t\)\}/);
      expect(b).not.toMatch(/t === "/);
    }
  });
});

it("the eight bars are all still there", () => {
  const total = SCREENS.reduce(
    (n, f) => n + blocks(readFileSync(join(__dirname, "..", "screens", `${f}.tsx`), "utf-8")).length, 0);
  expect(total).toBe(8);
});
