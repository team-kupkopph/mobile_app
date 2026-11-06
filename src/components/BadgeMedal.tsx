// IB8 · the one drawing of a badge's medal: its own glyph (V5) in a tinted squircle, and, when the badge is not held, a lock on its corner (V6, IQ8)
// so "not earned" is a shape as well as a shade. Decoration: what a badge is, and whether it is held, is in the words beside it (V8).
import { Image, StyleSheet, View } from "react-native";

import { badgeGlyph } from "../badgeGlyphs";

import { colors, squircle } from "../theme";
import { LockIcon } from "./AppIcons";

/** `small` is the tile and row medal (Impact); `large` is the badge detail's. */
const SIZES = {
  small: { box: 56, dot: 22, dotOffset: -4, lock: 12, glyph: 30, glyphOff: 24 },
  large: { box: 108, dot: 36, dotOffset: -6, lock: 18, glyph: 58, glyphOff: 58 }
} as const;

export function BadgeMedal({ earned, size, icon }: { earned: boolean; size: keyof typeof SIZES; icon?: string }) {
  const s = SIZES[size];
  return (
    <View style={[styles.medal, { width: s.box, height: s.box, borderRadius: squircle(s.box) }, earned ? styles.on : styles.off]}
          importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      {/* The badge's own glyph, dimmed when unearned: no emoji (design rule). */}
      <Image source={badgeGlyph(icon)} resizeMode="contain" tintColor={earned ? colors.teal : colors.muted}
        style={{ width: earned ? s.glyph : s.glyphOff, height: earned ? s.glyph : s.glyphOff }} />
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
  dot: { position: "absolute", backgroundColor: colors.white, alignItems: "center", justifyContent: "center" }
});
