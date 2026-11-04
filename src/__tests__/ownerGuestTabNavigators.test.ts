/**
 * SQ5 follow-up PR 1 · the owner and guest tab navigators are registered and shaped as the spec says
 * (2026-11-04-owner-guest-tab-navigator-design.md §4). They are inert: nothing navigates to `ownerTabs` / `guestTabs` yet, and
 * the screens still draw their own bars as stack routes. Source scans, so each one asserts it found what it scans.
 */
import { readFileSync } from "fs";
import { join } from "path";

import { GUEST_TAB_ROUTE, OWNER_TAB_ROUTE } from "../appTabs";

const read = (rel: string) => readFileSync(join(__dirname, "..", rel), "utf8");
const owner = read("navigation/OwnerTabNavigator.tsx");
const guest = read("navigation/GuestTabNavigator.tsx");
const root = read("navigation/RootNavigator.tsx");
const types = read("navigation/types.ts");
const names = (src: string) => [...src.matchAll(/<Tab\.Screen name="(\w+)"/g)].map((m) => m[1]);
const paramKeys = (name: string) => {
  // A param type may itself contain braces (`home: { justSignedUp?: boolean }`), so read to the closing `};` of the block.
  const list = new RegExp(`export type ${name} = \\{\\n([\\s\\S]*?)\\n\\};`).exec(types);
  expect(list).not.toBeNull();
  return [...list![1].matchAll(/^ {2}(\w+):/gm)].map((m) => m[1]);
};
const OPTIONS = [/lazy: true/, /freezeOnBlur: true/, /animation: "none"/, /backBehavior="firstRoute"/];

describe("OwnerTabNavigator", () => {
  it("registers the four tabs in bar order under their old route names", () => {
    expect(names(owner)).toEqual(["home", "adopt", "kawanggawa", "profile"]);
    expect(names(owner)).toEqual(Object.values(OWNER_TAB_ROUTE));
    expect(paramKeys("OwnerTabParamList")).toEqual(names(owner));
  });
  it("draws the shared bar through OwnerTabs, vetoable by tabPress, with the shelter's options", () => {
    expect(owner).toMatch(/<OwnerTabs\s+active=\{active\}/);
    expect(owner).toMatch(/type: "tabPress"/);
    for (const o of OPTIONS) expect(owner).toMatch(o);
    expect(owner).toMatch(/initialRouteName="home"/);
  });
});

describe("GuestTabNavigator", () => {
  it("registers TWO tabs, Home and Volunteer", () => {
    expect(names(guest)).toEqual(["homeGuest", "kawanggawa"]);
    expect(names(guest)).toEqual(Object.values(GUEST_TAB_ROUTE));
    expect(paramKeys("GuestTabParamList")).toEqual(names(guest));
  });
  it("draws the four-item guest bar, hosts the wall for Adopt and You, and never navigates for them", () => {
    expect(guest).toMatch(/<GuestTabs\s+active=\{active\}/);
    expect(guest).toMatch(/guestPressAction\(key\)/);
    expect(guest).toMatch(/if \(press\.kind === "wall"\) return onGated\(press\.action\);/);
    expect(guest).toMatch(/<SignupWall/);
    for (const o of OPTIONS) expect(guest).toMatch(o);
    expect(guest).toMatch(/initialRouteName="homeGuest"/);
  });
});

describe("registration (inert)", () => {
  it("both are root-stack routes typed as nested navigators", () => {
    expect(root).toMatch(/<Stack\.Screen name="ownerTabs" component=\{OwnerTabNavigator\} \/>/);
    expect(root).toMatch(/<Stack\.Screen name="guestTabs" component=\{GuestTabNavigator\} \/>/);
    expect(types).toMatch(/ownerTabs: NavigatorScreenParams<OwnerTabParamList> \| undefined;/);
    expect(types).toMatch(/guestTabs: NavigatorScreenParams<GuestTabParamList> \| undefined;/);
  });
  it("the five live stack routes are still registered (nothing moved yet)", () => {
    for (const r of ["home", "adopt", "kawanggawa", "profile", "homeGuest"]) {
      expect(root).toMatch(new RegExp(`<Stack\\.Screen name="${r}"`));
    }
  });
  it("the bars still work without a navigator: their default presses are the stack navigates they were", () => {
    const o = read("components/OwnerTabs.tsx");
    const g = read("components/GuestTabs.tsx");
    expect(o).toMatch(/onTabPress \? onTabPress\(key\) : navigation\.navigate\(route as never\)/);
    expect(g).toMatch(/onTabPress \? onTabPress\("adopt"\) : onGated\?\.\("adopt"\)/);
    expect(g).toMatch(/navigation\.navigate\("homeGuest"\)/);
    for (const id of ["tab.home", "tab.adopt", "tab.volunteer", "tab.profile"]) expect(o).toContain(`"${id}"`);
    for (const id of ["tab.guest.home", "tab.guest.adopt", "tab.guest.volunteer", "tab.guest.profile"]) expect(g).toContain(`"${id}"`);
  });
});
