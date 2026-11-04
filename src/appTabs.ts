import type { GuestTab } from "./components/GuestTabs";
import type { SignupWallAction } from "./components/SignupWall";
import type { OwnerTab } from "./components/OwnerTabs";
import type { GuestTabParamList, OwnerTabParamList } from "./navigation/types";

// SQ5 follow-up (spec 2026-11-04-owner-guest-tab-navigator-design.md §4.3) · the key -> route maps for the personal member's
// shell and the signed-out visitor's shell, and the helpers every INBOUND path will use (the nine sign-in/sign-up resets,
// the `kawanggawa` callers, Settings' "edit profile" return, the bell). The shelter shell's twin is `shelterTabs.ts`.
//
// PR 1: the helpers are plain-navigate shims onto the stack routes that are live today, so callers can move first (PR 2) with
// no behaviour change. The switch PR changes only these bodies to the nested forms:
//   enterOwnerShell  -> reset onto `ownerTabs` with { screen: "home", params }
//   openOwnerTab     -> navigate("ownerTabs", { screen, params }, { pop: true })
//   enterGuestShell  -> reset onto `guestTabs`
// (A root-level `navigate("kawanggawa")` does not reach a screen inside a tab navigator, and `pop: true` returns to a shell
// already on the stack instead of pushing a second one: shelter spec §7a.)
export const OWNER_TAB_ROUTE = {
  home: "home",
  adopt: "adopt",
  volunteer: "kawanggawa",
  profile: "profile"
} as const satisfies Record<OwnerTab, keyof OwnerTabParamList>;

/** The guest shell has TWO routes under a four-item bar: Adopt and You are bar-only (they open the sign-up wall). */
export const GUEST_TAB_ROUTE = {
  home: "homeGuest",
  volunteer: "kawanggawa"
} as const satisfies Partial<Record<GuestTab, keyof GuestTabParamList>>;

export type GuestRouteTab = keyof typeof GUEST_TAB_ROUTE;

/** A guest tab navigator route name back to its bar item, or null. */
export function guestTabKeyForRoute(route: string): GuestRouteTab | null {
  const hit = (Object.keys(GUEST_TAB_ROUTE) as GuestRouteTab[]).find((k) => GUEST_TAB_ROUTE[k] === route);
  return hit ?? null;
}

/** An owner tab navigator route name back to its bar item, or null. */
export function ownerTabKeyForRoute(route: string): OwnerTab | null {
  const hit = (Object.keys(OWNER_TAB_ROUTE) as OwnerTab[]).find((k) => OWNER_TAB_ROUTE[k] === route);
  return hit ?? null;
}

/** What a press on each of the four guest items does: a real tab, or the sign-up wall. Pure, so it needs no rendering. */
export function guestPressAction(key: GuestTab): { kind: "tab"; route: keyof GuestTabParamList } | { kind: "wall"; action: SignupWallAction } {
  if (key === "adopt") return { kind: "wall", action: "adopt" };
  if (key === "profile") return { kind: "wall", action: "account" };
  return { kind: "tab", route: GUEST_TAB_ROUTE[key] };
}

type OwnerRoute = (typeof OWNER_TAB_ROUTE)[OwnerTab];

/** Replace the whole stack with the personal member's shell on Home (`justSignedUp` is Home's one-shot intent flag). */
export function enterOwnerShell(
  navigation: { reset: (state: { index: number; routes: { name: "home"; params?: { justSignedUp?: boolean } }[] }) => void },
  params?: { justSignedUp?: boolean }
): void {
  navigation.reset({ index: 0, routes: [params ? { name: "home", params } : { name: "home" }] });
}

/** Open a member tab from anywhere: a pushed screen, the bell, Settings. `params` go to that tab (`{ tab }`, `{ editing }`). */
export function openOwnerTab(
  navigation: { navigate: (route: OwnerRoute, params?: object) => void },
  key: OwnerTab,
  params?: object
): void {
  navigation.navigate(OWNER_TAB_ROUTE[key], params);
}

/** Enter the signed-out visitor's shell (Welcome's "browse as a guest"). */
export function enterGuestShell(navigation: { navigate: (route: "homeGuest") => void }): void {
  navigation.navigate("homeGuest");
}
