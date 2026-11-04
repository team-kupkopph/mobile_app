// A guest-only tab bar (not OwnerTabs): OwnerTabs navigates straight to the real Adopt/Volunteer/
// profile routes, which is exactly what a guest must not do for Adopt and You — those tabs open
// the SignupWall instead. Only the DESTINATIONS differ; the look comes from the shared TabBar.
//
// ⚠️ Extracted from HomeGuestScreen.tsx (Task 9, G13). It used to live there as a private
// function with `active="home"` hardcoded, because Home was the only guest screen with a tab
// bar. G13 gave guests a second one — the Kawang-Gawa hub, browsable read-only — so the bar
// needed an `active` prop and its Volunteer tab needed to NAVIGATE rather than gate: guests may
// browse shifts now, so `tab.guest.volunteer` opens the hub directly and only Request (inside
// the hub/detail) still raises the wall.
//
// ⚠️ US-CH1 converted this bar. It was an opaque white 84 pt panel whose active state was a tinted
// chip behind the ICON ALONE, leaving the label outside the selection — the V2 shape. It now uses
// the same 68 pt glass bar as the other two shells, with the pill behind icon and label together.
// It also carried its own private colour table (GUEST_TAB_COLORS); the colours now come from the
// theme, which is the point of the exercise — this is the bar a signed-out visitor actually lands
// on, and it is the one that kept its 1.60:1 inactive icon the last time only the owner bar
// was fixed.

import { TabBar, type TabBarItem } from "./ui";
import { AdoptIcon, HomeIcon, ProfileIcon, VolunteerIcon } from "./AppIcons";

export type GuestTab = "home" | "adopt" | "volunteer" | "profile";

// SQ5 follow-up · the guest shell is a tab navigator (`GuestTabNavigator`), which draws this bar once and decides what a press
// does (a real tab, or the sign-up wall for Adopt and You); the bar only reports the key. No screen renders it.
type GuestTabsProps = { active: GuestTab; onTabPress: (tab: GuestTab) => void };

export function GuestTabs({ active, onTabPress }: GuestTabsProps) {
  const items: TabBarItem[] = [
    // TabBar itself swallows a press on the already-active tab, so this only fires when Home
    // isn't the current screen (i.e. from the volunteer hub).
    { key: "home", label: "Home", testID: "tab.guest.home", icon: (c, s) => <HomeIcon color={c} size={s} />, onPress: () => onTabPress("home") },
    { key: "adopt", label: "Adopt", testID: "tab.guest.adopt", icon: (c, s) => <AdoptIcon color={c} size={s} />, onPress: () => onTabPress("adopt") },
    // G13: browsing is allowed, so this tab now opens the hub instead of the wall.
    { key: "volunteer", label: "Volunteer", testID: "tab.guest.volunteer", icon: (c, s) => <VolunteerIcon color={c} size={s} />, onPress: () => onTabPress("volunteer") },
    { key: "profile", label: "You", testID: "tab.guest.profile", icon: (c, s) => <ProfileIcon color={c} size={s} />, onPress: () => onTabPress("profile") },
  ];

  return <TabBar items={items} active={active} />;
}
