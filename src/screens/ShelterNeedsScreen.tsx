// US-W3 · a shelter manages its Abot-tulong wishlist. Lists its own needs (all statuses) with
// progress + status chips; add a new need; tap one to see and confirm pledges.
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { ScreenBackdrop } from "../components/ScreenBackground";
import {
  ChipTone, awaitingConfirmTag, needCategoryLabel, needProgressLabel, needStatusChip, NeedStatus, pledgeCountLabel
} from "../community";
import { RootStackParamList } from "../navigation/types";
import { colors, dangerOnSurface, spacing, typography } from "../theme";
import { useLargeText } from "../useLargeText";
import { Button, Card, Chip, ScreenHeader } from "../components/ui";

/** Maps community.ts's own tone vocabulary onto the shared Chip primitive's tones. */
const CHIP_TONE: Record<ChipTone, "success" | "warning" | "neutral"> = {
  ok: "success",
  warn: "warning",
  muted: "neutral"
};

// The owner's list row (GET /shelters/{me}/needs): every status, with the counts the screens used to fan out for.
type Need = {
  need_id: string; title: string; category: string; description: string;
  quantity_needed: number; quantity_received: number; status: NeedStatus;
  unit?: string; quantity_pledged?: number; pledge_count?: number; awaiting_confirm?: number;
};
type Props = NativeStackScreenProps<RootStackParamList, "shelterNeeds">;

export function ShelterNeedsScreen({ navigation }: Props) {
  // At Dynamic Type AX3 and up a need's title and status chip cannot share a row (the title broke over four lines), so the row stacks.
  const large = useLargeText();
  const api = useApi();
  const [needs, setNeeds] = useState<Need[] | null>(null);
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);
  // The list is 20 a page; `next` is the next page number, or null on the last.
  const [accountId, setAccountId] = useState<string | null>(null);
  const [next, setNext] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);
  const [instructions, setInstructions] = useState("");

  const load = useCallback(() => {
    let alive = true;
    setRes(null);
    api.get("/me").then((me) => {
      if (!alive) return;
      // A failed /me is the screen's failure too: without this the screen stayed on its spinner for ever.
      if (!me.ok) { setRes({ ok: false, status: me.status }); return; }
      setAccountId(me.data.account_id);
      api.get(`/shelters/${me.data.account_id}/needs`).then((r) => {
        if (!alive) return;
        setRes({ ok: r.ok, status: r.status });
        if (r.ok) {
          setNeeds(r.data.results);
          setNext(r.data.next ?? null);
          setMoreFailed(false);
          setInstructions(r.data.donation_instructions ?? "");
        }
      });
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useFocusEffect(load);

  async function loadMore() {
    if (next === null || loadingMore || !accountId) return;
    setLoadingMore(true);
    setMoreFailed(false);
    const r = await api.get(`/shelters/${accountId}/needs?page=${next}`);
    setLoadingMore(false);
    if (!r.ok) { setMoreFailed(true); return; }
    setNeeds((prev) => [...(prev ?? []), ...r.data.results]);
    setNext(r.data.next ?? null);
  }

  return (
    <View style={styles.screen}>
      <ScreenBackdrop />
      <ScreenHeader title="Wishlist" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.note}>
          Post what your shelter needs. Givers pledge to bring items; you confirm once they arrive.
        </Text>
        <Button
          label="+ Add a need"
          onPress={() => navigation.navigate("needForm", {})}
          style={styles.addBtn}
        />

        {/* US-W3 · where and when givers should bring items. Shown to a giver after they pledge. */}
        <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate("donationInstructions")}
          accessibilityRole="button">
          <Card style={styles.instructionsCard}>
            <View style={styles.instructionsRow}>
              <View style={styles.instructionsCopy}>
                <Text style={styles.instructionsTitle}>Drop-off instructions</Text>
                <Text style={styles.instructionsBody} numberOfLines={2}>
                  {instructions.trim() || "Tell givers where and when to bring items."}
                </Text>
              </View>
              <Text style={styles.instructionsAction}>{instructions.trim() ? "Edit" : "Add"}</Text>
            </View>
          </Card>
        </TouchableOpacity>

        {loadState(res, needs?.length).kind !== "ready" ? (
          <LoadStateView
            state={loadState(res, needs?.length)}
            emptyTitle="No needs posted yet."
            onRetry={load}
          />
        ) : (
          <>
            {(needs ?? []).map((need) => {
              const chip = needStatusChip(need.status);
              const toConfirm = awaitingConfirmTag(need.awaiting_confirm);
              return (
                <TouchableOpacity key={need.need_id} activeOpacity={0.8}
                  onPress={() => navigation.navigate("needPledges", { needId: need.need_id, need })}>
                  <Card style={styles.needCard}>
                    <View style={[styles.row, large && styles.rowLarge]}>
                      <Text style={[styles.needTitle, large && styles.needTitleLarge]}>{need.title}</Text>
                      <Chip tone={CHIP_TONE[chip.tone]} dot={false} label={chip.label} />
                    </View>
                    <Text style={styles.meta}>
                      {needCategoryLabel(need.category)} · {needProgressLabel(need.quantity_received, need.quantity_needed, need.unit, need.quantity_pledged)}
                    </Text>
                    {need.pledge_count || toConfirm ? (
                      <View style={styles.tagRow}>
                        {need.pledge_count ? <Text style={styles.pledgeCount}>{pledgeCountLabel(need.pledge_count)}</Text> : null}
                        {toConfirm ? <Chip tone="warning" dot={false} label={toConfirm} /> : null}
                      </View>
                    ) : null}
                  </Card>
                </TouchableOpacity>
              );
            })}
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
  note: { color: colors.muted, ...typography.body, lineHeight: 21, marginBottom: 16 },
  addBtn: { marginBottom: 20 },
  empty: { marginTop: 30, color: colors.muted, ...typography.subtitle, textAlign: "center" },
  needCard: { marginBottom: 12, padding: 18 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  // large: stacked. The base `needTitle` is `flex: 1`, which survives in a style array and would collapse the text in a column (`flex: 0` is
  // what works: grow / basis alone left it at zero height on the Cancel screen, #189).
  rowLarge: { flexDirection: "column", alignItems: "flex-start", gap: 10 },
  needTitleLarge: { flex: 0, alignSelf: "stretch", flexGrow: 0, flexBasis: "auto" },
  needTitle: { flex: 1, color: colors.ink, ...typography.subtitle, fontWeight: "800" },
  meta: { marginTop: 8, color: colors.muted, ...typography.meta },
  tagRow: { marginTop: 10, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10 },
  pledgeCount: { color: colors.muted, ...typography.meta, fontWeight: "700" },
  instructionsCard: { marginBottom: 20, padding: 18 },
  instructionsRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  instructionsCopy: { flex: 1 },
  instructionsTitle: { color: colors.ink, ...typography.subtitle, fontWeight: "800" },
  instructionsBody: { marginTop: 6, color: colors.muted, ...typography.meta },
  instructionsAction: { color: colors.teal, ...typography.strong, fontWeight: "700" },
  loadMore: { marginTop: 4 },
  moreError: { marginBottom: 10, color: colors.danger, ...typography.meta, fontWeight: "600", textAlign: "center", ...dangerOnSurface, alignSelf: "center" }
});
