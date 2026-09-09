// Owner shell's floating tab bar. Exactly four tabs (Home · Adopt · Volunteer · You) — no Inbox.
// This is a single native-stack app (no bottom-tab navigator), so each owner-shell screen renders
// this bar itself and tab presses just `navigate()` to the corresponding stack route.
//
// ⚠️ The bar's LOOK lives in components/ui/TabBar.tsx, not here. US-CH1 collapsed three
// separately-drawn bars into one; what remains in this file is only what makes it the OWNER's
// bar — which routes each tab goes to. See TabBar's docstring for why that mattered.
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { RootStackParamList } from "../navigation/types";
import { TabBar, type TabBarItem } from "./ui";
import { AdoptIcon, HomeIcon, ProfileIcon, VolunteerIcon } from "./AppIcons";

export type OwnerTab = "home" | "adopt" | "volunteer" | "profile";

export function OwnerTabs({ active }: { active: OwnerTab }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const go = (route: keyof RootStackParamList) => () => navigation.navigate(route as never);

  const items: TabBarItem[] = [
    { key: "home", label: "Home", testID: "tab.home", icon: (c, s) => <HomeIcon color={c} size={s} />, onPress: go("home") },
    { key: "adopt", label: "Adopt", testID: "tab.adopt", icon: (c, s) => <AdoptIcon color={c} size={s} />, onPress: go("adopt") },
    {
      key: "volunteer",
      label: "Volunteer",
      testID: "tab.volunteer",
      icon: (c, s) => <VolunteerIcon color={c} size={s} />,
      // The Volunteer tab opens the Kawang-Gawa hub (US-V8) rather than the old "volunteer"
      // placeholder route, which stays registered but unreachable from here.
      onPress: go("kawanggawa")
    },
    { key: "profile", label: "You", testID: "tab.profile", icon: (c, s) => <ProfileIcon color={c} size={s} />, onPress: go("profile") }
  ];

  return <TabBar items={items} active={active} />;
}
