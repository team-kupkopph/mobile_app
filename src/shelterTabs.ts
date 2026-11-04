import type { ShelterTabKey } from "./components/ShelterTabs";
import type { RootStackParamList } from "./navigation/types";

// SH11 (shelter home review) · the shelter shell's five tab roots, and the one function every bar presses through.
// It replaced eight hand-written `if (t === …) navigate(…)` chains, two of which had once left tabs as dead taps.
// The roots are stack routes, not a tab navigator (SQ5 makes that its own story), so a press is a plain navigate;
// pressing the tab you are on navigates to the route already showing, which does nothing.
export const SHELTER_TAB_ROUTE = {
  home: "shelterDashboard",
  animals: "shelterAnimals",
  donate: "shelterDonate",
  requests: "shelterRequests",
  profile: "shelterProfile"
} as const satisfies Record<ShelterTabKey, keyof RootStackParamList>;

type TabRoute = (typeof SHELTER_TAB_ROUTE)[ShelterTabKey];

export function shelterTabNavigate(navigation: { navigate: (route: TabRoute) => void }, key: ShelterTabKey): void {
  navigation.navigate(SHELTER_TAB_ROUTE[key]);
}

/** A navigation target's route name back to its tab key (push and bell targets name routes), or null for a non-tab. */
export function shelterTabKeyForRoute(route: string): ShelterTabKey | null {
  const hit = (Object.keys(SHELTER_TAB_ROUTE) as ShelterTabKey[]).find((k) => SHELTER_TAB_ROUTE[k] === route);
  return hit ?? null;
}

// SQ5 (PR 1) · the two helpers every INBOUND path will use (push taps, the bell, PlaceAccepted, the sign-in resets).
// For now they are plain-navigate shims onto the five stack routes, so callers can move first with no behaviour change;
// the switch PR changes only these bodies to `navigate("shelterTabs", { screen })` / a reset onto `shelterTabs`.
export function openShelterTab(navigation: { navigate: (route: TabRoute) => void }, key: ShelterTabKey): void {
  navigation.navigate(SHELTER_TAB_ROUTE[key]);
}

export function enterShelterShell(
  navigation: { reset: (state: { index: number; routes: { name: TabRoute }[] }) => void },
  key: ShelterTabKey = "home"
): void {
  navigation.reset({ index: 0, routes: [{ name: SHELTER_TAB_ROUTE[key] }] });
}
