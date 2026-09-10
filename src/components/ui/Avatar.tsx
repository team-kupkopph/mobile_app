import { ReactNode } from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { colors, gradients, squircle, typography } from "../../theme";

type AvatarProps = {
  /** Two letters are taken from this. Also picks the tile — see `tinted`. */
  initials?: string;
  /** An icon instead of letters, for a pet or an org without a usable name. */
  children?: ReactNode;
  /**
   * Give this avatar one of the canvas's four gradient tiles instead of the flat soft fill.
   * The canvas uses tinted tiles for ORGANISATIONS and the flat fill for people.
   */
  tinted?: boolean;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Squircle avatar — the canvas's "Avatars · squircle" panel.
 *
 * ⚠️ SQUIRCLE, NOT CIRCLE, and the design system calls this out by name: the rounded square is
 * "a deliberate V2 replacement for the old circular avatar". 52 pt at radius 17 is exactly
 * `squircle(52)` (0.32 × size), so the radius scales with the avatar instead of being a magic
 * number per call site.
 *
 * ⚠️ THE TILE IS IDENTITY. `tinted` picks one of four gradient pairs by hashing the name, so a
 * shelter keeps its colour everywhere it appears. Picking by list index would re-colour every
 * organisation the moment a list is sorted differently, which makes the colour a lie.
 */
export function Avatar({ initials, children, tinted, size = 52, style }: AvatarProps) {
  const letters = (initials ?? "").trim().slice(0, 2).toUpperCase();
  const shape = { width: size, height: size, borderRadius: squircle(size) };
  const face = children ?? (
    <Text style={[styles.initials, { fontSize: Math.round(size * 0.33) }]}>{letters}</Text>
  );

  if (!tinted) {
    return <View style={[styles.base, shape, style]}>{face}</View>;
  }

  const pick = gradients.avatarTiles[hash(initials ?? "") % gradients.avatarTiles.length];
  return (
    <LinearGradient
      colors={pick.tile}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 0.85, y: 1 }}
      style={[styles.base, shape, style]}
    >
      {children ?? (
        <Text style={[styles.initials, { color: pick.ink, fontSize: Math.round(size * 0.33) }]}>
          {letters}
        </Text>
      )}
    </LinearGradient>
  );
}

/** Small, stable, and not trying to be a good hash — only to be the SAME one every time. */
function hash(value: string): number {
  let n = 0;
  for (let i = 0; i < value.length; i++) n = (n * 31 + value.charCodeAt(i)) >>> 0;
  return n;
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: colors.soft
  },
  initials: {
    ...typography.label,
    letterSpacing: 0,
    color: colors.teal,
    fontWeight: "800"
  }
});
