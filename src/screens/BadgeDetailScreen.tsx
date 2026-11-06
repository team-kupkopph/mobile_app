// US-B2 · a single badge's detail. Shows the badge large with its criteria and either when it was earned or how far
// along it is — never claiming an unearned badge is earned.
// V9 · it was named BadgeComparison after the `screen-badge-comparison` artboard, which is a different thing: a board
// comparing the three TRUST badges (Verified Member, Rescue, Shelter). This is an achievement's detail, and has no
// artboard of its own yet.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { BadgeMedal } from "../components/BadgeMedal";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { earnedDate, progressLabel } from "../community";
import { RootStackParamList } from "../navigation/types";
import { colors, maxFontScale, pill, spacing, typography } from "../theme";
import { Card, Chip, ScreenHeader } from "../components/ui";

type Props = NativeStackScreenProps<RootStackParamList, "badgeDetail">;

export function BadgeDetailScreen({ navigation, route }: Props) {
  const { badge } = route.params;
  const when = earnedDate(badge.earned_at);
  return (
    <View style={styles.screen}>
      <ScreenBackdrop />
      <ScreenHeader title="Badge" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BadgeMedal earned={badge.earned} size="large" icon={badge.icon} />
        <Text style={[styles.name, badge.earned ? null : styles.dimText]} accessibilityRole="header"
              maxFontSizeMultiplier={maxFontScale.title}>{badge.name}</Text>
        {badge.description ? <Text style={styles.description}>{badge.description}</Text> : null}

        <Card style={styles.criteriaCard}>
          <Text style={styles.criteriaLabel}>How to earn it</Text>
          <Text style={styles.criteriaText}>{badge.criteria}</Text>
        </Card>

        {badge.earned ? (
          <Chip tone="success" dot={false} style={styles.earnedChip} testID="text.badge.status" label={`Earned${when ? ` · ${when}` : ""}`} />
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
  name: { marginTop: 20, color: colors.ink, ...typography.hero, textAlign: "center" },
  dimText: { color: colors.muted },
  description: { marginTop: 10, color: colors.muted, ...typography.body, textAlign: "center" },
  criteriaCard: { marginTop: 24, alignSelf: "stretch", padding: 18 },
  criteriaLabel: { color: colors.muted, ...typography.meta, fontWeight: "600", letterSpacing: 0.4 },
  criteriaText: { marginTop: 6, color: colors.ink, ...typography.subtitle, fontWeight: "600" },
  earnedChip: { marginTop: 22, alignSelf: "center" },
  lockedText: { marginTop: 22, color: colors.muted, ...typography.strong, fontWeight: "700" },
  progressText: { marginTop: 6, color: colors.tealDark, ...typography.meta, fontWeight: "700" }
});
