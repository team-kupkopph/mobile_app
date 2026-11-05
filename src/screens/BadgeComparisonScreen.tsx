// US-B2 · a single badge's detail (screen-badge-comparison). Shows the badge large with its
// criteria and either when it was earned or that it's still locked — never claiming an unearned
// badge is earned.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { earnedDate, progressLabel } from "../community";
import { RootStackParamList } from "../navigation/types";
import { colors, elevation, maxFontScale, pill, radii, spacing, squircle, typography } from "../theme";
import { ScreenHeader } from "../components/ui";

const card = {
  backgroundColor: colors.white, ...elevation.soft
};

type Props = NativeStackScreenProps<RootStackParamList, "badgeComparison">;

export function BadgeComparisonScreen({ navigation, route }: Props) {
  const { badge } = route.params;
  const when = earnedDate(badge.earned_at);
  return (
    <View style={styles.screen}>
      <ScreenHeader title="Badge" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Decoration: whether it is held is said in words below (V8). */}
        <View style={[styles.medal, badge.earned ? styles.medalOn : styles.medalOff]}
              importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <Text style={[styles.medalGlyph, badge.earned ? null : styles.medalGlyphOff]} allowFontScaling={false}>★</Text>
        </View>
        <Text style={[styles.name, badge.earned ? null : styles.dimText]} accessibilityRole="header"
              maxFontSizeMultiplier={maxFontScale.title}>{badge.name}</Text>
        {badge.description ? <Text style={styles.description}>{badge.description}</Text> : null}

        <View style={styles.criteriaCard}>
          <Text style={styles.criteriaLabel}>How to earn it</Text>
          <Text style={styles.criteriaText}>{badge.criteria}</Text>
        </View>

        {badge.earned ? (
          <View style={styles.earnedPill}>
            <Text style={styles.earnedText} testID="text.badge.status">
              Earned{when ? ` · ${when}` : ""}
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.lockedText} testID="text.badge.status">Not earned yet — keep helping!</Text>
            {badge.progress ? (
              <Text style={styles.progressText} testID="text.badge.progress">{progressLabel(badge.progress, false)}</Text>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 24, paddingBottom: 60, alignItems: "center" },
  medal: { width: 108, height: 108, borderRadius: squircle(108), alignItems: "center", justifyContent: "center" },
  medalOn: { backgroundColor: colors.soft },
  medalOff: { backgroundColor: colors.greyPill },
  medalGlyph: { color: colors.teal, fontSize: 54, fontWeight: "800" },
  medalGlyphOff: { color: colors.muted },
  name: { marginTop: 20, color: colors.ink, ...typography.hero, textAlign: "center" },
  dimText: { color: colors.muted },
  description: { marginTop: 10, color: colors.muted, ...typography.body, textAlign: "center" },
  criteriaCard: { marginTop: 24, alignSelf: "stretch", padding: 18, borderRadius: radii.card, ...card },
  criteriaLabel: { color: colors.muted, ...typography.meta, fontWeight: "600", letterSpacing: 0.4 },
  criteriaText: { marginTop: 6, color: colors.ink, ...typography.subtitle, fontWeight: "600" },
  earnedPill: { marginTop: 22, minHeight: 38, paddingVertical: 8, paddingHorizontal: 18, justifyContent: "center", borderRadius: pill(38), backgroundColor: colors.successBg },
  earnedText: { color: colors.success, ...typography.strong, fontWeight: "700" },
  lockedText: { marginTop: 22, color: colors.muted, ...typography.strong, fontWeight: "700" },
  progressText: { marginTop: 6, color: colors.tealDark, ...typography.meta, fontWeight: "700" }
});
