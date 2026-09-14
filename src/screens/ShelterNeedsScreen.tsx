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
import { ChipTone, needProgressLabel, needStatusChip, NeedStatus } from "../community";
import { RootStackParamList } from "../navigation/types";
import { colors, spacing, typography } from "../theme";
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
  const api = useApi();
  const [needs, setNeeds] = useState<Need[] | null>(null);
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);


  const load = useCallback(() => {
    let alive = true;
    api.get("/me").then((me) => {
      if (!me.ok || !alive) return;
      api.get(`/shelters/${me.data.account_id}/needs`)
        .then((r) => alive && setNeeds(r.ok ? r.data.results : []));
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
                onPress={() => navigation.navigate("needPledges", { need })}>
                <Card style={styles.needCard}>
                  <View style={styles.row}>
                    <Text style={styles.needTitle}>{need.title}</Text>
                    <Chip tone={CHIP_TONE[chip.tone]} dot={false} label={chip.label} />
                  </View>
                  <Text style={styles.meta}>
                    {need.category} · {needProgressLabel(need.quantity_received, need.quantity_needed)}
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
  needTitle: { flex: 1, color: colors.ink, ...typography.subtitle, fontWeight: "800" },
  meta: { marginTop: 8, color: colors.muted, ...typography.meta, textTransform: "capitalize" }
});
