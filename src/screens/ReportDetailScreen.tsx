// US-S5 · report detail (city-level, public shared-link) + Track K/O — claim it, offer
// help, or (if you're the reporter) see the waiting view. Reference:
// screens/user/screen-report-detail.png (+ -waiting, -unclaimed).
// GET /reports/{id}; POST /reports/{id}/claim; POST /reports/{id}/close (S11).
//
// Sagip loop closure (dev/sagip-build-review.md): the reporter sees who has it, each step
// with its note, and how it ended (S10), can close a report that no longer needs anyone
// (S11), and is told only how many people escalation actually reached (S5). A claimer
// reading their own report finds their case and its deadline (S27 · S9).
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MapView, { Circle, Marker } from "react-native-maps";

import { ReportDetail, StrayStatus } from "../api/types";
import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { RootStackParamList } from "../navigation/types";
import {
  CLOSE_REASONS, CloseReason, OFFER_TYPE_LABEL, claimDeadline, escalationLines, historyNote,
  offersShareContact, relTime, sagipTitle, strayChip
} from "../sagip";
import { ContactShareRow } from "../components/sagip/ContactShareRow";
import { RescuePeople } from "../components/sagip/RescuePeople";
import { colors, elevation, radii, spacing, typography } from "../theme";
import { Button, ScreenHeader } from "../components/ui";
import { TAP_SLOP } from "../touch";

const TONE = {
  amber: { bg: colors.warningBg, fg: colors.warningStrong }, teal: { bg: colors.infoBg, fg: colors.tealDark },
  green: { bg: colors.successBg, fg: colors.success }, grey: { bg: colors.greyPill, fg: colors.muted }
} as const;
const LADDER: StrayStatus[] = ["reported", "claimed", "rescued", "resolved"];
const LADDER_LABEL: Record<StrayStatus, string> = {
  reported: "Reported", claimed: "Claimed", rescued: "Rescued", safe: "Safe", resolved: "Resolved"
};

type Props = NativeStackScreenProps<RootStackParamList, "reportDetail">;

export function ReportDetailScreen({ navigation, route }: Props) {
  const api = useApi();
  const [report, setReport] = useState<ReportDetail | null>(null);
  // US-R4 · "{X} not found." was shown for EVERY failure, not just a missing row — so
  // someone offline, or hitting a 500, was told the thing does not exist. R2's `gone`
  // is what actually means "not found" (404/403); everything else keeps its own words
  // and a retry that can work.
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);

  const [claiming, setClaiming] = useState(false);
  // S11 · the reason list is shown inline (four choices is too many for a native alert on
  // Android, which caps at three buttons), only after the reporter asks for it.
  const [closing, setClosing] = useState(false);
  const [closeBusy, setCloseBusy] = useState(false);
  const [consentBusy, setConsentBusy] = useState(false);

  const load = useCallback(() => {
    setRes(null);
    api.get(`/reports/${route.params.reportId}`).then((r) => {
      setRes({ ok: r.ok, status: r.status });
      if (r.ok) setReport(r.data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus
  }, [route.params.reportId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function confirmClaim() {
    // The exclusivity warning appears before the tap commits to anything — claiming is
    // final, there's no release once it lands.
    Alert.alert(
      "Claiming is final",
      "It's locked to you and can't be handed back. Only claim if you're actually going.",
      [
        { text: "Not yet", style: "cancel" },
        { text: "Claim this case", style: "default", onPress: claim }
      ]
    );
  }

  async function claim() {
    if (claiming) return;
    setClaiming(true);
    const res = await api.post(`/reports/${route.params.reportId}/claim`);
    setClaiming(false);
    if (res.ok) {
      navigation.replace("rescueUpdate", { caseId: res.data.case_id, reportId: route.params.reportId });
      return;
    }
    const code = res.data?.error?.code;
    if (code === "already_claimed") {
      Alert.alert("Someone else got there first", "This report was just claimed by another rescuer.");
      load();
      return;
    }
    if (res.status === 403) {
      Alert.alert(
        "Get verified to claim",
        "Claiming needs a Verified Member badge or a verified shelter account.",
        [{ text: "Not now", style: "cancel" }, { text: "Get verified", onPress: () => navigation.navigate("memberUpgrade") }]
      );
      return;
    }
    Alert.alert("Couldn't claim this case", res.data?.error?.message ?? "Try again.");
  }

  // D1 · the reporter's own consent, and a helper's across all their offers on this report.
  async function setConsent(paths: string[], share: boolean) {
    if (consentBusy || paths.length === 0) return;
    setConsentBusy(true);
    const results = await Promise.all(paths.map((p) => api.post(p, { share })));
    setConsentBusy(false);
    const failed = results.find((r) => !r.ok);
    if (failed) {
      Alert.alert("Couldn't update that", failed.data?.error?.code === "anonymous_report"
        ? "Anonymous reports don't share contact details."
        : failed.data?.error?.message ?? "Try again.");
    }
    load();
  }

  async function closeReport(reason: CloseReason) {
    if (closeBusy) return;
    setCloseBusy(true);
    const res = await api.post(`/reports/${route.params.reportId}/close`, { reason });
    setCloseBusy(false);
    if (res.ok) {
      setClosing(false);
      load();
      return;
    }
    Alert.alert(
      "Couldn't close this report",
      res.data?.error?.code === "report_not_open"
        ? "A rescuer has already claimed it — they're on the way."
        : res.data?.error?.message ?? "Try again."
    );
    load();
  }

  const chip = report ? strayChip(report.status) : null;
  const activeIdx = report ? LADDER.indexOf(report.status === "safe" ? "rescued" : report.status) : -1;
  // Present only when the caller IS this report's reporter (US-O3) — the backend omits
  // these fields entirely for anyone else, so their presence alone is the signal.
  const isReporterView = report?.status_history !== undefined;
  // Present only for the report's ACTIVE claimer (S27) — same presence-is-the-signal rule.
  const myCase = report?.my_case;
  const deadline = claimDeadline(myCase?.claim_due_at);

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Report"
        onBack={() => navigation.goBack()}
        right={report ? (
          <TouchableOpacity
            style={styles.flagLink}
            hitSlop={TAP_SLOP}
            onPress={() => navigation.navigate("reportContent",
              { targetType: "report", targetId: report.report_id })}
          >
            <Text style={styles.flagLinkText}>Report this</Text>
          </TouchableOpacity>
        ) : null}
      />

      {!report ? (
        <LoadStateView state={loadState(res)} subject="report" onRetry={load} />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {report.photos.length > 0 ? (
            <Image source={{ uri: report.photos[0] }} style={styles.photo} resizeMode="cover" />
          ) : null}

          <Text style={styles.h1}>{sagipTitle(report.species, report.condition)}</Text>
          <Text style={styles.sub}>
            {(report.city ? report.city + " · " : "") + "reported " + relTime(report.reported_at)}
          </Text>
          {chip ? (
            <View style={[styles.chip, { backgroundColor: TONE[chip.tone].bg }]}>
              <Text style={[styles.chipText, { color: TONE[chip.tone].fg }]}>{chip.label}</Text>
            </View>
          ) : null}

          {isReporterView && report.claimer && report.status !== "reported" ? (
            <Text style={styles.claimedBy}>Claimed by {report.claimer.display_name}</Text>
          ) : null}

          {report.notes ? (
            <View style={styles.notesCard}>
              <Text style={styles.notesText}>{report.notes}</Text>
            </View>
          ) : null}

          {/* US-L3 · the reporter's entry into possible lost<->found matches (matches are
              reporter-gated server-side; only show the row on the reporter's own lost/found report). */}
          {isReporterView && (report.report_type === "lost" || report.report_type === "found") ? (
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.matchesRow}
              onPress={() => navigation.navigate("reportMatches", { reportId: report.report_id })}
            >
              <Text style={styles.matchesLabel}>Possible matches</Text>
              <Text style={styles.matchesChevron}>›</Text>
            </TouchableOpacity>
          ) : null}

          {/* US-SEC1 — precise_location only ever appears here when the backend has
              already decided the caller may see it (reporter or active claimer); this
              screen just renders whichever field is present, it doesn't re-derive access. */}
          <View style={styles.mapWrap}>
            <MapView
              style={styles.map}
              pointerEvents="none"
              initialRegion={{
                latitude: (report.precise_location ?? report.approx_location).lat,
                longitude: (report.precise_location ?? report.approx_location).lng,
                latitudeDelta: 0.01, longitudeDelta: 0.01
              }}
            >
              {report.precise_location ? (
                <Marker coordinate={{ latitude: report.precise_location.lat, longitude: report.precise_location.lng }} />
              ) : (
                <Circle
                  center={{ latitude: report.approx_location.lat, longitude: report.approx_location.lng }}
                  radius={500}
                  strokeColor="rgba(28,107,107,0.9)"
                  fillColor="rgba(28,107,107,0.15)"
                  strokeWidth={2}
                />
              )}
            </MapView>
          </View>
          <Text style={styles.mapNote}>
            {report.precise_location
              ? "Exact spot — shown to you because you reported this or claimed it."
              : "Approximate area only · the exact spot goes to the reporter and whoever claims this."}
          </Text>
          {/* S8 · the landmark the reporter typed — sent only where the exact pin is. */}
          {report.location_text ? (
            <Text style={styles.landmark}>Near: {report.location_text}</Text>
          ) : null}

          {isReporterView && report.status === "reported" ? (
            <View style={styles.waitingCard}>
              <Text style={styles.waitingLine}>
                {(report.offers_count ?? 0) === 0
                  // S28 · was "you'd be on your own for this one", which read as if the
                  // reporter had to do the rescue — and now sits right above a line saying
                  // how many rescuers were alerted (D2).
                  ? "No one has offered help yet."
                  : `${report.offers_count} ${report.offers_count === 1 ? "person has" : "people have"} offered to help.`}
              </Text>
              {/* S5 · only what the server counted — never "notified" on faith. */}
              {escalationLines(report.escalation_level, report.escalation_notified).map((line) => (
                <Text key={line} style={styles.waitingSub}>{line}</Text>
              ))}
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>Status</Text>
          {isReporterView && report.status_history && report.status_history.length > 0 ? (
            <View style={styles.ladder}>
              {report.status_history.map((h, i) => {
                const note = historyNote(h.note);
                return (
                  <View key={i} style={styles.ladderRow}>
                    <View style={[styles.ladderDot, styles.ladderDotDone]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.ladderLabel, styles.ladderLabelDone]}>
                        {LADDER_LABEL[h.status]} · {relTime(h.changed_at)}
                      </Text>
                      {note ? <Text style={styles.ladderNote}>{note}</Text> : null}
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.ladder}>
              {LADDER.map((s, i) => {
                const done = i <= activeIdx;
                return (
                  <View key={s} style={styles.ladderRow}>
                    <View style={[styles.ladderDot, done && styles.ladderDotDone]} />
                    <Text style={[styles.ladderLabel, done && styles.ladderLabelDone]}>{LADDER_LABEL[s]}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* S10 · how it ended, from the claimer's outcome screen. */}
          {isReporterView && report.outcome ? (
            <View style={styles.outcomeCard} testID="card.reportDetail.outcome">
              <Text style={styles.outcomeTitle}>How it ended</Text>
              {report.outcome.photo_url ? (
                <Image source={{ uri: report.outcome.photo_url }} style={styles.outcomePhoto} resizeMode="cover" />
              ) : null}
              {report.outcome.notes ? <Text style={styles.outcomeNotes}>{report.outcome.notes}</Text> : null}
              <Text style={styles.outcomeMeta}>Resolved {relTime(report.outcome.resolved_at)}</Text>
            </View>
          ) : null}

          {/* D1 + D8 · the other people on this rescue, once it's claimed. */}
          {report.people ? <RescuePeople people={report.people} /> : null}

          {/* D1 · the reporter's own consent. Disabled for an anonymous report (D8). */}
          {isReporterView && report.status !== "resolved" ? (
            <ContactShareRow
              label="Let the rescuer contact me"
              hint={report.is_anonymous
                ? "This report is anonymous, so your contact details can't be shared."
                : "Shares your phone and email with whoever claims this, only once they have."}
              value={!!report.contact_shared}
              disabled={!!report.is_anonymous || consentBusy}
              onValueChange={(share) => setConsent([`/reports/${report.report_id}/contact`], share)}
              testID="switch.reportDetail.shareContact"
            />
          ) : null}

          {/* D1 · a helper's own offers here, with one switch for their contact. */}
          {report.my_offers && report.my_offers.length > 0 && report.status !== "resolved" ? (
            <>
              <Text style={styles.myOffers}>
                You offered {report.my_offers.map((o) => OFFER_TYPE_LABEL[o.offer_type].toLowerCase()).join(" and ")}.
              </Text>
              <ContactShareRow
                label="Let the rescuer contact me"
                hint="Shares your phone and email with whoever claims this, only once they have."
                value={offersShareContact(report.my_offers)}
                disabled={consentBusy}
                onValueChange={(share) => setConsent(report.my_offers!.map(
                  (o) => `/reports/${report.report_id}/offers/${o.offer_id}/contact`), share)}
                testID="switch.reportDetail.offerShareContact"
              />
            </>
          ) : null}

          {/* S11 · a report that no longer needs anyone can be closed while it's unclaimed. */}
          {isReporterView && report.status === "reported" ? (
            closing ? (
              <View style={styles.closeCard}>
                <Text style={styles.closeTitle}>Why doesn't it need a rescuer?</Text>
                {CLOSE_REASONS.map((r) => (
                  <TouchableOpacity
                    key={r.key}
                    style={styles.closeOption}
                    activeOpacity={0.85}
                    disabled={closeBusy}
                    accessibilityRole="button"
                    onPress={() => closeReport(r.key)}
                  >
                    <Text style={styles.closeOptionText}>{r.label}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={styles.closeCancel}
                  accessibilityRole="button"
                  onPress={() => setClosing(false)}
                >
                  <Text style={styles.closeCancelText}>Keep it open</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.closeLink}
                accessibilityRole="button"
                testID="btn.reportDetail.close"
                onPress={() => setClosing(true)}
              >
                <Text style={styles.closeLinkText}>It doesn't need a rescuer anymore</Text>
              </TouchableOpacity>
            )
          ) : null}

          {/* S27 · the claimer's way back to their case, with its deadline (S9). */}
          {myCase ? (
            <View style={styles.actionRow}>
              {deadline ? (
                <Text style={[styles.deadline, deadline.urgent && styles.deadlineUrgent]}>{deadline.text}</Text>
              ) : null}
              <Button
                label="Open your case"
                testID="btn.reportDetail.openCase"
                onPress={() => navigation.navigate("rescueUpdate", { caseId: myCase.case_id, reportId: report.report_id })}
              />
            </View>
          ) : null}

          {!isReporterView && !myCase && report.status === "reported" ? (
            <View style={styles.actionRow}>
              <Button label="Claim this case" onPress={confirmClaim} loading={claiming} />
              <Text style={styles.claimFine}>
                Claiming is final — it's locked to you and can't be handed back.
              </Text>
              <TouchableOpacity
                style={styles.offerBtn}
                activeOpacity={0.85}
                onPress={() => navigation.navigate("rescueOffer", { reportId: report.report_id })}
              >
                <Text style={styles.offerBtnText}>Can't go? Offer help instead</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const card = {
  backgroundColor: colors.white, ...elevation.soft
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  flagLink: { marginLeft: "auto" },
  flagLinkText: { color: colors.muted, ...typography.meta, fontWeight: "700" },
  content: { paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 60 },
  photo: { width: "100%", height: 200, borderRadius: radii.card, marginBottom: 18, backgroundColor: colors.border },
  h1: { color: colors.ink, ...typography.display },
  sub: { marginTop: 8, color: colors.muted, ...typography.subtitle },
  chip: { marginTop: 14, alignSelf: "flex-start", paddingHorizontal: 14, height: 30, borderRadius: 15, justifyContent: "center" },
  chipText: { ...typography.meta, fontWeight: "800" },
  notesCard: { marginTop: 20, padding: 18, borderRadius: radii.tile, ...card },
  notesText: { color: colors.ink, ...typography.body },
  matchesRow: { marginTop: 16, paddingHorizontal: 18, height: 62, borderRadius: radii.tile, flexDirection: "row", alignItems: "center", justifyContent: "space-between", ...card },
  matchesLabel: { color: colors.teal, ...typography.subtitle, fontWeight: "800" },
  matchesChevron: { color: colors.muted, fontSize: 19, fontWeight: "700" },
  mapWrap: { marginTop: 20, height: 160, borderRadius: radii.field, overflow: "hidden", backgroundColor: colors.soft },
  map: { ...StyleSheet.absoluteFillObject },
  mapNote: { marginTop: 8, color: colors.muted, ...typography.meta, lineHeight: 17 },
  landmark: { marginTop: 6, color: colors.ink, ...typography.meta, fontWeight: "700", lineHeight: 17 },
  myOffers: { marginTop: 24, color: colors.ink, ...typography.subtitle, fontWeight: "700" },
  claimedBy: { marginTop: 10, color: colors.tealDark, ...typography.subtitle, fontWeight: "700" },
  ladderNote: { marginTop: 2, color: colors.muted, ...typography.meta, lineHeight: 17 },
  outcomeCard: { marginTop: 10, padding: 18, borderRadius: radii.tile, ...card },
  outcomeTitle: { color: colors.ink, ...typography.section },
  outcomePhoto: { marginTop: 12, width: "100%", height: 180, borderRadius: radii.tile, backgroundColor: colors.border },
  outcomeNotes: { marginTop: 12, color: colors.ink, ...typography.body },
  outcomeMeta: { marginTop: 8, color: colors.muted, ...typography.meta },
  closeLink: { marginTop: 24, minHeight: 44, alignItems: "center", justifyContent: "center" },
  closeLinkText: { color: colors.muted, ...typography.subtitle, fontWeight: "700", textDecorationLine: "underline" },
  closeCard: { marginTop: 24, padding: 18, borderRadius: radii.tile, ...card },
  closeTitle: { color: colors.ink, ...typography.subtitle, fontWeight: "800", marginBottom: 8 },
  closeOption: { minHeight: 48, justifyContent: "center", borderTopWidth: 1, borderTopColor: colors.border },
  closeOptionText: { color: colors.ink, ...typography.subtitle },
  closeCancel: { minHeight: 48, justifyContent: "center", alignItems: "center", marginTop: 4 },
  closeCancelText: { color: colors.teal, ...typography.subtitle, fontWeight: "700" },
  deadline: { marginBottom: 12, color: colors.tealDark, ...typography.meta, lineHeight: 18, textAlign: "center" },
  deadlineUrgent: { color: colors.warningStrong, fontWeight: "800" },
  waitingCard: { marginTop: 20, padding: 18, borderRadius: radii.tile, backgroundColor: colors.infoBg },
  waitingLine: { color: colors.tealDark, ...typography.subtitle, fontWeight: "700" },
  waitingSub: { marginTop: 6, color: colors.tealDark, ...typography.meta },
  sectionTitle: { marginTop: 26, marginBottom: 14, color: colors.ink, ...typography.section },
  ladder: { paddingLeft: 4 },
  ladderRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 },
  ladderDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.border },
  ladderDotDone: { backgroundColor: colors.teal },
  ladderLabel: { color: colors.muted, ...typography.subtitle },
  ladderLabelDone: { color: colors.ink, fontWeight: "700" },
  actionRow: { marginTop: 30 },
  claimFine: { marginTop: 10, color: colors.muted, ...typography.meta, lineHeight: 18, textAlign: "center" },
  offerBtn: { marginTop: 16, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.teal },
  offerBtnText: { color: colors.teal, ...typography.subtitle, fontWeight: "700" }
});
