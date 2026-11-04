// SQ5 follow-up (spec 2026-11-04-owner-guest-tab-navigator-design.md) · the personal member's shell as ONE bottom-tab
// navigator: the `ownerTabs` route of the root stack. The four tabs keep their old route names (`home`, `adopt`,
// `kawanggawa`, `profile`), so the `screen.*` ids and the screens' files do not move.
//
// PR 1 registers this and nothing navigates to it yet: the screens still draw their own <OwnerTabs> as stack routes. The switch
// PR points `enterOwnerShell` / `openOwnerTab` here and deletes the five hand-mounted bars. The bar is the shared TabBar, which
// is `position: absolute`, so the navigator adds no bottom inset (shelter spec §7a/§7b).
import { BottomTabBarProps, createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ComponentType } from "react";

import { OwnerTabs, type OwnerTab } from "../components/OwnerTabs";
import { OWNER_TAB_ROUTE, ownerTabKeyForRoute } from "../appTabs";
import { AdoptScreen } from "../screens/AdoptScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { KawangGawaScreen } from "../screens/KawangGawaScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { ShelterReturnContext } from "../useRefreshOnFocus";
import { useShellReturns } from "../useShellReturns";
import type { OwnerTabParamList } from "./types";

const Tab = createBottomTabNavigator<OwnerTabParamList>();

/** The shared bar, driven by the navigator's state. A press emits `tabPress` first so a screen can veto it. */
function OwnerTabBar({ state, navigation }: BottomTabBarProps) {
  const active = ownerTabKeyForRoute(state.routes[state.index].name) ?? "home";
  return (
    <OwnerTabs
      active={active}
      onTabPress={(key: OwnerTab) => {
        const route = state.routes.find((r) => r.name === OWNER_TAB_ROUTE[key]);
        if (!route) return;
        const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
        if (!event.defaultPrevented) navigation.navigate(route.name);
      }}
    />
  );
}

export function OwnerTabNavigator() {
  const returns = useShellReturns();
  return (
    <ShelterReturnContext.Provider value={returns}>
      <Tab.Navigator
        initialRouteName="home"
        backBehavior="firstRoute"
        tabBar={(props) => <OwnerTabBar {...props} />}
        screenOptions={{ headerShown: false, lazy: true, freezeOnBlur: true, animation: "none" }}
      >
        {/* The roots are typed against the stack today; the switch PR moves them to composite props. */}
        <Tab.Screen name="home" component={HomeScreen as ComponentType<any>} />
        <Tab.Screen name="adopt" component={AdoptScreen as ComponentType<any>} />
        <Tab.Screen name="kawanggawa" component={KawangGawaScreen as ComponentType<any>} />
        <Tab.Screen name="profile" component={ProfileScreen as ComponentType<any>} />
      </Tab.Navigator>
    </ShelterReturnContext.Provider>
  );
}
