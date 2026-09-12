// US-K3 · the claimer's own cases — active, resolved, and expired, newest claim first.
// Reference: screens/user/screen-my-rescues.png. GET /me/rescues.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { RescueCaseSummary } from "../api/types";
import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { RootStackParamList } from "../navigation/types";
import { relTime, sagipTitle, strayChip } from "../sagip";
import { colors, elevation, radii, spacing, typography } from "../theme";
import { ScreenHeader } from "../components/ui";

const TONE = {
  amber: { bg: colors.warningBg, fg: colors.warningStrong }, teal: { bg: colors.infoBg, fg: colors.tealDark },
  green: { bg: colors.successBg, fg: colors.success }, grey: { bg: colors.greyPill, fg: colors.muted }
} as const;

type Props = NativeStackScreenProps<RootStackParamList, "myRescues">;

export function MyRescuesScreen({ navigation }: Props) {
  const api = useApi();
  const [cases, setCases] = useState<RescueCaseSummary[]>([]);
  // US-R3 · `loaded` tracked that a response ARRIVED, never that it succeeded — so
  // `loaded && length === 0` was true both for a genuine empty list and for a failed
  // request, and rendered the same sentence for both.
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);


  const load = useCallback(() => {
    setRes(null);
    api.get("/me/rescues").then((r) => {
      setRes({ ok: r.ok, status: r.status });
      if (r.ok) setCases(r.data?.cases ?? []);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus
  }, []);
  useFocusEffect(load);

  return (
    <View style={styles.screen}>
      <ScreenHeader title="My rescues" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loadState(res, cases.length).kind !== "ready" ? (
          <LoadStateView
            state={loadState(res, cases.length)}
            emptyTitle="You haven't claimed a case yet."
            onRetry={load}
          />
        ) : (
          cases.map((c) => {
            // An expired claim shows its own lapsed state rather than the report's
            // current (possibly re-claimed by someone else) status.
            const chip = c.expired_at ? { label: "Expired", tone: "grey" as const } : strayChip(c.status);
            const tone = TONE[chip.tone];
            return (
              <TouchableOpacity
                key={c.case_id}
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => navigation.navigate("rescueUpdate", {
                  caseId: c.case_id, reportId: c.report.report_id
                })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{sagipTitle(c.report.species, c.report.condition)}</Text>
                  <Text style={styles.cardMeta}>
                    {(c.report.city ? c.report.city + " · " : "") + "claimed " + relTime(c.claimed_at)}
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
  backgroundColor: colors.white, ...elevation.soft
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 16, paddingBottom: 60 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, padding: 18, borderRadius: radii.field, marginBottom: 12, ...card },
  cardTitle: { color: colors.ink, ...typography.section },
  cardMeta: { marginTop: 6, color: colors.muted, ...typography.meta },
  chip: { paddingHorizontal: 12, height: 28, borderRadius: 14, justifyContent: "center" },
  chipText: { ...typography.meta, fontWeight: "800" },
  empty: { marginTop: 40, color: colors.muted, ...typography.subtitle, textAlign: "center" }
});
