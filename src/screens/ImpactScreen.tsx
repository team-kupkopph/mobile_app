// US-B2 · My Impact: the four impact aggregates as stat tiles + the badges, grouped (V7) as the design draws them: the one
// that is nearly there, the ones held, and the rest to go for. A badge not held is never rendered as held — the Reliable-chip
// trust rule — and since V8 that is said in words (a label, and which group it sits in), not by colour alone.
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { badgeA11yLabel, badgeSections, impactTiles, Impact, progressFraction, progressLabel } from "../community";
import { BadgeShape, RootStackParamList } from "../navigation/types";
import { useLargeText } from "../useLargeText";
import { colors, elevation, maxFontScale, pill, radii, spacing, squircle, typography } from "../theme";
import { ScreenHeader } from "../components/ui";

const card = {
  backgroundColor: colors.white, ...elevation.soft
};

type Badge = BadgeShape;
type Props = NativeStackScreenProps<RootStackParamList, "impact">;

/** The medal is decoration: what a badge is, and whether it is held, is in the words beside it (V8). */
function Medal({ earned }: { earned: boolean }) {
  return (
    <View style={[styles.medal, earned ? styles.medalOn : styles.medalOff]}
          importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      {/* One glyph, dimmed when unearned — no emoji (design rule); dimming, not a lock icon, signals "not yet earned". */}
      <Text style={[styles.medalGlyph, earned ? null : styles.medalGlyphOff]} allowFontScaling={false}>★</Text>
    </View>
  );
}

export function ImpactScreen({ navigation }: Props) {
  // At Dynamic Type AX3 and up three stat tiles and a two-column badge grid cannot share a line, so they stack to one column.
  const large = useLargeText();
  const api = useApi();
  const [impact, setImpact] = useState<Impact | null>(null);
  const [badges, setBadges] = useState<Badge[] | null>(null);
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);


  const load = useCallback(() => {
    setRes(null);
    // ⚠️ was `else setBadges([])` — a failure rendered an empty badge grid, showing someone
    // none of the badges they have actually earned. And since IB26 a 200 that is not the two lists
    // is a failure too: it used to read as ready, and the screen as having no badges.
    api.get("/me/impact").then((r) => {
      const whole = r.ok && Array.isArray(r.data?.badges) && !!r.data?.impact;
      setRes({ ok: whole, status: whole || !r.ok ? r.status : 502 });
      if (whole) { setImpact(r.data.impact); setBadges(r.data.badges); }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useFocusEffect(load);

  const state = loadState(res, badges?.length);
  const sections = useMemo(() => badgeSections(badges ?? []), [badges]);
  const open = (b: Badge) => navigation.navigate("badgeComparison", { badge: b });

  return (
    <View style={styles.screen}>
      <ScreenHeader title="My impact" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {impact ? (
          <View style={[styles.statRow, large && styles.statRowLarge]}>
            {impactTiles(impact).map((t) => (
              <View key={t.label} accessible accessibilityLabel={`${t.value} ${t.label}`}
                    testID={`tile.impact.${t.label.toLowerCase()}`}
                    style={[styles.statTile, large && styles.statTileLarge]}>
                <Text style={styles.statValue} maxFontSizeMultiplier={maxFontScale.title}>{t.value}</Text>
                <Text style={styles.statLabel}>{t.label}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <Text style={styles.sectionTitle} accessibilityRole="header">Badges</Text>
        {state.kind !== "ready" ? (
          <LoadStateView
            state={state}
            emptyTitle="No badges yet"
            emptyBody="They appear here as you help."
            onRetry={load}
          />
        ) : (
          <>
            {sections.almostThere ? (
              <>
                <Text style={styles.groupTitle} accessibilityRole="header">Almost there</Text>
                <View style={styles.almostCard} testID="card.impact.almostThere">
                  <TouchableOpacity activeOpacity={0.8} style={[styles.almostTop, large && styles.almostTopLarge]}
                    testID={`tile.badge.${sections.almostThere.badge_code}`}
                    accessibilityRole="button" accessibilityLabel={badgeA11yLabel(sections.almostThere)}
                    accessibilityHint="Opens the badge"
                    onPress={() => open(sections.almostThere as Badge)}>
                    <Medal earned={false} />
                    <View style={[styles.almostCopy, large && styles.almostCopyLarge]}>
                      <Text style={styles.almostName}>{sections.almostThere.name}</Text>
                      <Text style={styles.badgeCriteria}>{sections.almostThere.criteria}</Text>
                    </View>
                  </TouchableOpacity>
                  <View style={styles.barTrack} accessibilityRole="progressbar"
                    accessibilityLabel={`${sections.almostThere.name} progress`}
                    accessibilityValue={{ min: 0, max: sections.almostThere.progress?.target ?? 0, now: Math.min(sections.almostThere.progress?.current ?? 0, sections.almostThere.progress?.target ?? 0), text: progressLabel(sections.almostThere.progress, true) }}>
                    <View style={[styles.barFill, { width: `${Math.round(progressFraction(sections.almostThere.progress) * 100)}%` }]} />
                  </View>
                  <Text style={styles.almostLabel} testID="text.impact.almostThere">
                    {progressLabel(sections.almostThere.progress, true)}
                  </Text>
                </View>
              </>
            ) : null}

            {sections.earned.length ? (
              <>
                <Text style={styles.groupTitle} accessibilityRole="header">Earned · {sections.earned.length}</Text>
                <View style={styles.grid}>
                  {sections.earned.map((b) => (
                    <TouchableOpacity key={b.badge_code} activeOpacity={0.8}
                      style={[styles.badgeTile, large && styles.badgeTileLarge]}
                      testID={`tile.badge.${b.badge_code}`}
                      accessibilityRole="button" accessibilityLabel={badgeA11yLabel(b)}
                      accessibilityHint="Opens the badge"
                      onPress={() => open(b)}>
                      <Medal earned />
                      <Text style={styles.badgeName}
                        numberOfLines={large ? undefined : 2}>{b.name}</Text>
                      <Text style={styles.badgeCriteria} numberOfLines={large ? undefined : 2}>{b.criteria}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : null}

            {sections.keepGoing.length ? (
              <>
                <Text style={styles.groupTitle} accessibilityRole="header">Keep going</Text>
                {sections.keepGoing.map((b) => (
                  <TouchableOpacity key={b.badge_code} activeOpacity={0.8}
                    style={[styles.keepRow, large && styles.keepRowLarge]}
                    testID={`tile.badge.${b.badge_code}`}
                    accessibilityRole="button" accessibilityLabel={badgeA11yLabel(b)}
                    accessibilityHint="Opens the badge"
                    onPress={() => open(b)}>
                    <Medal earned={false} />
                    <View style={[styles.keepCopy, large && styles.keepCopyLarge]}>
                      <Text style={styles.keepName}>{b.name}</Text>
                      <Text style={styles.badgeCriteria}>{b.criteria}</Text>
                      {b.progress && b.progress.current > 0 ? (
                        <Text style={styles.keepProgress}>{progressLabel(b.progress, false)}</Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 60 },
  statRow: { flexDirection: "row", gap: 10 },
  statTile: { flex: 1, paddingVertical: 16, borderRadius: radii.tile, alignItems: "center", ...card },
  // large: one tile per line. The base `flex: 1` survives in a style array and would collapse the tile in a column (`flex: 0` is what works, #189).
  statRowLarge: { flexDirection: "column" },
  statTileLarge: { flex: 0, alignSelf: "stretch", flexGrow: 0, flexBasis: "auto" },
  statValue: { color: colors.teal, ...typography.hero },
  statLabel: { marginTop: 4, color: colors.muted, ...typography.meta, fontWeight: "600" },
  sectionTitle: { marginTop: 28, marginBottom: 14, color: colors.ink, ...typography.section },
  groupTitle: { marginTop: 8, marginBottom: 12, color: colors.ink, ...typography.strong, fontWeight: "800" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  badgeTile: { width: "48%", marginBottom: 14, padding: 16, borderRadius: radii.card, alignItems: "center", ...card },
  badgeTileLarge: { width: "100%" },
  // V7 · the near-win: a soft card with the medal, what it takes, and a bar that says how far (the mockup's "Almost there").
  almostCard: { marginBottom: 20, padding: 16, borderRadius: radii.card, backgroundColor: colors.soft },
  almostTop: { flexDirection: "row", alignItems: "center" },
  almostTopLarge: { flexDirection: "column", alignItems: "flex-start" },
  almostCopy: { flex: 1, marginLeft: 14 },
  // large: the base `flex: 1` would collapse the text in a column, so the large style cancels it (#189).
  almostCopyLarge: { flex: 0, alignSelf: "stretch", flexGrow: 0, flexBasis: "auto", marginLeft: 0, marginTop: 10 },
  almostName: { color: colors.ink, ...typography.subtitle, fontWeight: "800" },
  barTrack: { marginTop: 14, height: 12, borderRadius: pill(12), backgroundColor: colors.white, overflow: "hidden" },
  barFill: { height: 12, borderRadius: pill(12), backgroundColor: colors.teal },
  almostLabel: { marginTop: 8, color: colors.tealDark, ...typography.meta, fontWeight: "800" },
  // V7 · what is left: a row each, with what it takes and how far along (when it has started).
  keepRow: { flexDirection: "row", alignItems: "center", marginBottom: 12, padding: 14, borderRadius: radii.card, ...card },
  keepRowLarge: { flexDirection: "column", alignItems: "flex-start" },
  keepCopy: { flex: 1, marginLeft: 14 },
  keepCopyLarge: { flex: 0, alignSelf: "stretch", flexGrow: 0, flexBasis: "auto", marginLeft: 0, marginTop: 10 },
  keepName: { color: colors.ink, ...typography.strong, fontWeight: "800" },
  keepProgress: { marginTop: 4, color: colors.tealDark, ...typography.meta, fontWeight: "700" },
  medal: { width: 56, height: 56, borderRadius: squircle(56), alignItems: "center", justifyContent: "center" },
  medalOn: { backgroundColor: colors.soft },
  medalOff: { backgroundColor: "#E0DFD9" },
  medalGlyph: { color: colors.teal, fontSize: 28, fontWeight: "800" },
  medalGlyphOff: { color: colors.muted, fontSize: 22 },
  badgeName: { marginTop: 12, color: colors.ink, ...typography.strong, fontWeight: "800", textAlign: "center" },
  badgeCriteria: { marginTop: 6, color: colors.muted, ...typography.meta, lineHeight: 17 }
});
