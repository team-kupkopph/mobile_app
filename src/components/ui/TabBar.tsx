import { ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { colors, gradients } from "../../theme";
import { GlassSurface } from "../GlassSurface";

export type TabBarItem = {
  /** Identity within the bar; compared against `active`. */
  key: string;
  label: string;
  /** ⚠️ The e2e contract. Six of these are asserted by flows in `e2e/flows/` — see tabBar.test.ts. */
  testID: string;
  icon: (color: string, size: number) => ReactNode;
  onPress: () => void;
};

/**
 * The bar's own geometry, exported because two other things depend on it and must not
 * re-guess it: `spacing.tabBarClearance` (how far a ScrollView pads so content is not trapped
 * behind the bar) and `__tests__/tabBar.test.ts` (the 44 pt arithmetic).
 */
export const TAB_BAR = {
  height: 68,
  /** Distance from the bottom of the screen to the bottom of the bar. */
  inset: 16,
  /** Horizontal inset on each side — the bar is detached, not edge-to-edge. */
  gutter: 16,
  radius: 26,
  iconSize: 24
} as const;

/**
 * The one bottom tab bar. Owner, shelter and guest shells all render this.
 *
 * ⚠️ THEY USED TO RENDER THREE, each with a private colour table, and that is the whole reason
 * this component exists. The inactive icon was #C9CEC7 — 1.60:1, against WCAG 1.4.11's 3:1 for
 * non-text content that conveys meaning. It was fixed once, in one of the three files, and the
 * other two kept their own pale grey. The colours here come from the theme and nowhere else, so
 * there is no longer a copy to fix separately. See `__tests__/tabBarContrast.test.ts`, which
 * asserts on the TOKENS rather than on any bar's copy of them.
 *
 * ⚠️ Contrast is measured against the GLASS COMPOSITE, not white. The bar is translucent over
 * the mesh backdrop, whose strongest colour was deliberately placed underneath it
 * (gen-backdrop.mjs: "held BELOW y=0.90 so it sits behind the floating tab bar"). Re-derived
 * from that generator's own blob parameters, the darkest point under the bar is #889691; glass
 * at 0.72 over it composites to #DEE1E0, on which `tabInactive` is 4.94:1. That is the number
 * that matters, and it is not the 6.49:1 the icon scores on white.
 */
export function TabBar({ items, active }: { items: TabBarItem[]; active: string }) {
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <GlassSurface raise="float" radius={TAB_BAR.radius} style={styles.bar}>
        {items.map((item) => {
          const isActive = item.key === active;
          const color = isActive ? colors.teal : colors.tabInactive;
          return (
            <TouchableOpacity
              key={item.key}
              testID={item.testID}
              activeOpacity={0.75}
              style={styles.tabItem}
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              // A screen-reader user needs to know WHICH tab they are on, not just
              // which ones exist — selected state is half of what a tab bar means.
              accessibilityState={{ selected: isActive }}
              onPress={() => {
                if (isActive) return;
                item.onPress();
              }}
            >
              {/* Behind the icon AND its label, rather than a chip behind the icon alone — the
                  whole tab reads as one selected control instead of two halves that only half
                  agree. This is the shape US-CH1 brought the other two bars to. */}
              {isActive ? <LinearGradient colors={gradients.activeTab} style={styles.activePill} /> : null}
              <View style={styles.iconSlot}>{item.icon(color, TAB_BAR.iconSize)}</View>
              {/* numberOfLines guards the five-tab shelter bar on the narrowest supported
                  screen: 375 - 32 gutters = 343, and 343/5 = 68.6 pt per item. "Requests" fits,
                  but it is the longest label in the app and has the least room. */}
              <Text numberOfLines={1} style={[styles.tabText, isActive && styles.activeTabText]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: TAB_BAR.gutter,
    right: TAB_BAR.gutter,
    bottom: TAB_BAR.inset
  },
  bar: {
    // 68 rather than 84: the active pill carries the emphasis, so the bar can be shorter and
    // sit closer to the edge. Every item is `height: "100%"` of this, so the 44 pt minimum
    // target is satisfied by the bar's own height and cannot drift item by item.
    height: TAB_BAR.height,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden"
  },
  tabItem: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center"
  },
  activePill: {
    position: "absolute",
    left: 4,
    right: 4,
    top: 6,
    bottom: 6,
    borderRadius: 20
  },
  iconSlot: {
    alignItems: "center",
    justifyContent: "center"
  },
  tabText: {
    marginTop: 4,
    color: colors.tabInactive,
    fontSize: 12,
    fontWeight: "600"
  },
  activeTabText: {
    color: colors.tealDark,
    fontWeight: "800"
  }
});
