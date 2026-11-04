// Owner shell's floating tab bar. Exactly four tabs (Home · Adopt · Volunteer · You) — no Inbox.
// Since SQ5 (follow-up) it is drawn ONCE, by `OwnerTabNavigator`; before that each owner-shell screen rendered it itself.
//
// ⚠️ The bar's LOOK lives in components/ui/TabBar.tsx, not here. US-CH1 collapsed three
// separately-drawn bars into one; what remains in this file is only what makes it the OWNER's
// bar — which routes each tab goes to. See TabBar's docstring for why that mattered.

import { TabBar, type TabBarItem } from "./ui";
import { AdoptIcon, HomeIcon, ProfileIcon, VolunteerIcon } from "./AppIcons";

export type OwnerTab = "home" | "adopt" | "volunteer" | "profile";

// SQ5 follow-up · the personal member's shell is a tab navigator (`OwnerTabNavigator`), which draws this bar once and decides
// what a press does; the bar only reports the key. No screen renders it.
export function OwnerTabs({ active, onTabPress }: { active: OwnerTab; onTabPress: (tab: OwnerTab) => void }) {
  const go = (key: OwnerTab) => () => onTabPress(key);

  const items: TabBarItem[] = [
    { key: "home", label: "Home", testID: "tab.home", icon: (c, s) => <HomeIcon color={c} size={s} />, onPress: go("home") },
    { key: "adopt", label: "Adopt", testID: "tab.adopt", icon: (c, s) => <AdoptIcon color={c} size={s} />, onPress: go("adopt") },
    {
      key: "volunteer",
      label: "Volunteer",
      testID: "tab.volunteer",
      icon: (c, s) => <VolunteerIcon color={c} size={s} />,
      // The Volunteer tab opens the Kawang-Gawa hub (US-V8), the `kawanggawa` tab.
      onPress: go("volunteer")
    },
    { key: "profile", label: "You", testID: "tab.profile", icon: (c, s) => <ProfileIcon color={c} size={s} />, onPress: go("profile") }
  ];

  return <TabBar items={items} active={active} />;
}
