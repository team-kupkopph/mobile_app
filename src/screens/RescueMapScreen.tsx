// US-S4 · the public rescue map. Reference: screens/user/screen-rescue-map.png. GET /reports/map.
// The map centres on the queried city and draws the search radius, plus one translucent circle
// per report at its COARSE point (S14): the ~500 m grid cell `approx_location` that report
// detail already publishes to anyone. Never a marker — a pin would imply the exact spot, which
// the backend withholds (§12.5 / decision 11) and only rescuers on the report ever see.
// S15 · a city the map can't search says so, rather than "no strays — good news".
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ScreenHeader } from "../components/ui";
import MapView, { Circle } from "react-native-maps";

import { MapReport } from "../api/types";
import { useApi } from "../api/useApi";
import { useAuth } from "../auth/AuthContext";
import { centroidFor } from "../cityCentroids";
import { LoadStateView } from "../components/LoadStateView";
import { StaleBanner } from "../components/StaleBanner";
import { RootStackParamList } from "../navigation/types";
import { feedState, useCachedFeed } from "../useCachedFeed";
import { isOffline, loadState } from "../net";
import { relTime, reportKindChip, reportTitle } from "../sagip";
import { colors, radii, spacing, typography } from "../theme";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { Card } from "../components/ui";

const TONE = {
  amber: { bg: colors.warningBg, fg: colors.warningStrong }, teal: { bg: colors.infoBg, fg: colors.tealDark },
  green: { bg: colors.successBg, fg: colors.success }, grey: { bg: colors.greyPill, fg: colors.muted }
} as const;
const RADIUS_KM = 10;
// Half the backend's 500 m coarsening cell (sagip/geo.py::COARSEN_CELL_SIZE_M): the circle
// covers roughly the cell the report is somewhere in, without claiming more precision.
const APPROX_RADIUS_M = 250;

type Props = NativeStackScreenProps<RootStackParamList, "rescueMap">;

export function RescueMapScreen({ navigation, route }: Props) {
  const api = useApi();
  const { city: savedCity } = useAuth();
  // S16 · a shelter's Rescue card passes the shelter's own city; everyone else gets theirs.
  const city = route.params?.city ?? savedCity ?? "Marikina";
  const center = centroidFor(city);
  // US-O1 · `null` until a request has actually come back. Initialising to `[]` made "never
  // loaded" indistinguishable from "loaded, and genuinely empty", which is half of the bug
  // the 2026-09-04 device walk found on this screen.
  // US-X1 · cache-first, and the screen that most needs it: a rescuer opening this on the
  // street has the worst connection of anyone using the app. `/reports/map` is coarsened to
  // a ~500m grid, which is why it may go to disk at all — see the §12.5 header in cache.ts.
  const { rows: reports, res, stale, load: loadFeed, data } =
    useCachedFeed<MapReport>(api, (d) => d?.reports ?? []);
  // Absent (an older server or cache) reads as covered — the pre-S15 behaviour.
  const citySupported = data?.city_supported !== false;
  // The RESULT is kept, not just the rows — now inside the hook. The original line here was
  // `r.ok && setReports(...)`: on a failure that evaluates to false and records NOTHING, so
  // the screen could not tell a dead network from an empty city. It reads like ordinary
  // defensive code, which is exactly why it survived review — and why this screen told a
  // person "No strays reported near Marikina right now" while the server was unreachable and
  // eight reports sat within 10 km of them. On the rescue map that is not a cosmetic slip;
  // it is a false statement about whether an animal needs help.

  const load = useCallback(() => {
    // This used to end `setReports(r.ok ? ... : [])` — so a failed refetch on focus emptied
    // the list of nearby strays a rescuer was reading. The rows now survive the failure.
    loadFeed(`/reports/map?city=${encodeURIComponent(city)}&radius_km=${RADIUS_KM}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus
  }, [city]);
  useFocusEffect(load);

  const state = feedState(res, reports, stale);
  // The badge's count is a claim about the world, so it follows the REQUEST, not what is on
  // screen: stale rows are shown (with the banner), but not counted as "nearby" right now.
  const fetched = loadState(res, reports?.length);

  return (
    <View style={styles.screen} testID="screen.rescueMap">
      {/* decision 4: MapView and its style are untouched — the backdrop sits behind the
          header and the report-list sheet below the map only. */}
      <ScreenBackdrop />
      <ScreenHeader title="Nearby strays" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* City-scoped backdrop: centred on the city + search radius. No per-report pins (§12.5) —
            the strays are in the list below; only rescuers ever see a report's exact spot. */}
        <View style={styles.mapWrap}>
          <MapView
            style={styles.map}
            pointerEvents="none"
            initialRegion={{ latitude: center.lat, longitude: center.lng, latitudeDelta: 0.24, longitudeDelta: 0.24 }}
          >
            <Circle
              center={{ latitude: center.lat, longitude: center.lng }}
              radius={RADIUS_KM * 1000}
              strokeColor="rgba(28,107,107,0.9)"
              fillColor="rgba(28,107,107,0.12)"
              strokeWidth={2}
            />
            {(reports ?? []).map((r) => r.approx_location ? (
              <Circle
                key={r.report_id}
                center={{ latitude: r.approx_location.lat, longitude: r.approx_location.lng }}
                radius={APPROX_RADIUS_M}
                strokeColor={TONE[reportKindChip(r.report_type, r.status).tone].fg}
                fillColor={`${TONE[reportKindChip(r.report_type, r.status).tone].fg}55`}
                strokeWidth={1}
              />
            ) : null)}
          </MapView>
          <View style={styles.mapBadge} pointerEvents="none">
            {/* The count is a claim about the world, so it is only made once a request has
                actually succeeded. "0 nearby" over a failed fetch is the same lie as the
                empty copy below, just in fewer words. */}
            <Text style={styles.mapBadgeText}>
              {!citySupported
                ? `Not covered yet · ${city}`
                : fetched.kind === "ready" || fetched.kind === "empty"
                  ? `${reports?.length ?? 0} nearby · within ${RADIUS_KM} km of ${city}`
                  : `Within ${RADIUS_KM} km of ${city}`}
            </Text>
          </View>
        </View>
        <Text style={styles.mapNote}>Each circle is an approximate area (about 500 m). A report's exact spot goes only to rescuers.</Text>

        <View style={styles.legendRow}>
          <Legend color={colors.warningStrong} label="Needs help" />
          <Legend color={colors.tealDark} label="Being helped" />
          <Legend color={colors.success} label="Safe" />
        </View>

        {state.kind !== "ready" ? (
          <LoadStateView
            state={state}
            emptyTitle={citySupported
              ? `No strays reported near ${city} right now.`
              : `The rescue map doesn't cover ${city} yet.`}
            emptyBody={citySupported
              ? "That's good news — check back later."
              : "It covers Metro Manila for now. You can still report a stray from Home."}
            onRetry={load}
          />
        ) : (
          <>
          {stale ? <StaleBanner offline={isOffline(res)} /> : null}
          {(reports ?? []).map((r) => {
            // D6 · a lost pet reads as one — "Lost dog", chip "Lost pet" — not as a rescue.
            const chip = reportKindChip(r.report_type, r.status);
            const tone = TONE[chip.tone];
            return (
              <TouchableOpacity
                key={r.report_id}
                activeOpacity={0.85}
                onPress={() => navigation.navigate("reportDetail", { reportId: r.report_id })}
              >
                <Card style={styles.card}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{reportTitle(r)}</Text>
                    <Text style={styles.cardMeta}>{(r.city ? r.city + " · " : "") + relTime(r.reported_at)}</Text>
                  </View>
                  <View style={[styles.chip, { backgroundColor: tone.bg }]}>
                    <Text style={[styles.chipText, { color: tone.fg }]}>{chip.label}</Text>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legend}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 16, paddingBottom: 60 },
  mapWrap: { height: 200, borderRadius: radii.card, overflow: "hidden", backgroundColor: colors.soft },
  map: { ...StyleSheet.absoluteFillObject },
  mapBadge: { position: "absolute", left: 12, bottom: 12, backgroundColor: "rgba(255,255,255,0.94)", paddingHorizontal: 14, height: 34, borderRadius: 17, justifyContent: "center" },
  mapBadgeText: { color: colors.tealDark, ...typography.meta, fontWeight: "800" },
  mapNote: { marginTop: 10, color: colors.muted, ...typography.meta, lineHeight: 18 },
  legendRow: { flexDirection: "row", gap: 18, marginTop: 16, marginBottom: 18 },
  legend: { flexDirection: "row", alignItems: "center", gap: 7 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { color: colors.muted, ...typography.meta, fontWeight: "600" },
  card: { flexDirection: "row", alignItems: "center", gap: 12, padding: 18, marginBottom: 12 },
  cardTitle: { color: colors.ink, ...typography.section },
  cardMeta: { marginTop: 6, color: colors.muted, ...typography.meta },
  chip: { paddingHorizontal: 12, height: 28, borderRadius: 14, justifyContent: "center" },
  chipText: { ...typography.meta, fontWeight: "800" },
  empty: { marginTop: 30, color: colors.muted, ...typography.subtitle, textAlign: "center" }
});
