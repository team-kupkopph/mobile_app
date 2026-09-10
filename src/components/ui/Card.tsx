import { ReactNode } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { colors, elevation, radii, spacing } from "../../theme";

type CardProps = {
  children: ReactNode;
  /** "hero" is the tallest, most prominent card on a screen — slightly rounder. */
  tone?: "default" | "hero";
  /** A left accent bar carrying a status colour. Reads state before a word is read. */
  accent?: string;
  style?: StyleProp<ViewStyle>;
};

export function Card({ children, tone = "default", accent, style }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        tone === "hero" && styles.hero,
        accent ? { borderLeftWidth: 4, borderLeftColor: accent } : null,
        style
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    padding: spacing.md,
    // No border. A V3 card is separated from the page by depth, not by a stroke — a card
    // that has both reads as a V1 card with a shadow bolted on.
    ...elevation.card
  },
  hero: { borderRadius: radii.hero }
});
