// IB11 / IQ4 · the badges a person has earned, on their Profile (the mockup: "Earned by helping — shown on your profile").
// Earned only and no counts: a badge is something held, and a number beside it would invite comparing. Nothing is drawn for
// someone with none, or when the fetch failed: a hollow strip would say "you have nothing" on a request that never arrived.
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { BadgeShape } from "../navigation/types";
import { colors, elevation, radii, typography } from "../theme";
import { useLargeText } from "../useLargeText";

export function ProfileBadges({ badges, onPress }: { badges: BadgeShape[]; onPress: () => void }) {
  const large = useLargeText();
  const held = badges.filter((b) => b.earned);
  if (!held.length) return null;
  return (
    <TouchableOpacity activeOpacity={0.8} style={styles.card} onPress={onPress} testID="row.profile.badges"
      accessibilityRole="button" accessibilityLabel={`Badges: ${held.map((b) => b.name).join(", ")}`}
      accessibilityHint="Opens My impact">
      <View style={[styles.head, large && styles.headLarge]}>
        <Text style={styles.title}>Badges</Text>
        {/* Words, not a "›": the type ramp counts glyphs drawn as text and lets the number fall, never rise. */}
        <Text style={styles.link}>My impact</Text>
      </View>
      <View style={[styles.chips, large && styles.chipsLarge]}>
        {held.map((b) => (
          <View key={b.badge_code} style={styles.chip} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            <Text style={styles.chipText}>{b.name}</Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 18, padding: 16, borderRadius: radii.card, backgroundColor: colors.white, ...elevation.soft },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  // large: stacked. Side by side, "My impact" ran off the right edge at AX5 (walked on the simulator), and `space-between`
  // gives a wrapped title no room to give back.
  headLarge: { flexDirection: "column", alignItems: "flex-start", gap: 4 },
  title: { color: colors.ink, ...typography.strong, fontWeight: "800" },
  link: { color: colors.teal, ...typography.meta, fontWeight: "700" },
  chips: { flexDirection: "row", flexWrap: "wrap", marginTop: 12, gap: 8 },
  // large: one badge per line, so a long name is not cut off beside another.
  chipsLarge: { flexDirection: "column", alignItems: "flex-start" },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: radii.tile, backgroundColor: colors.soft },
  chipText: { color: colors.tealDark, ...typography.meta, fontWeight: "800" }
});
