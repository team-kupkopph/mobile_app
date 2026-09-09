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
 * expo-blur, a native module this app does not depend on. What sells the effect instead is a
 * structured backdrop (ScreenBackground), a translucent fill, and a bright 1px edge.
 *
 * ⚠️ US-CH3 decided (2026-09-09) NOT to adopt expo-blur, and corrected two claims this comment
 * used to make. It named a "scroll-fade that stops sharp card text reaching the panel" — no such
 * fade exists anywhere in src/; the V2 language specifies one and the V3 pass never built it, so
 * sharp text does pass under the floating bar mid-scroll. It also claimed to be "the single
 * component that changes" if blur were added: this component has exactly ONE consumer
 * (OwnerTabs), while translucency is hand-rolled at 8+ other sites. Neither claim survived
 * measurement. See dev/HANDOFF.md, US-CH3, in the library repo.
 *
 * The blur decision itself was settled by expo-blur's own description: it renders a native blur
 * on iOS and falls back to a semi-transparent view on Android — i.e. on the majority platform it
 * degrades to precisely what this component already draws.
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
