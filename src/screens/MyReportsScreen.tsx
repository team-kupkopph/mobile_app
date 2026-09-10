// US-S3 · the reporter's own list. Reference: screens/user/screen-my-reports.png. GET /me/reports.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View , Alert } from "react-native";
import { ScreenHeader } from "../components/ui";

import { MyReport, StrayStatus } from "../api/types";
import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { isStuck, pendingLabel } from "../outbox";
import { useOutbox } from "../outbox/OutboxProvider";
import { RootStackParamList } from "../navigation/types";
import { relTime, sagipTitle, strayChip } from "../sagip";
import { TAP_SLOP } from "../touch";
import { colors, typography } from "../theme";

const TONE = {
  amber: { bg: colors.warningBg, fg: colors.warningStrong }, teal: { bg: colors.infoBg, fg: colors.tealDark },
  green: { bg: colors.successBg, fg: colors.success }, grey: { bg: colors.greyPill, fg: colors.muted }
} as const;

const FILTERS: Array<{ key: "all" | StrayStatus; label: string }> = [
  { key: "all", label: "All" }, { key: "reported", label: "Reported" },
  { key: "rescued", label: "Rescued" }, { key: "resolved", label: "Resolved" }
];

type Props = NativeStackScreenProps<RootStackParamList, "myReports">;

export function MyReportsScreen({ navigation }: Props) {
  const api = useApi();
  const { queue, retry, discard } = useOutbox();
  const [reports, setReports] = useState<MyReport[]>([]);
  // US-R3 · `loaded` tracked that a response ARRIVED, never that it succeeded.
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);
  const [filter, setFilter] = useState<"all" | StrayStatus>("all");

  const load = useCallback(() => {
    setRes(null);
    api.get("/me/reports").then((r) => {
      setRes({ ok: r.ok, status: r.status });
      if (r.ok) setReports(r.data?.results ?? []);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus
  }, []);
  useFocusEffect(load);

  const shown = filter === "all" ? reports : reports.filter((r) => r.status === filter);

  // US-O3 · queued reports render ABOVE the sent ones, always, regardless of the filter.
  // A report the server has never seen is the one the person most needs to know about, and
  // hiding it behind a status filter (it has no status yet) would be how it gets forgotten —
  // which is precisely the silent loss §13.3 forbids.
  function confirmDiscard(key: string, label: string) {
    Alert.alert("Discard this report?", `"${label}" hasn't been sent. This can't be undone.`, [
      { text: "Keep it", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: () => { void discard(key); } },
    ]);
  }

  return (
    <View style={styles.screen} testID="screen.myReports">
      <ScreenHeader title="My reports" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.filterRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity hitSlop={TAP_SLOP}
              key={f.key}
              style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.85}
            >
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {queue.map((item) => {
          const label = sagipTitle(String(item.body.species), String(item.body.condition));
          const stuck = isStuck(item);
          return (
            <View key={item.idempotency_key} style={[styles.card, styles.pendingCard]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{label}</Text>
                <Text style={styles.cardMeta}>
                  {stuck ? "Couldn't send — tap to try again" : "On this device until you're back online"}
                </Text>
                <View style={styles.pendingActions}>
                  <Text
                    style={styles.pendingAction}
                    onPress={() => { void retry(item.idempotency_key); }}
                    accessibilityRole="button"
                    accessibilityLabel={`Try sending ${label} again`}
                  >
                    Try again
                  </Text>
                  <Text
                    style={[styles.pendingAction, styles.pendingDiscard]}
                    onPress={() => confirmDiscard(item.idempotency_key, label)}
                    accessibilityRole="button"
                    accessibilityLabel={`Discard ${label}`}
                  >
                    Discard
                  </Text>
                </View>
              </View>
              <View style={[styles.chip, { backgroundColor: stuck ? colors.dangerBg : colors.warningBg }]}>
                <Text style={[styles.chipText, { color: stuck ? colors.danger : colors.warningStrong }]}>
                  {pendingLabel(item)}
                </Text>
              </View>
            </View>
          );
        })}

        {/* ⚠️ US-R3 · the queue guard is load-bearing and must survive the conversion. Reports
            composed offline (US-O3) render ABOVE this block and exist independently of the
            server list. Showing "No reports here yet." while one of them sits on screen would
            be the same false statement in a new place — so the empty copy is suppressed while
            anything is queued. An offline/error state is NOT suppressed: it is true, and it
            explains why the server's reports are missing while the queued ones are visible. */}
        {loadState(res, shown.length).kind !== "ready"
          && !(loadState(res, shown.length).kind === "empty" && queue.length > 0) ? (
            <LoadStateView
              state={loadState(res, shown.length)}
              emptyTitle="No reports here yet."
              onRetry={load}
            />
          ) : (
          shown.map((r, i) => {
            const chip = strayChip(r.status);
            const tone = TONE[chip.tone];
            return (
              <TouchableOpacity
                // Indexed like the other lists, so a flow can assert "a report is here"
                // without depending on rendered copy — see e2e/README.md on why text
                // assertions are reserved for plain ASCII.
                testID={`card.myReports.${i}`}
                key={r.report_id}
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => navigation.navigate("reportDetail", { reportId: r.report_id })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{sagipTitle(r.species, r.condition)}</Text>
                  <Text style={styles.cardMeta}>
                    {(r.city ? r.city + " · " : "") + relTime(r.created_at)}
                  </Text>
                </View>
                <View style={[styles.chip, { backgroundColor: tone.bg }]}>
                  <Text style={[styles.chipText, { color: tone.fg }]}>{chip.label}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const card = {
  backgroundColor: colors.white, shadowColor: colors.shadowCast, shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08, shadowRadius: 7, elevation: 2
};

const styles = StyleSheet.create({
  pendingCard: { borderWidth: 1, borderColor: colors.warningBg },
  pendingActions: { flexDirection: "row", marginTop: 8 },
  pendingAction: { ...typography.meta, fontWeight: "700", color: colors.teal, marginRight: 18 },
  pendingDiscard: { color: colors.danger },
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: 26, paddingTop: 16, paddingBottom: 60 },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 18 },
  filterChip: { paddingHorizontal: 16, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: colors.white },
  filterChipActive: { backgroundColor: colors.teal },
  filterText: { color: colors.muted, fontSize: 14, fontWeight: "700" },
  filterTextActive: { color: colors.white },
  card: { flexDirection: "row", alignItems: "center", gap: 12, padding: 18, borderRadius: 20, marginBottom: 12, ...card },
  cardTitle: { color: colors.ink, fontSize: 18, fontWeight: "800" },
  cardMeta: { marginTop: 6, color: colors.muted, fontSize: 14 },
  chip: { paddingHorizontal: 12, height: 28, borderRadius: 14, justifyContent: "center" },
  chipText: { ...typography.meta, fontWeight: "800" },
  empty: { marginTop: 40, color: colors.muted, fontSize: 16, textAlign: "center" }
});
