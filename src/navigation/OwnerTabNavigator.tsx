// SQ5 follow-up (spec 2026-11-04-owner-guest-tab-navigator-design.md) · the personal member's shell as ONE bottom-tab
// navigator: the `ownerTabs` route of the root stack. The four tabs keep their old route names (`home`, `adopt`,
// `kawanggawa`, `profile`), so the `screen.*` ids and the screens' files do not move.
//
// The screens draw no bar of their own: this navigator renders the one <OwnerTabs>, so a load-failure branch has its exit by
// construction. Inbound paths reach it through `enterOwnerShell` / `openOwnerTab` / `popToOwnerTab`. The bar is the shared
// TabBar, which is `position: absolute`, so the navigator adds no bottom inset (shelter spec §7a/§7b).
import { BottomTabBarProps, createBottomTabNavigator } from "@react-navigation/bottom-tabs";

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
        <Tab.Screen name="home" component={HomeScreen} />
        <Tab.Screen name="adopt" component={AdoptScreen} />
        <Tab.Screen name="kawanggawa" component={KawangGawaScreen} />
        <Tab.Screen name="profile" component={ProfileScreen} />
      </Tab.Navigator>
    </ShelterReturnContext.Provider>
  );
}
