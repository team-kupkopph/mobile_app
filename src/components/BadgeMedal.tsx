// IB8 · the one drawing of a badge's medal: a ★ in a tinted squircle, and, when the badge is not held, a lock on its corner (V6, IQ8)
// so "not earned" is a shape as well as a shade. Decoration: what a badge is, and whether it is held, is in the words beside it (V8).
import { StyleSheet, Text, View } from "react-native";

import { colors, squircle } from "../theme";
import { LockIcon } from "./AppIcons";

/** `small` is the tile and row medal (Impact); `large` is the badge detail's. */
const SIZES = {
  small: { box: 56, dot: 22, dotOffset: -4, lock: 12 },
  large: { box: 108, dot: 36, dotOffset: -6, lock: 18 }
} as const;

export function BadgeMedal({ earned, size }: { earned: boolean; size: keyof typeof SIZES }) {
  const s = SIZES[size];
  return (
    <View style={[styles.medal, { width: s.box, height: s.box, borderRadius: squircle(s.box) }, earned ? styles.on : styles.off]}
          importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      {/* One glyph, dimmed when unearned: no emoji (design rule). */}
      <Text style={[styles.glyph, size === "small" ? (earned ? styles.glyphSmall : styles.glyphSmallOff) : styles.glyphLarge,
        earned ? null : styles.glyphOff]} allowFontScaling={false}>★</Text>
      {earned ? null : (
        <View style={[styles.dot, { width: s.dot, height: s.dot, borderRadius: s.dot / 2, right: s.dotOffset, bottom: s.dotOffset }]}>
          <LockIcon color={colors.muted} size={s.lock} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  medal: { alignItems: "center", justifyContent: "center" },
  on: { backgroundColor: colors.soft },
  off: { backgroundColor: colors.greyPill },
  glyph: { color: colors.teal, fontWeight: "800" },
  // Whole-number sizes in the style sheet, not computed, so the type-ramp guard still sees and counts them as glyphs.
  glyphSmall: { fontSize: 28 },
  glyphSmallOff: { fontSize: 22 },
  glyphLarge: { fontSize: 54 },
  glyphOff: { color: colors.muted },
  dot: { position: "absolute", backgroundColor: colors.white, alignItems: "center", justifyContent: "center" }
});
