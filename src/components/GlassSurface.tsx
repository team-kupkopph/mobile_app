import { ReactNode } from "react";
import { StyleProp, View, ViewStyle } from "react-native";

import { colors, elevation, radii } from "../theme";

type GlassSurfaceProps = {
  children?: ReactNode;
  /** "light" sits on the page ground; "dark" sits on a hero/deep surface. */
  tone?: "light" | "dark";
  raise?: keyof typeof elevation;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Translucent chrome — the tab bar, round icon buttons, sticky headers.
 *
 * NOT a real frosted blur: React Native has no backdrop-filter, and the only route to one is
 * expo-blur, a native module this app does not depend on. What sells the effect instead is the
 * combination the design was built around — a structured backdrop (ScreenBackground), a
 * translucent fill, a bright 1px edge, and the scroll-fade that stops sharp card text reaching
 * the panel. If expo-blur is ever added, this is the single component that changes.
 */
export function GlassSurface({ children, tone = "light", raise = "soft", radius = radii.card, style }: GlassSurfaceProps) {
  const dark = tone === "dark";
  return (
    <View
      style={[
        {
          backgroundColor: dark ? colors.glassOnDark : colors.glass,
          borderWidth: 1,
          borderColor: dark ? colors.glassOnDarkBorder : colors.glassBorder,
          borderRadius: radius
        },
        elevation[raise],
        style
      ]}
    >
      {children}
    </View>
  );
}
