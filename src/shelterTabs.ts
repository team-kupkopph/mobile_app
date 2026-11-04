import type { ShelterTabKey } from "./components/ShelterTabs";
import type { ShelterTabParamList } from "./navigation/types";

// SH11 (shelter home review) · the shelter shell's five tab roots. SQ5 · they now live in ONE bottom-tab navigator
// (`ShelterTabNavigator`, the `shelterTabs` route), which presses its own tabs. This file keeps the key -> route map and
// the two helpers every INBOUND path uses (push taps, the bell, PlaceAccepted, the sign-in resets), so the next change to
// the shell is made here and nowhere else.
export const SHELTER_TAB_ROUTE = {
  home: "shelterDashboard",
  animals: "shelterAnimals",
  donate: "shelterDonate",
  requests: "shelterRequests",
  profile: "shelterProfile"
} as const satisfies Record<ShelterTabKey, keyof ShelterTabParamList>;

type TabRoute = (typeof SHELTER_TAB_ROUTE)[ShelterTabKey];

/** A navigation target's route name back to its tab key (push and bell targets name routes), or null for a non-tab. */
export function shelterTabKeyForRoute(route: string): ShelterTabKey | null {
  const hit = (Object.keys(SHELTER_TAB_ROUTE) as ShelterTabKey[]).find((k) => SHELTER_TAB_ROUTE[k] === route);
  return hit ?? null;
}

type ShellParams = { screen: TabRoute };
type OpenNav = { navigate: (name: "shelterTabs", params: ShellParams, options: { pop: true }) => void };
type ResetNav = {
  reset: (state: { index: number; routes: { name: "shelterTabs"; params: ShellParams }[] }) => void;
};

// ⚠️ THE NESTED FORM IS REQUIRED, NOT A PRECAUTION. A root-level `navigate("shelterRequests")` never reaches a screen inside
// the tab navigator (core's useOnAction hands an action to child navigators only with a `target` or
// `navigationInChildEnabled`, which is off) — spec §7a, item 1.
// ⚠️ `pop: true`: without it, `navigate("shelterTabs")` from a screen pushed over the shell (a push tap while on
// `applicant`) would push a SECOND tab navigator instead of returning to the one underneath. With it, the stack pops back to
// the existing `shelterTabs` and `screen` switches its tab. From a screen with no shell below, it pushes one.
export function openShelterTab(navigation: OpenNav, key: ShelterTabKey): void {
  navigation.navigate("shelterTabs", { screen: SHELTER_TAB_ROUTE[key] }, { pop: true });
}

/** Replace the whole stack with the shell on `key` (sign-in, the shelter redirect on Home, finishing verification). */
export function enterShelterShell(navigation: ResetNav, key: ShelterTabKey = "home"): void {
  navigation.reset({ index: 0, routes: [{ name: "shelterTabs", params: { screen: SHELTER_TAB_ROUTE[key] } }] });
}
