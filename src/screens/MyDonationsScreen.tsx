// US-W2 · the giver's My Donations: their pledges (pledged / delivered / cancelled). A
// still-pledged pledge can be cancelled (honest and always allowed, D-S6-7); a delivered one
// is a recorded fact with no action.
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View
} from "react-native";

import { useApi } from "../api/useApi";
import { useAuth } from "../auth/AuthContext";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import {
  cancelRefusedCopy,
  CancelReason, CHIP_UI_TONE, pledgeIsCancellable, pledgeStatusChip, PledgeStatus, pledgeSubtitle, quantityLabel
} from "../community";
import { SignupWall } from "../components/SignupWall";
import { setIntent } from "../guestIntent";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { RootStackParamList } from "../navigation/types";
import { TAP_SLOP } from "../touch";
import { useLargeText } from "../useLargeText";
import { colors, maxFontScale, pill, spacing, typography } from "../theme";
import { Button, Card, Chip, ScreenHeader } from "../components/ui";

/** Maps community.ts's own tone vocabulary onto the shared Chip primitive's tones. */

type Pledge = {
  pledge_id: string; quantity: number; status: PledgeStatus;
  created_at: string; decided_at?: string | null; cancel_reason?: CancelReason | null;
  need: { need_id: string; title: string; category: string; shelter_name: string; unit?: string };
};
type Props = NativeStackScreenProps<RootStackParamList, "myDonations">;

export function MyDonationsScreen({ navigation }: Props) {
  // At Dynamic Type AX3 and up a pledge's title | status chip row cannot share a line, so it stacks.
  const large = useLargeText();
  const api = useApi();
  const { tokens } = useAuth();
  // A guest has no donations to load; they see the wall rather than a 401 with a retry button (QR Run 1 DE-14).
  const isGuest = tokens === null;
  const [wallOpen, setWallOpen] = useState(isGuest);
  const [pledges, setPledges] = useState<Pledge[] | null>(null);
  const [next, setNext] = useState<number | null>(null);
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  // B4 · why a card changed under the donor: their cancel found the pledge already settled (or gone). Cleared by the next action.
  const [notice, setNotice] = useState<string | null>(null);

  // Page 1, replacing the list. Run on focus (AW13), so a pledge the shelter settled, or one made on the way
  // here, is what you see. It does not blank the list first: only the first load shows the spinner.
  const load = useCallback(() => {
    if (isGuest) return;
    // ⚠️ was `setPledges(r.ok ? r.data.results : [])` — a failure became an empty list, and
    // the render below turned that into "You haven't pledged anything yet."
    api.get("/me/pledges?page=1").then((r) => {
      setRes({ ok: r.ok, status: r.status });
      if (r.ok) { setPledges(r.data.results); setNext(r.data.next ?? null); }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- api changes with the tokens; isGuest covers that
  }, [isGuest]);
  useFocusEffect(load);

  async function loadMore() {
    if (next === null || loadingMore) return;
    setNotice(null);
    setLoadingMore(true);
    const r = await api.get(`/me/pledges?page=${next}`);
    setLoadingMore(false);
    if (r.ok) {
      setPledges((cur) => [...(cur ?? []), ...r.data.results]);
      setNext(r.data.next ?? null);
    } else {
      Alert.alert("Couldn't load more", "Check your connection and try again.");
    }
  }

  function confirmCancel(p: Pledge) {
    setNotice(null);
    Alert.alert("Cancel this pledge?",
      `You pledged ${quantityLabel(p.quantity, p.need.unit)} to “${p.need.title}”. Cancelling is fine — it just lets the ` +
      "shelter know not to expect it.",
      [{ text: "Keep pledge", style: "cancel" },
       { text: "Cancel pledge", style: "destructive", onPress: () => doCancel(p) }]);
  }

  async function doCancel(p: Pledge) {
    if (busyId) return;
    setBusyId(p.pledge_id);
    const res = await api.post(`/pledges/${p.pledge_id}/cancel`);
    setBusyId(null);
    if (res.ok) { load(); return; }
    // 409 / 404: the shelter settled it (or it is gone) while this screen was open. That is not a failure
    // to apologise for — the list was stale, so refresh it and the card shows what really happened (AW9).
    if (res.status === 409 || res.status === 404) { setNotice(cancelRefusedCopy(res.status)); load(); return; }
    Alert.alert("Couldn't cancel", res.status === 0
      ? "Check your connection and try again."
      : "Something went wrong on our end. Please try again.");
  }

  // Rows already on screen stay if a later refresh fails; the state only decides the first load.
  const listState = pledges === null ? loadState(res) : loadState({ ok: true, status: 200 }, pledges.length);

  return (
    <View style={styles.screen}>
      <ScreenBackdrop />
      <ScreenHeader title="My donations" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isGuest ? (
          <>
            <Text style={styles.empty}>Sign in to see the items you've pledged to shelters.</Text>
            <Button label="Create an account or log in" onPress={() => setWallOpen(true)} style={styles.guestBtn} />
          </>
        ) : listState.kind !== "ready" ? (
          <LoadStateView
            state={listState}
            emptyTitle="You haven't pledged anything yet."
            emptyBody="A shelter's wishlist is a great place to start."
            onRetry={() => { setRes(null); load(); }}
          />
        ) : (
          <>
            {notice ? <Text style={styles.notice} accessibilityRole="alert">{notice}</Text> : null}
            {(pledges ?? []).map((p) => {
              const chip = pledgeStatusChip(p.status, p.cancel_reason);
              return (
                <Card key={p.pledge_id} style={styles.pledgeCard}>
                  <View style={[styles.row, large && styles.rowLarge]}>
                    <Text style={[styles.needTitle, large && styles.needTitleLarge]} maxFontSizeMultiplier={maxFontScale.title}>{p.need.title}</Text>
                    <Chip tone={CHIP_UI_TONE[chip.tone]} dot={false} label={chip.label} />
                  </View>
                  <Text style={styles.qtyLine}>{quantityLabel(p.quantity, p.need.unit)}</Text>
                  <Text style={styles.meta}>{pledgeSubtitle(p.need.shelter_name, p.decided_at, p.created_at)}</Text>
                  {pledgeIsCancellable(p.status) ? (
                    <TouchableOpacity hitSlop={TAP_SLOP} style={styles.cancelBtn} onPress={() => confirmCancel(p)}
                      disabled={busyId === p.pledge_id}>
                      <Text style={styles.cancelLabel}>
                        {busyId === p.pledge_id ? "Cancelling…" : "Cancel pledge"}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </Card>
              );
            })}
            {next !== null ? (
              <Button label="Load more" onPress={loadMore} variant="secondary" loading={loadingMore} style={styles.loadMore} />
            ) : null}
          </>
        )}
        {/* DW4 / OQ6 · a gift sent by QR leaves no record here. Said in both the empty and the list state, so a donor who gave by QR is not left wondering. */}
        <Text style={styles.qrNote}>Gifts you send by QR go straight to the shelter and don't appear here.</Text>
      </ScrollView>
      <SignupWall
        visible={wallOpen}
        action="donate"
        onCreateAccount={() => { setIntent("donate"); setWallOpen(false); navigation.navigate("accountType"); }}
        onLogin={() => { setWallOpen(false); navigation.navigate("signin"); }}
        onDismiss={() => setWallOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 60 },
  empty: { marginTop: 40, color: colors.muted, ...typography.body, textAlign: "center" },
  pledgeCard: { marginBottom: 14, padding: 18 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  // large: stacked. The base `flex: 1` survives in a style array and would collapse the text in a column (`flex: 0` is what works, #189).
  rowLarge: { flexDirection: "column", alignItems: "flex-start" },
  needTitleLarge: { flex: 0, flexGrow: 0, flexBasis: "auto" },
  needTitle: { flex: 1, color: colors.ink, ...typography.subtitle, fontWeight: "800" },
  qtyLine: { marginTop: 8, color: colors.ink, ...typography.strong, fontWeight: "700" },
  meta: { marginTop: 4, color: colors.muted, ...typography.body },
  loadMore: { marginTop: 4 },
  notice: { marginBottom: 12, color: colors.ink, ...typography.meta, lineHeight: 20 },
  guestBtn: { marginTop: 24 },
  cancelBtn: { marginTop: 14, alignSelf: "flex-start", minHeight: 38, paddingVertical: 8, paddingHorizontal: 16, justifyContent: "center", borderRadius: pill(38), backgroundColor: "#FBEEEC" },
  qrNote: { marginTop: 18, color: colors.muted, ...typography.meta, lineHeight: 20, textAlign: "center" },
  cancelLabel: { color: colors.danger, ...typography.strong, fontWeight: "700" }
});
