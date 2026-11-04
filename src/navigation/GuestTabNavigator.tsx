// SQ5 follow-up (spec 2026-11-04-owner-guest-tab-navigator-design.md §4.2) · the signed-out visitor's shell as a bottom-tab
// navigator: the `guestTabs` route of the root stack. TWO real tabs (`homeGuest`, `kawanggawa`) under a FOUR-item bar:
// Adopt and You are bar-only, they open the sign-up wall and never navigate, exactly as `GuestTabs` does today. The pill's
// index is the item's place among the four, not the route's, and the bar already works that way (it takes the item key).
//
// The wall is hosted HERE for the bar's two gated items; a screen keeps
// its own wall for its in-screen gated actions (Request, a stray row, ...). The shell is chosen when it is ENTERED (a reset),
// never swapped under a mounted navigator while tokens change (spec §4.1).
import { BottomTabBarProps, createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";

import { GuestTabs, type GuestTab } from "../components/GuestTabs";
import { SignupWall, SignupWallAction } from "../components/SignupWall";
import { guestPressAction, guestTabKeyForRoute } from "../appTabs";
import { setIntent } from "../guestIntent";
import { HomeGuestScreen } from "../screens/HomeGuestScreen";
import { KawangGawaScreen } from "../screens/KawangGawaScreen";
import { ShelterReturnContext } from "../useRefreshOnFocus";
import { useShellReturns } from "../useShellReturns";
import type { GuestTabParamList, RootStackParamList } from "./types";

const Tab = createBottomTabNavigator<GuestTabParamList>();

function GuestTabBar({ state, navigation, onGated }: BottomTabBarProps & { onGated: (action: SignupWallAction) => void }) {
  const active: GuestTab = guestTabKeyForRoute(state.routes[state.index].name) ?? "home";
  return (
    <GuestTabs
      active={active}
      onTabPress={(key) => {
        const press = guestPressAction(key);
        if (press.kind === "wall") return onGated(press.action);
        const route = state.routes.find((r) => r.name === press.route);
        if (!route) return;
        const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
        if (!event.defaultPrevented) navigation.navigate(route.name);
      }}
    />
  );
}

export function GuestTabNavigator() {
  const stack = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const returns = useShellReturns();
  const [wall, setWall] = useState<SignupWallAction | null>(null);

  return (
    <ShelterReturnContext.Provider value={returns}>
      <Tab.Navigator
        initialRouteName="homeGuest"
        backBehavior="firstRoute"
        tabBar={(props) => <GuestTabBar {...props} onGated={setWall} />}
        screenOptions={{ headerShown: false, lazy: true, freezeOnBlur: true, animation: "none" }}
      >
        <Tab.Screen name="homeGuest" component={HomeGuestScreen} />
        <Tab.Screen name="kawanggawa" component={KawangGawaScreen} />
      </Tab.Navigator>
      <SignupWall
        visible={!!wall}
        action={wall ?? "account"}
        onCreateAccount={() => { if (wall) setIntent(wall); setWall(null); stack.navigate("accountType"); }}
        onLogin={() => { setWall(null); stack.navigate("signin"); }}
        onDismiss={() => setWall(null)}
      />
    </ShelterReturnContext.Provider>
  );
}
