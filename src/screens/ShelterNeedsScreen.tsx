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
import { ChipTone, needCategoryLabel, needProgressLabel, needStatusChip, NeedStatus } from "../community";
import { RootStackParamList } from "../navigation/types";
import { colors, spacing, typography } from "../theme";
import { useLargeText } from "../useLargeText";
import { Button, Card, Chip, ScreenHeader } from "../components/ui";

/** Maps community.ts's own tone vocabulary onto the shared Chip primitive's tones. */
const CHIP_TONE: Record<ChipTone, "success" | "warning" | "neutral"> = {
  ok: "success",
  warn: "warning",
  muted: "neutral"
};

type Need = {
  need_id: string; title: string; category: string; description: string;
  quantity_needed: number; quantity_received: number; status: NeedStatus;
};
type Props = NativeStackScreenProps<RootStackParamList, "shelterNeeds">;

export function ShelterNeedsScreen({ navigation }: Props) {
  // At Dynamic Type AX3 and up a need's title and status chip cannot share a row (the title broke over four lines), so the row stacks.
  const large = useLargeText();
  const api = useApi();
  const [needs, setNeeds] = useState<Need[] | null>(null);
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);


  const load = useCallback(() => {
    let alive = true;
    setRes(null);
    api.get("/me").then((me) => {
      if (!alive) return;
      // A failed /me is the screen's failure too: without this the screen stayed on its spinner for ever.
      if (!me.ok) { setRes({ ok: false, status: me.status }); return; }
      api.get(`/shelters/${me.data.account_id}/needs`).then((r) => {
        if (!alive) return;
        setRes({ ok: r.ok, status: r.status });
        if (r.ok) setNeeds(r.data.results);
      });
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useFocusEffect(load);

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

        {loadState(res, needs?.length).kind !== "ready" ? (
          <LoadStateView
            state={loadState(res, needs?.length)}
            emptyTitle="No needs posted yet."
            onRetry={load}
          />
        ) : (
          (needs ?? []).map((need) => {
            const chip = needStatusChip(need.status);
            return (
              <TouchableOpacity key={need.need_id} activeOpacity={0.8}
                onPress={() => navigation.navigate("needPledges", { needId: need.need_id, need })}>
                <Card style={styles.needCard}>
                  <View style={[styles.row, large && styles.rowLarge]}>
                    <Text style={[styles.needTitle, large && styles.needTitleLarge]}>{need.title}</Text>
                    <Chip tone={CHIP_TONE[chip.tone]} dot={false} label={chip.label} />
                  </View>
                  <Text style={styles.meta}>
                    {needCategoryLabel(need.category)} · {needProgressLabel(need.quantity_received, need.quantity_needed)}
                  </Text>
                </Card>
              </TouchableOpacity>
            );
          })
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
  meta: { marginTop: 8, color: colors.muted, ...typography.meta }
});
