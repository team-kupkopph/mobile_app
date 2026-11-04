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
