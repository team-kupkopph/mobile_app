// US-W4 · Ways to help — verified shelters asking for help, the viewer's city first. For someone with no shelter in mind;
// a shelter with needs and no adoption listing (EN-5) has no other door. GET /shelters/ways-to-help?city= (20 a page);
// tapping a shelter opens its existing Donate screen (identity, QR, wishlist). Reached from Home's "Ways to help ›".
// Design: library docs/superpowers/specs/2026-10-27-us-w4-ways-to-help-design.md.
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { useAuth } from "../auth/AuthContext";
import { LoadStateView } from "../components/LoadStateView";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { Button, Card, ScreenHeader } from "../components/ui";
import { loadState } from "../net";
import { RootStackParamList } from "../navigation/types";
import { colors, pill, spacing, typography } from "../theme";
import {
  appendShelters, helpGroups, HelpShelter, needCountLabel, TAKES_QR, WAYS_TO_HELP_EMPTY, WAYS_TO_HELP_INTRO
} from "../waysToHelp";

type Props = NativeStackScreenProps<RootStackParamList, "waysToHelp">;

export function WaysToHelpScreen({ navigation }: Props) {
  const api = useApi();
  // The same cached city Home's "Adopt near you" uses; a guest who never picked one gets one unheaded list.
  const { city } = useAuth();
  const [rows, setRows] = useState<HelpShelter[] | null>(null);
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);
  const [next, setNext] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);
  // Always sent: a blank `city` is "no city" on the server, so nothing is near.
  const listUrl = `/shelters/ways-to-help?city=${encodeURIComponent(city ?? "")}`;

  // Refetched on focus, from page 1: coming back from a pledge shows the new need count.
  const load = useCallback(() => {
    api.get(listUrl).then((r) => {
      setRes({ ok: r.ok, status: r.status });
      if (r.ok) {
        setRows(r.data.results);
        setNext(r.data.next ?? null);
        setMoreFailed(false);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- api changes with the tokens; the list does not depend on them
  }, [listUrl]);
  useFocusEffect(load);

  async function loadMore() {
    if (next === null || loadingMore) return;
    setLoadingMore(true);
    setMoreFailed(false);
    const r = await api.get(`${listUrl}&page=${next}`);
    setLoadingMore(false);
    if (!r.ok) { setMoreFailed(true); return; }
    setRows((prev) => appendShelters(prev, r.data.results));
    setNext(r.data.next ?? null);
  }

  // Rows already on screen stay if a later refresh fails; the state only decides the first load.
  const listState = rows === null ? loadState(res) : loadState({ ok: true, status: 200 }, rows.length);

  return (
    <View style={styles.screen}>
      <ScreenBackdrop />
      <ScreenHeader title="Ways to help" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>{WAYS_TO_HELP_INTRO}</Text>

        {listState.kind !== "ready" ? (
          <LoadStateView state={listState} emptyTitle={WAYS_TO_HELP_EMPTY} onRetry={() => { setRes(null); load(); }} />
        ) : (
          <>
            {helpGroups(rows ?? [], city).map((group) => (
              <View key={group.title ?? "all"} style={styles.group}>
                {group.title ? <Text style={styles.groupTitle} accessibilityRole="header">{group.title}</Text> : null}
                {group.rows.map((s) => (
                  <TouchableOpacity key={s.account_id} activeOpacity={0.8} accessibilityRole="button"
                    accessibilityLabel={`${s.org_name}, ${[s.city, s.open_needs > 0 ? needCountLabel(s.open_needs) : TAKES_QR].filter(Boolean).join(", ")}`}
                    onPress={() => navigation.navigate("donate", { accountId: s.account_id, orgName: s.org_name, city: s.city })}>
                    <Card style={styles.card}>
                      <View style={styles.nameRow}>
                        <Text style={styles.name}>{s.org_name}</Text>
                        <View style={styles.tick} accessible accessibilityLabel="Verified organisation"><Text style={styles.tickMark}>✓</Text></View>
                      </View>
                      {s.city ? <Text style={styles.city}>{s.city}</Text> : null}
                      {s.open_needs > 0 ? (
                        <>
                          <Text style={styles.needs}>{needCountLabel(s.open_needs)}</Text>
                          <Text style={styles.titles} numberOfLines={2}>{s.need_titles.join(" · ")}</Text>
                        </>
                      ) : null}
                      {s.takes_qr ? <Text style={styles.qr}>{TAKES_QR}</Text> : null}
                    </Card>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
            {next !== null ? (
              <>
                {moreFailed ? <Text style={styles.moreError} accessibilityRole="alert">Couldn't load more. Try again.</Text> : null}
                <Button label="Load more" variant="secondary" onPress={loadMore} loading={loadingMore} style={styles.loadMore} />
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
  intro: { color: colors.muted, ...typography.body, lineHeight: 21, marginBottom: 16 },
  group: { marginBottom: 8 },
  groupTitle: { marginBottom: 12, color: colors.ink, ...typography.section },
  card: { marginBottom: 12, padding: 18 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  name: { flexShrink: 1, color: colors.ink, ...typography.subtitle, fontWeight: "800" },
  tick: { width: 18, height: 18, borderRadius: pill(18), backgroundColor: colors.teal, alignItems: "center", justifyContent: "center" },
  tickMark: { color: colors.white, ...typography.meta, lineHeight: undefined, fontWeight: "900" },
  city: { marginTop: 4, color: colors.muted, ...typography.meta },
  needs: { marginTop: 10, color: colors.ink, ...typography.strong, fontWeight: "700" },
  titles: { marginTop: 2, color: colors.muted, ...typography.meta },
  qr: { marginTop: 8, color: colors.teal, ...typography.meta, fontWeight: "700" },
  loadMore: { marginTop: 4 },
  moreError: { marginBottom: 10, color: colors.danger, ...typography.meta, fontWeight: "600", textAlign: "center" }
});
