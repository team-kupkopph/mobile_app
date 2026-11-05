// US-B2 · My Impact: the four impact aggregates as stat tiles + the badges, grouped (V7) as the design draws them: the one
// that is nearly there, the ones held, and the rest to go for. A badge not held is never rendered as held — the Reliable-chip
// trust rule — and since V8 that is said in words (a label, and which group it sits in), not by colour alone; since V6/IQ8 an
// unearned medal also carries a lock (BadgeMedal). V3 (Impact review step 10): on the backdrop, every surface a <Card>.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { BadgeMedal } from "../components/BadgeMedal";
import { LoadStateView } from "../components/LoadStateView";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { StaleBanner } from "../components/StaleBanner";
import { isOffline, loadState } from "../net";
import {
  applyImpactReply, badgeA11yLabel, badgeSections, BadgeShape, beginImpactLoad, impactIsStale, ImpactView, impactTiles, parseImpact,
  progressFraction, progressLabel
} from "../community";
import { createLatestOnly } from "../latestOnly";
import { RootStackParamList } from "../navigation/types";
import { useLargeText } from "../useLargeText";
import { useRefreshOnFocus } from "../useRefreshOnFocus";
import { colors, maxFontScale, pill, radii, spacing, typography } from "../theme";
import { Card, ScreenHeader } from "../components/ui";

type Badge = BadgeShape;
type Props = NativeStackScreenProps<RootStackParamList, "impact">;

export function ImpactScreen({ navigation }: Props) {
  // At Dynamic Type AX3 and up four stat tiles and a two-column badge grid cannot share a line, so they stack to one column.
  const large = useLargeText();
  const api = useApi();
  // IB6 · the whole state is the last GOOD answer plus the latest result, changed only by beginImpactLoad and applyImpactReply.
  const [view, setView] = useState<ImpactView>({ data: null, res: null });
  const [latest] = useState(createLatestOnly);

  const load = useCallback(() => {
    // Only the newest answer lands: a slow older one must not overwrite it.
    const only = latest.begin();
    // A screen that holds data keeps it while it refreshes (no spinner on a return from a badge); one with nothing shows loading.
    setView(beginImpactLoad);
    // ⚠️ was `else setBadges([])` — a failure rendered an empty badge grid, showing someone none of the badges they have
    // actually earned. Now a failure keeps the last good data and says so, a 200 that is not the contract (IB26) is a
    // failure too, and with nothing held it is the full-screen error.
    return api.get("/me/impact").then(only((r) => {
      setView((prev) => applyImpactReply(prev, r));
      // false: the next focus tries again, instead of waiting out the freshness window on a failed load.
      return r.ok && parseImpact(r.data) !== null;
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useRefreshOnFocus(load);

  const impact = view.data?.impact ?? null;
  const badges = view.data?.badges ?? null;
  const state = view.data ? loadState({ ok: true, status: 200 }, view.data.badges.length) : loadState(view.res);
  const sections = useMemo(() => badgeSections(badges ?? []), [badges]);
  const open = (b: Badge) => navigation.navigate("badgeDetail", { badge: b });

  return (
    <View style={styles.screen}>
      <ScreenBackdrop />
      <ScreenHeader title="My impact" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {impactIsStale(view) ? <StaleBanner offline={isOffline(view.res)} /> : null}
        {impact ? (
          <View style={[styles.statRow, large && styles.statRowLarge]}>
            {impactTiles(impact).map((t) => (
              <View key={t.label} accessible accessibilityLabel={`${t.value} ${t.label}`}
                    testID={`tile.impact.${t.label.toLowerCase()}`}
                    style={[styles.statTile, large && styles.statTileLarge]}>
                <Card style={styles.statCard}>
                  <Text style={styles.statValue} maxFontSizeMultiplier={maxFontScale.title}>{t.value}</Text>
                  <Text style={styles.statLabel}>{t.label}</Text>
                </Card>
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
                    <BadgeMedal earned={false} size="small" />
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
                    <Card key={b.badge_code} style={[styles.badgeTile, large && styles.badgeTileLarge]}>
                      <TouchableOpacity activeOpacity={0.8} style={styles.tilePress}
                        testID={`tile.badge.${b.badge_code}`}
                        accessibilityRole="button" accessibilityLabel={badgeA11yLabel(b)}
                        accessibilityHint="Opens the badge"
                        onPress={() => open(b)}>
                        <BadgeMedal earned size="small" />
                        <Text style={styles.badgeName}
                          numberOfLines={large ? undefined : 2}>{b.name}</Text>
                        <Text style={styles.badgeCriteria} numberOfLines={large ? undefined : 2}>{b.criteria}</Text>
                      </TouchableOpacity>
                    </Card>
                  ))}
                </View>
              </>
            ) : null}

            {sections.keepGoing.length ? (
              <>
                <Text style={styles.groupTitle} accessibilityRole="header">Keep going</Text>
                {sections.keepGoing.map((b) => (
                  <Card key={b.badge_code} style={styles.keepCard}>
                    <TouchableOpacity activeOpacity={0.8}
                      style={[styles.keepRow, large && styles.keepRowLarge]}
                      testID={`tile.badge.${b.badge_code}`}
                      accessibilityRole="button" accessibilityLabel={badgeA11yLabel(b)}
                      accessibilityHint="Opens the badge"
                      onPress={() => open(b)}>
                      <BadgeMedal earned={false} size="small" />
                      <View style={[styles.keepCopy, large && styles.keepCopyLarge]}>
                        <Text style={styles.keepName}>{b.name}</Text>
                        <Text style={styles.badgeCriteria}>{b.criteria}</Text>
                        {b.progress && b.progress.current > 0 ? (
                          <Text style={styles.keepProgress}>{progressLabel(b.progress, false)}</Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  </Card>
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
  // The cell carries the layout and the accessibility label; the Card inside is the surface.
  statTile: { flex: 1 },
  statCard: { paddingVertical: 16, paddingHorizontal: 4, borderRadius: radii.tile, alignItems: "center" },
  // large: one tile per line. The base `flex: 1` survives in a style array and would collapse the tile in a column (`flex: 0` is what works, #189).
  statRowLarge: { flexDirection: "column" },
  statTileLarge: { flex: 0, alignSelf: "stretch", flexGrow: 0, flexBasis: "auto" },
  statValue: { color: colors.teal, ...typography.hero },
  statLabel: { marginTop: 4, color: colors.muted, ...typography.meta, fontWeight: "600" },
  sectionTitle: { marginTop: 28, marginBottom: 14, color: colors.ink, ...typography.section },
  groupTitle: { marginTop: 8, marginBottom: 12, color: colors.ink, ...typography.strong, fontWeight: "800" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  // The Card owns the surface and its padding; the touchable inside owns the padding, so the whole tile is the target.
  badgeTile: { width: "48%", marginBottom: 14, padding: 0 },
  badgeTileLarge: { width: "100%" },
  tilePress: { padding: 16, alignItems: "center" },
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
  keepCard: { marginBottom: 12, padding: 0 },
  keepRow: { flexDirection: "row", alignItems: "center", padding: 14 },
  keepRowLarge: { flexDirection: "column", alignItems: "flex-start" },
  keepCopy: { flex: 1, marginLeft: 14 },
  keepCopyLarge: { flex: 0, alignSelf: "stretch", flexGrow: 0, flexBasis: "auto", marginLeft: 0, marginTop: 10 },
  keepName: { color: colors.ink, ...typography.strong, fontWeight: "800" },
  keepProgress: { marginTop: 4, color: colors.tealDark, ...typography.meta, fontWeight: "700" },
  badgeName: { marginTop: 12, color: colors.ink, ...typography.strong, fontWeight: "800", textAlign: "center" },
  badgeCriteria: { marginTop: 6, color: colors.muted, ...typography.meta, lineHeight: 17 }
});
