// SQ5 (shelter home review; spec 2026-11-04-shelter-tab-navigator-design.md) · the shelter shell as ONE bottom-tab
// navigator. It is the `shelterTabs` route of the root stack; the five tabs keep their old route names, so the
// `screen.shelter*` ids and the screens' files do not move.
//
// PR 1 registers this and nothing navigates to it yet: the screens still draw their own <ShelterTabs> as stack routes.
// The switch PR points `openShelterTab` / `enterShelterShell` here and deletes the eight hand-mounted bars.
//
// ⚠️ THE BAR IS NOT LAID OUT BY THE NAVIGATOR. bottom-tabs renders a custom `tabBar` as a flex sibling after its
// screens, but the shared TabBar's root is `position: absolute`, so it takes no flow height and the scenes (which are
// `absoluteFill`) get no extra bottom inset. Content still clears the bar by `tabBarClearance`, as before. Verified by
// reading BottomTabView in 7.21.0 (spec §4.5); the sim walk in the switch PR is the proof on a device.
import { BottomTabBarProps, createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { ComponentType, useEffect, useRef, useState } from "react";

import { ShelterTabs, type ShelterTabKey } from "../components/ShelterTabs";
import { ShelterReturnContext } from "../useRefreshOnFocus";
import { ShelterAnimalsScreen } from "../screens/ShelterAnimalsScreen";
import { ShelterDashboardScreen } from "../screens/ShelterDashboardScreen";
import { ShelterDonateScreen } from "../screens/ShelterDonateScreen";
import { ShelterProfileScreen } from "../screens/ShelterProfileScreen";
import { ShelterRequestsScreen } from "../screens/ShelterRequestsScreen";
import { SHELTER_TAB_ROUTE } from "../shelterTabs";
import type { ShelterTabParamList } from "./types";

const Tab = createBottomTabNavigator<ShelterTabParamList>();

const KEY_BY_ROUTE = Object.fromEntries(
  Object.entries(SHELTER_TAB_ROUTE).map(([key, route]) => [route, key])
) as Record<keyof ShelterTabParamList, ShelterTabKey>;

/** The shared bar, driven by the navigator's state. A press emits `tabPress` first so a screen can veto it. */
function ShelterTabBar({ state, navigation }: BottomTabBarProps) {
  const active = KEY_BY_ROUTE[state.routes[state.index].name as keyof ShelterTabParamList];
  return (
    <ShelterTabs
      active={active}
      onTabPress={(key) => {
        const route = state.routes.find((r) => r.name === SHELTER_TAB_ROUTE[key]);
        if (!route) return;
        const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
        if (!event.defaultPrevented) navigation.navigate(route.name);
      }}
    />
  );
}

export function ShelterTabNavigator() {
  // Counts the times the shell came back into view after a pushed screen (applicant, placeRequest, listingForm, …)
  // covered it. `useRefreshOnFocus` treats a new count as "stale now": that is where the shelter changes things.
  const stack = useNavigation();
  const [returns, setReturns] = useState(0);
  const away = useRef(false);
  useEffect(() => {
    const offBlur = stack.addListener("blur", () => { away.current = true; });
    const offFocus = stack.addListener("focus", () => {
      if (!away.current) return;
      away.current = false;
      setReturns((n) => n + 1);
    });
    return () => { offBlur(); offFocus(); };
  }, [stack]);

  return (
    <ShelterReturnContext.Provider value={returns}>
      <Tab.Navigator
        initialRouteName="shelterDashboard"
        backBehavior="firstRoute"
        tabBar={(props) => <ShelterTabBar {...props} />}
        screenOptions={{ headerShown: false, lazy: true, freezeOnBlur: true, animation: "none" }}
      >
        {/* The roots are typed against the stack today; the switch PR moves them to composite props. */}
        <Tab.Screen name="shelterDashboard" component={ShelterDashboardScreen as ComponentType<any>} />
        <Tab.Screen name="shelterAnimals" component={ShelterAnimalsScreen as ComponentType<any>} />
        <Tab.Screen name="shelterDonate" component={ShelterDonateScreen as ComponentType<any>} />
        <Tab.Screen name="shelterRequests" component={ShelterRequestsScreen as ComponentType<any>} />
        <Tab.Screen name="shelterProfile" component={ShelterProfileScreen as ComponentType<any>} />
      </Tab.Navigator>
    </ShelterReturnContext.Provider>
  );
}
