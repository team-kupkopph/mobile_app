// Adoption · one applicant, from the poster's side (spec 2026-10-06 §2; artboard
// design/mobile-v3/Applicant.dc.html). Renders from GET /inquiries/{id}'s poster tier alone —
// no listing fetch, so an AD16-hidden listing never blanks it. Every decision is a pure helper
// in ../applicant.ts; this file only lays them out.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { PosterInquiry } from "../api/types";
import { useApi } from "../api/useApi";
import {
  ApplicantFooter, CHANGED_NOTE, FooterAction, actionPath, applicantFooter, applicantRefusal, askedAgo,
  confirmCopy, firstName, petName, posterLadderHeader
} from "../applicant";
import { STAGE_ORDER, STAGE_STEP, ladderStageTone, stageMeta } from "../adoption";
import { ConfirmModal } from "../components/ConfirmModal";
import { LoadStateView } from "../components/LoadStateView";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { DeclineSheet } from "../components/applicant/DeclineSheet";
import { StepSheet } from "../components/applicant/StepSheet";
import { Avatar, Button, Card, Chip, ScreenHeader } from "../components/ui";
import { loadState } from "../net";
import { RootStackParamList } from "../navigation/types";
import { TAP_SLOP } from "../touch";
import { colors, radii, spacing, typography } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "applicant">;
type Pending = FooterAction | "release";

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("");
}

export function ApplicantScreen({ navigation, route }: Props) {
  const api = useApi();
  const { inquiryId } = route.params;
  const [row, setRow] = useState<PosterInquiry | null>(null);
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Pending | null>(null);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [stepKey, setStepKey] = useState<string | null>(null);

  const load = useCallback(() => {
    api.get(`/inquiries/${inquiryId}`).then((r) => {
      setRes({ ok: r.ok, status: r.status });
      if (!r.ok) return;
      if (r.data?.viewer === "adopter") { navigation.replace("inquiry", { inquiryId }); return; }
      setRow(r.data as PosterInquiry);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus
  }, [inquiryId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function send(path: string, body: object = {}) {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    const r = await api.post(`/inquiries/${inquiryId}/${path}`, body);
    setBusy(false);
    if (!r.ok) {
      const name = firstName(row?.adopter.display_name ?? "");
      const kind = applicantRefusal(r.data?.error?.code);
      if (kind === "phone") {
        Alert.alert("Add a phone number first", `So ${name} can reach you.`, [
          { text: "Not now", style: "cancel" },
          { text: "Verify phone", onPress: () => navigation.navigate("verifyPhone") }
        ]);
      } else if (kind === "badge") {
        setNotice(`We've asked ${name} to get verified.`);
      } else if (kind === "changed") {
        setNotice(CHANGED_NOTE);
      } else {
        Alert.alert("Couldn't do that", "Try again.");
      }
    }
    load();
  }

  function onPrimary(action: FooterAction) {
    if (action === "askVerify") { void send(actionPath(action)); return; }
    setConfirm(action);
  }

  if (!row) {
    return (
      <View style={styles.screen} testID="screen.applicant">
        <ScreenBackdrop />
        <ScreenHeader title="Applicant" onBack={() => navigation.goBack()} />
        <LoadStateView state={loadState(res)} subject="applicant" onRetry={load} onBack={() => navigation.goBack()} />
      </View>
    );
  }

  const footer: ApplicantFooter = applicantFooter(row);
  const header = posterLadderHeader(row);
  const pet = petName(row);
  const name = row.adopter.display_name;
  const open = row.status === "active";
  const canMove = open && row.kind !== "placement" && !!row.accepted_at;
  const byKey = new Map(row.stages.map((s) => [s.stage_key, s]));
  const confirmText = confirm ? confirmCopy(confirm, row) : null;

  return (
    <View style={styles.screen} testID="screen.applicant">
      <ScreenBackdrop />
      <ScreenHeader title="Applicant" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.card} testID="card.applicant.adopter">
          <View style={styles.personRow}>
            <Avatar initials={initials(name)} size={52} />
            <View style={styles.personText}>
              <Text style={styles.name} numberOfLines={1}>{name}</Text>
              {row.adopter.city ? <Text style={styles.meta}>{row.adopter.city}</Text> : null}
            </View>
            {row.adopter.verified_member ? <Chip label="Verified Member" tone="info" dot={false} /> : null}
          </View>
          <Text style={styles.forLine}>For {pet}{row.created_at ? ` · asked ${askedAgo(row.created_at, new Date())}` : ""}</Text>
        </Card>

        {row.message ? (
          <Card style={[styles.card, styles.quote]} testID="card.applicant.message">
            <Text style={styles.body}>“{row.message}”</Text>
          </Card>
        ) : null}

        {open || row.status === "adopted" ? (
          <Card style={styles.card} testID="card.applicant.contact">
            <Text style={styles.label}>Contact</Text>
            {row.adopter_contact ? (
              row.adopter_contact.phone ? (
                <View style={styles.contactRow}>
                  <Text style={styles.phone} testID="text.applicant.phone">{row.adopter_contact.phone}</Text>
                  <Button label="Call" size="small" variant="secondary" testID="btn.applicant.call"
                    accessibilityLabel={`Call ${name}`}
                    onPress={() => { void Linking.openURL(`tel:${row.adopter_contact?.phone ?? ""}`); }} />
                </View>
              ) : (
                <Text style={styles.meta}>They haven&apos;t verified a phone number yet.</Text>
              )
            ) : (
              <Text style={styles.meta} testID="text.applicant.contactLocked">
                Their phone number appears once you accept them for screening.
              </Text>
            )}
          </Card>
        ) : null}

        <Card style={styles.card}>
          <View style={styles.stepsHead}>
            <Text style={styles.label}>Steps</Text>
            {header ? <Chip label={header.label} tone={header.tone} dot={false} /> : null}
          </View>
          {STAGE_ORDER.map((key) => {
            const stage = byKey.get(key);
            const st = stage?.state ?? "not_started";
            const tappable = canMove && key !== "inquiry";
            const tone = ladderStageTone(st, !open);
            return (
              <TouchableOpacity key={key} hitSlop={TAP_SLOP} accessibilityRole="button"
                accessibilityState={{ disabled: !tappable }} testID={`row.applicant.${key}`}
                style={styles.stepRow} onPress={tappable ? () => setStepKey(key) : undefined}>
                <View style={[styles.stepDot, tone === "done" && styles.stepDone, tone === "active" && styles.stepActive]} />
                <Text style={styles.stepTitle}>{STAGE_STEP[key].title}</Text>
                <Text style={styles.stepMeta}>{stageMeta(st, stage?.updated_at)}</Text>
              </TouchableOpacity>
            );
          })}
          {open && row.kind !== "placement" && !row.accepted_at ? (
            <Text style={styles.hint} testID="text.applicant.stepsHint">Accept them for screening to start the steps.</Text>
          ) : null}
        </Card>

        {footer.doneNote ? (
          <Card style={styles.card} testID="card.applicant.done">
            <Text style={styles.body}>{footer.doneNote}</Text>
          </Card>
        ) : null}
        {notice || footer.note ? (
          <Text style={styles.note} testID="text.applicant.note">{notice ?? footer.note}</Text>
        ) : null}
        {footer.primary ? (
          <Button label={footer.primary.label} loading={busy} testID="btn.applicant.primary"
            onPress={() => onPrimary(footer.primary!.action)} style={styles.primary} />
        ) : null}
        {footer.secondary.includes("release") ? (
          <Button label="Release reservation" variant="secondary" testID="btn.applicant.release"
            onPress={() => setConfirm("release")} style={styles.secondary} />
        ) : null}
        {footer.secondary.includes("decline") ? (
          <TouchableOpacity hitSlop={TAP_SLOP} accessibilityRole="button" testID="btn.applicant.decline"
            style={styles.declineLink} onPress={() => setDeclineOpen(true)}>
            <Text style={styles.declineLabel}>Decline applicant</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      <ConfirmModal visible={!!confirm} title={confirmText?.title ?? ""} body={confirmText?.body ?? ""}
        confirmLabel={confirmText?.confirmLabel ?? "OK"} tone={confirmText?.tone}
        onConfirm={() => { const a = confirm!; setConfirm(null); void send(actionPath(a)); }}
        onCancel={() => setConfirm(null)} />
      <DeclineSheet visible={declineOpen} name={firstName(name)} busy={busy}
        onDecline={(reason) => { setDeclineOpen(false); void send("reject", { reason }); }}
        onClose={() => setDeclineOpen(false)} />
      <StepSheet stageKey={stepKey} state={stepKey ? byKey.get(stepKey)?.state ?? "not_started" : ""}
        name={firstName(name)} pet={pet} busy={busy}
        onMove={(state, note) => { const k = stepKey!; setStepKey(null); void send(`stages/${k}`, note ? { state, note } : { state }); }}
        onClose={() => setStepKey(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 48 },
  card: { marginTop: 14, padding: spacing.lg },
  quote: { backgroundColor: colors.soft },
  personRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  personText: { flex: 1 },
  name: { color: colors.ink, ...typography.title },
  meta: { marginTop: 3, color: colors.muted, ...typography.meta },
  forLine: { marginTop: 12, color: colors.muted, ...typography.meta, fontWeight: "700" },
  body: { color: colors.ink, ...typography.body },
  label: { color: colors.muted, ...typography.label },
  contactRow: { marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  phone: { color: colors.ink, ...typography.subtitle, fontWeight: "800" },
  stepsHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  stepRow: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 12 },
  stepDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.border },
  stepDone: { backgroundColor: colors.teal },
  stepActive: { backgroundColor: colors.tealBright },
  stepTitle: { flex: 1, color: colors.ink, ...typography.strong },
  stepMeta: { color: colors.muted, ...typography.meta },
  hint: { marginTop: 8, color: colors.muted, ...typography.meta },
  note: { marginTop: 18, padding: 14, borderRadius: radii.notice, backgroundColor: colors.warningBg, color: colors.warningStrong, ...typography.meta, fontWeight: "700" },
  primary: { marginTop: 18 },
  secondary: { marginTop: 12 },
  declineLink: { alignSelf: "center", marginTop: 14, minHeight: 44, justifyContent: "center", paddingHorizontal: 16 },
  declineLabel: { color: colors.danger, ...typography.strong, fontWeight: "700" }
});
