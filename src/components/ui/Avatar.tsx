import { ReactNode } from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

import { colors, squircle, typography } from "../../theme";

type AvatarProps = {
  /** Two letters. Ignored when `children` is given. */
  initials?: string;
  /** An icon, for a pet or an organisation without initials. */
  children?: ReactNode;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * A squircle, not a circle — the V3 replacement for the old circular avatar, used everywhere a
 * person or organisation appears.
 *
 * ⚠️ Its radius comes from `squircle(size)` = 0.32 × size, not from a fixed token. A 40 pt tile
 * and a 74 pt tile are not the same shape at one radius, and this is the rule the design source
 * already uses.
 */
export function Avatar({ initials, children, size = 52, style }: AvatarProps) {
  return (
    <View
      style={[
        styles.base,
        { width: size, height: size, borderRadius: squircle(size) },
        style
      ]}
    >
      {children ?? (
        <Text style={[styles.initials, { fontSize: Math.round(size * 0.33) }]}>
          {(initials ?? "").slice(0, 2).toUpperCase()}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.soft,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  initials: { ...typography.title, color: colors.teal }
});
