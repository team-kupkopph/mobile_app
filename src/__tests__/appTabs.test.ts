/**
 * SQ5 follow-up PR 1 · the owner and guest shells' key -> route maps and inbound helpers (spec
 * 2026-11-04-owner-guest-tab-navigator-design.md §4.3). The helpers are plain-navigate shims until the switch PR, so these
 * pin the shapes callers will keep using and the guest bar's four-items-over-two-routes mapping.
 */
import {
  GUEST_TAB_ROUTE, OWNER_TAB_ROUTE, enterGuestShell, enterOwnerShell, guestPressAction, guestTabKeyForRoute, openOwnerTab, ownerTabKeyForRoute
} from "../appTabs";

describe("owner shell helpers", () => {
  it("maps the four bar items to their routes, Volunteer to the Kawang-Gawa hub", () => {
    expect(OWNER_TAB_ROUTE).toEqual({ home: "home", adopt: "adopt", volunteer: "kawanggawa", profile: "profile" });
  });
  it("maps a route back to its item, and anything else to null", () => {
    expect(ownerTabKeyForRoute("kawanggawa")).toBe("volunteer");
    expect(ownerTabKeyForRoute("home")).toBe("home");
    expect(ownerTabKeyForRoute("shelterDashboard")).toBeNull();
  });
  it("enterOwnerShell resets onto Home, carrying justSignedUp only when given", () => {
    const states: unknown[] = [];
    enterOwnerShell({ reset: (s) => states.push(s) });
    enterOwnerShell({ reset: (s) => states.push(s) }, { justSignedUp: true });
    expect(states).toEqual([
      { index: 0, routes: [{ name: "home" }] },
      { index: 0, routes: [{ name: "home", params: { justSignedUp: true } }] }
    ]);
  });
  it("openOwnerTab navigates to the tab's route with its params", () => {
    const calls: unknown[][] = [];
    const nav = { navigate: (...a: unknown[]) => calls.push(a) };
    openOwnerTab(nav, "volunteer", { tab: "mine" });
    openOwnerTab(nav, "profile", { editing: true });
    openOwnerTab(nav, "adopt");
    expect(calls).toEqual([["kawanggawa", { tab: "mine" }], ["profile", { editing: true }], ["adopt", undefined]]);
  });
});

describe("guest shell helpers", () => {
  it("has TWO routes: Home and Volunteer; Adopt and You are bar-only", () => {
    expect(GUEST_TAB_ROUTE).toEqual({ home: "homeGuest", volunteer: "kawanggawa" });
    expect(guestTabKeyForRoute("homeGuest")).toBe("home");
    expect(guestTabKeyForRoute("kawanggawa")).toBe("volunteer");
    expect(guestTabKeyForRoute("adopt")).toBeNull();
  });
  it("a press on each of the four items: tabs navigate, Adopt and You open the wall", () => {
    expect(guestPressAction("home")).toEqual({ kind: "tab", route: "homeGuest" });
    expect(guestPressAction("volunteer")).toEqual({ kind: "tab", route: "kawanggawa" });
    expect(guestPressAction("adopt")).toEqual({ kind: "wall", action: "adopt" });
    expect(guestPressAction("profile")).toEqual({ kind: "wall", action: "account" });
  });
  it("enterGuestShell opens the guest Home", () => {
    const calls: string[] = [];
    enterGuestShell({ navigate: (r) => calls.push(r) });
    expect(calls).toEqual(["homeGuest"]);
  });
});
