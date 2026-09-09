// Shelter shell's floating tab bar. FIVE tabs (Home · Animals · Donate · Requests · You).
//
// ⚠️ US-CH1 converted this bar. It used to be a different thing entirely: an OPAQUE #F7F7F4
// strip, edge-to-edge at `bottom: 0` with a hairline top border — the V1 language, not V3. Two
// concrete defects came with that shape, and both are gone because the shared TabBar owns the
// geometry now:
//   1. Its tab items had no height. They sized to their content — a 28 pt icon slot plus a 9 pt
//      label — which measured about 41 pt against the 44 pt minimum target. Items are now
//      `height: "100%"` of a 68 pt bar.
//   2. Sitting at `bottom: 0`, its labels and icons rendered inside the home-indicator zone.
//      The bar now floats 16 pt clear of the bottom edge, like the owner's.
//
// ⚠️ FIVE tabs, not four — the arithmetic was re-checked rather than copied from the owner bar.
// On the narrowest screen this app supports (375 pt), 375 - 32 gutters = 343, and 343 / 5 =
// 68.6 pt per item. That clears 44 pt on both axes. `__tests__/tabBar.test.ts` asserts it.
import { Image, ImageSourcePropType, StyleSheet, Text } from "react-native";

import { HomeIcon, MailIcon, ProfileIcon } from "./AppIcons";
import { TabBar, type TabBarItem } from "./ui";

const paw = require("../../assets/paw-white.png") as ImageSourcePropType;

export type ShelterTabKey = "home" | "animals" | "donate" | "requests" | "profile";

type ShelterTabsProps = {
  active: ShelterTabKey;
  onTabPress?: (tab: ShelterTabKey) => void;
};

export function ShelterTabs({ active, onTabPress }: ShelterTabsProps) {
  const press = (key: ShelterTabKey) => () => onTabPress?.(key);

  const items: TabBarItem[] = [
    { key: "home", label: "Home", testID: "tab.shelter.home", icon: (c, s) => <HomeIcon color={c} size={s} />, onPress: press("home") },
    {
      key: "animals",
      label: "Animals",
      testID: "tab.shelter.animals",
      icon: (c, s) => <Image source={paw} resizeMode="contain" style={[styles.pawIcon, { width: s - 2, height: s - 2, tintColor: c }]} />,
      onPress: press("animals")
    },
    { key: "donate", label: "Donate", testID: "tab.shelter.donate", icon: (c) => <Text style={[styles.symbolIcon, { color: c }]}>₱</Text>, onPress: press("donate") },
    { key: "requests", label: "Requests", testID: "tab.shelter.requests", icon: (c, s) => <MailIcon color={c} size={s} />, onPress: press("requests") },
    { key: "profile", label: "You", testID: "tab.shelter.profile", icon: (c, s) => <ProfileIcon color={c} size={s} />, onPress: press("profile") }
  ];

  return <TabBar items={items} active={active} />;
}

const styles = StyleSheet.create({
  pawIcon: {
    transform: [{ translateY: -1 }]
  },
  // ⚠️ ONE glyph is still a typographic character rather than a drawing: the peso sign. That is
  // deliberate — measured on device it renders at exactly #5F5E5A, the same token as every drawn
  // icon in the bar, because iOS resolves "₱" through the normal text font. The envelope did NOT
  // (see MailIcon), which is why that one was converted and this one was not.
  symbolIcon: {
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 24
  }
});
