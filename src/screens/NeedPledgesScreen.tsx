// US-W3 · a need's pledges, and the shelter's confirm-received and mark-complete actions.
// The screen loads the need BY ID (GET /needs/{id}) on focus and again after every write: a bell or push
// tap opens it with only a `needId`, and a snapshot passed in from the list would go stale the moment a
// donor pledged or cancelled. `route.params.need` is at most a first-paint placeholder.
//
// What the shelter may do comes from `needActions(status)`, but only once the need has been read fresh
// (`liveNeedActions`): a placeholder, or a copy from before a failed refresh, grants nothing. "Mark received" asks for the quantity that
// ACTUALLY arrived (it can differ from the pledge) in the shared ConfirmModal; "Mark complete" takes the
// need off the wishlist and cancels what is still pledged — on a fulfilled need, only that cancel (backend#103).
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useApi } from "../api/useApi";
import {
  ChipTone, completeNeedBody, liveNeedActions, needActionErrorCopy, needCategoryLabel, needProgressLabel,
  needStatusChip, pledgeStatusChip, pledgeWhen, quantityLabel, receivedPreview, CancelReason, PledgeStatus
} from "../community";
import { ConfirmModal } from "../components/ConfirmModal";
import { LoadStateView } from "../components/LoadStateView";
import { QuantityStepper } from "../components/QuantityStepper";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { Button, Card, Chip, ScreenHeader } from "../components/ui";
import { loadState } from "../net";
import { RootStackParamList, ShelterNeedShape } from "../navigation/types";
import { colors, spacing, typography } from "../theme";
import { useLargeText } from "../useLargeText";

/** Maps community.ts's own tone vocabulary onto the shared Chip primitive's tones. */
const CHIP_TONE: Record<ChipTone, "success" | "warning" | "neutral"> = {
  ok: "success",
  warn: "warning",
  muted: "neutral"
};

type Pledge = {
  pledge_id: string; quantity: number; status: PledgeStatus; pledger_name: string;
  created_at?: string; note?: string | null; quantity_received?: number | null;
  decided_at?: string | null; cancel_reason?: CancelReason | null;
};
type Props = NativeStackScreenProps<RootStackParamList, "needPledges">;
type Res = { ok: boolean; status: number } | null;

export function NeedPledgesScreen({ navigation, route }: Props) {
  // At Dynamic Type AX3 and up a pledge's name and status chip cannot share a row, so the card stacks.
  const large = useLargeText();
  const api = useApi();
  const { needId } = route.params;
  // The list's row, when we came from it, paints the first frame; GET /needs/{id} replaces it.
  const [need, setNeed] = useState<ShelterNeedShape | null>(route.params.need ?? null);
  const [needRes, setNeedRes] = useState<Res>(null);
  const [pledges, setPledges] = useState<Pledge[] | null>(null);
  const [pledgesRes, setPledgesRes] = useState<Res>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Mark received: which pledge, and the quantity the shelter says arrived.
  const [receiving, setReceiving] = useState<Pledge | null>(null);
  const [recvQty, setRecvQty] = useState(1);
  const [completing, setCompleting] = useState(false);

  const load = useCallback(() => {
    let alive = true;
    api.get(`/needs/${needId}`).then((r) => {
      if (!alive) return;
      setNeedRes({ ok: r.ok, status: r.status });
      if (r.ok) setNeed(r.data);
    });
    api.get(`/needs/${needId}/pledges`).then((r) => {
      if (!alive) return;
      setPledgesRes({ ok: r.ok, status: r.status });
      if (r.ok) setPledges(r.data.results ?? []);
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus only
  }, [needId]);
  useFocusEffect(load);

  function retry() {
    setNeedRes(null);
    setPledgesRes(null);
    load();
  }

  function startReceive(p: Pledge) {
    setError(null);
    setRecvQty(p.quantity);
    setReceiving(p);
  }

  async function doReceive() {
    if (busy || !receiving) return;
    setBusy(true);
    const res = await api.post(`/needs/${needId}/received`,
      { pledge_id: receiving.pledge_id, quantity_received: recvQty });
    setBusy(false);
    setReceiving(null);
    if (res.ok) { setError(null); load(); return; }
    // A 409 means the pledge or the need moved under us (a donor cancelled, or it was completed elsewhere):
    // reload and say so, rather than a dead "couldn't confirm" over data that is already out of date.
    const copy = needActionErrorCopy(res.status, res.data?.error?.code);
    setError(copy.message);
    if (res.status === 409 || copy.reload) load();
  }

  async function doComplete() {
    if (busy) return;
    setBusy(true);
    const res = await api.post(`/needs/${needId}/complete`, {});
    setBusy(false);
    setCompleting(false);
    if (res.ok) { setError(null); load(); return; }
    const copy = needActionErrorCopy(res.status, res.data?.error?.code);
    setError(copy.message);
    if (copy.reload) load();
  }

  const needState = loadState(needRes);
  const unit = need?.unit || undefined;

  // Without a need to show (a notification opened us by id and the request has not answered, or failed) the
  // whole screen is its load state. With one — even a stale placeholder — keep it on screen, unless the server
  // says it is gone (404): a placeholder must not outlive the need.
  if (needState.kind === "gone" || (!need && needState.kind !== "ready")) {
    return (
      <View style={styles.screen}>
        <ScreenBackdrop />
        <ScreenHeader title="Need" onBack={() => navigation.goBack()} />
        <LoadStateView state={needState} subject="need" onRetry={retry} onBack={() => navigation.goBack()} />
      </View>
    );
  }
  if (!need) return null;   // unreachable: `ready` implies the need was set. Keeps the types honest.

  // backend#103 · a fulfilled need's Mark complete settles the pledges still waiting. Counted from the loaded list only, so the
  // button appears once the shelter can see which pledges those are.
  const waiting = pledges ? pledges.filter((p) => p.status === "pledged").length : 0;
  const actions = liveNeedActions(needState.kind, need.status, waiting);
  const stale = needState.kind === "offline" || needState.kind === "error";
  const chip = needStatusChip(need.status);
  const pledgesState = loadState(pledgesRes, pledges?.length);
  // What Mark complete will cancel: the pledges still open. Counted from the list when it has loaded (it is what the
  // shelter is looking at); the need's own `pledge_count` is the fallback before then.
  const openPledges = pledges ? pledges.filter((p) => p.status === "pledged").length : need.pledge_count;

  return (
    <View style={styles.screen}>
      <ScreenBackdrop />
      <ScreenHeader title={need.title} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.summary}>
          <View style={[styles.row, large && styles.rowLarge]}>
            <Text style={styles.progress}>
              {needProgressLabel(need.quantity_received, need.quantity_needed, unit, need.quantity_pledged)}
            </Text>
            <Chip tone={CHIP_TONE[chip.tone]} dot={false} label={chip.label} />
          </View>
          <Text style={styles.meta}>{needCategoryLabel(need.category)}</Text>
          {need.description ? <Text style={styles.description}>{need.description}</Text> : null}
          {actions.edit || actions.complete ? (
            <View style={styles.actionRow}>
              {actions.edit ? (
                <Button size="small" variant="secondary" label="Edit" onPress={() => navigation.navigate("needForm", { need })} />
              ) : null}
              {actions.complete ? (
                <Button size="small" variant="destructive" label="Mark complete" onPress={() => { setError(null); setCompleting(true); }} />
              ) : null}
            </View>
          ) : null}
        </Card>

        {stale ? (
          <View style={styles.staleBox}>
            <Text style={styles.error} accessibilityRole="alert">
              Couldn't refresh this need, so what's shown may be out of date. Editing and confirming are paused.
            </Text>
            <Button size="small" variant="secondary" label="Retry" onPress={retry} style={styles.staleRetry} />
          </View>
        ) : null}

        {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}

        <Text style={styles.sectionTitle} accessibilityRole="header">Pledges</Text>
        {pledgesState.kind !== "ready" ? (
          <LoadStateView state={pledgesState} emptyTitle="No pledges yet." onRetry={retry} />
        ) : (
          (pledges ?? []).map((p) => {
            const pChip = pledgeStatusChip(p.status, p.cancel_reason);
            const when = pledgeWhen(p.decided_at ?? p.created_at);
            const head = p.status === "delivered"
              ? `Received ${quantityLabel(p.quantity_received ?? p.quantity, unit)}`
              : `Pledged ${quantityLabel(p.quantity, unit)}`;
            return (
              <Card key={p.pledge_id} style={styles.pledgeCard}>
                <View style={[styles.row, large && styles.rowLarge]}>
                  <Text style={[styles.pledger, large && styles.pledgerLarge]}>{p.pledger_name}</Text>
                  <Chip tone={CHIP_TONE[pChip.tone]} dot={false} label={pChip.label} />
                </View>
                <Text style={styles.meta}>{when ? `${head} · ${when}` : head}</Text>
                {p.note ? <Text style={styles.note}>“{p.note}”</Text> : null}
                {p.status === "pledged" && actions.receive ? (
                  <Button size="small" label="Mark received" style={styles.receiveBtn} onPress={() => startReceive(p)} />
                ) : null}
              </Card>
            );
          })
        )}
      </ScrollView>

      <ConfirmModal
        visible={receiving !== null}
        title="Mark received?"
        body={receiving ? `${receiving.pledger_name} pledged ${quantityLabel(receiving.quantity, unit)}. How many actually arrived?` : ""}
        confirmLabel={busy ? "Confirming…" : "Confirm received"}
        onConfirm={doReceive}
        onCancel={() => { if (!busy) setReceiving(null); }}
      >
        <QuantityStepper value={recvQty} onChange={setRecvQty} style={styles.stepper}
          decreaseLabel="Decrease quantity received" increaseLabel="Increase quantity received" />
        <Text style={styles.preview} accessibilityLiveRegion="polite">
          {receivedPreview(need.quantity_received, need.quantity_needed, recvQty, unit)}
        </Text>
        <Text style={styles.irreversible}>Can't be undone — confirm only what's actually arrived.</Text>
      </ConfirmModal>

      <ConfirmModal
        visible={completing}
        title="Mark this need complete?"
        body={completeNeedBody(openPledges, need.status)}
        confirmLabel={busy ? "Completing…" : "Mark complete"}
        tone="danger"
        onConfirm={doComplete}
        onCancel={() => { if (!busy) setCompleting(false); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 60 },
  summary: { padding: 18 },
  progress: { flex: 1, color: colors.teal, ...typography.subtitle, fontWeight: "700" },
  description: { marginTop: 10, color: colors.ink, ...typography.body },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 16 },
  staleBox: { marginTop: 4 },
  staleRetry: { marginTop: 10 },
  error: { marginTop: 14, color: colors.danger, ...typography.meta, fontWeight: "600" },
  sectionTitle: { marginTop: 28, marginBottom: 12, color: colors.ink, ...typography.section },
  pledgeCard: { marginBottom: 12, padding: 18 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  // large: stacked. The base `pledger` is `flex: 1`, which survives in a style array and would collapse the text in a column.
  rowLarge: { flexDirection: "column", alignItems: "flex-start", gap: 10 },
  pledgerLarge: { flex: 0, alignSelf: "stretch", flexGrow: 0, flexBasis: "auto" },
  pledger: { flex: 1, color: colors.ink, ...typography.subtitle, fontWeight: "800" },
  meta: { marginTop: 8, color: colors.muted, ...typography.body },
  note: { marginTop: 8, color: colors.ink, ...typography.body, fontStyle: "italic" },
  receiveBtn: { marginTop: 14 },
  // Centred in the dialog; the control's own geometry lives in QuantityStepper.
  stepper: { alignSelf: "center", marginTop: 18 },
  preview: { marginTop: 14, color: colors.teal, ...typography.strong, fontWeight: "700", textAlign: "center" },
  irreversible: { marginTop: 8, color: colors.muted, ...typography.meta, lineHeight: 20, textAlign: "center" }
});
