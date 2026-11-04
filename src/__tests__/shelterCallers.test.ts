/**
 * SQ5 PR 2 · every INBOUND path into a shelter tab goes through `openShelterTab` / `enterShelterShell`
 * (spec 2026-11-04-shelter-tab-navigator-design.md §5.2), so the switch PR changes two function bodies and no callers.
 * A scan, so it names what it must find: a guard that matches nothing proves nothing.
 */
import { readFileSync } from "fs";
import { join } from "path";

import { shelterTabKeyForRoute } from "../shelterTabs";

const read = (rel: string) => readFileSync(join(__dirname, "..", rel), "utf8");
const TAB_ROUTE = /["'](shelter(?:Dashboard|Animals|Donate|Requests|Profile))["']/;

describe("callers outside the tab roots", () => {
  const callers: [string, RegExp][] = [
    ["screens/NotificationsScreen.tsx", /openShelterTab\(navigation, "requests"\)/],
    ["screens/PlaceAcceptedScreen.tsx", /openShelterTab\(navigation, "animals"\)/],
    ["screens/HomeScreen.tsx", /enterShelterShell\(navigation\.getParent/],
    ["screens/ShelterVerifyScreen.tsx", /enterShelterShell\(navigation\)/],
    ["screens/ShelterVerifyNgoScreen.tsx", /enterShelterShell\(navigation\)/],
    ["push/PushBridge.tsx", /openShelterTab\(navRef, key\)/]
  ];
  it.each(callers)("%s uses the helper and names no tab route itself", (file, helper) => {
    const src = read(file);
    expect(src).toMatch(helper);
    // Comments may mention a route, and so may a `case "shelterRequests":` label (the bell switches on the target's
    // name); a navigate/reset/replace may not.
    const code = src.split("\n")
      .filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*") && !/^\s*case\s/.test(l)).join("\n");
    expect(code).not.toMatch(TAB_ROUTE);
  });
  it("ShelterVerifyScreen resets in both of its places", () => {
    expect(read("screens/ShelterVerifyScreen.tsx").match(/enterShelterShell\(navigation\)/g)).toHaveLength(2);
  });
});

describe("shelterTabKeyForRoute", () => {
  it("maps each tab route back to its key, and anything else to null", () => {
    expect(shelterTabKeyForRoute("shelterRequests")).toBe("requests");
    expect(shelterTabKeyForRoute("shelterDashboard")).toBe("home");
    expect(shelterTabKeyForRoute("shelterProfile")).toBe("profile");
    expect(shelterTabKeyForRoute("shelterNeeds")).toBeNull();
    expect(shelterTabKeyForRoute("applicant")).toBeNull();
  });
});
