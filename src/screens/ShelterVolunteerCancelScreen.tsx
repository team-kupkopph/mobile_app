// US-V9 · cancel an activity — the shelter side, and heavier than the volunteer's own cancel
// (KawangGawaCancelScreen): this one stands other people up, so the confirm copy must NAME the
// blast radius before the shelter commits. Reference: screens/user/screen-shelter-volunteer-
// cancel(-confirm).png. POST /shelter/shifts/{shiftId}/cancel (ShelterShiftCancelView) cascades
// server-side — it cancels every REQUESTED + APPROVED signup in one transaction and returns the
// authoritative `cancelled_signups` count. That count is only known AFTER the call, so the
// pre-confirm count shown in the ConfirmModal is derived client-side from two reads: the roster
// (GET /shelter/shifts/{shiftId}/roster — approved/completed/no_show rows; only `approved` ones
// are still live) and the pending requests (GET /shelter/shifts/{shiftId}/requests — REQUESTED
// rows). affected = approved + pending. The result screen always reflects the server's own
// `cancelled_signups`, never this pre-count — the two normally agree, but the server value is
// the source of truth if a signup changed state between the two reads and the cancel call.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { AlertIcon, CheckIcon, VolunteerIcon } from "../components/AppIcons";
import { ConfirmModal } from "../components/ConfirmModal";
import { RootStackParamList } from "../navigation/types";
import { ShelterShift, blastRadiusCopy } from "../shelterVolunteer";
import { shiftTypeLabel } from "../volunteer";
import { TAP_SLOP } from "../touch";
import { colors, elevation, radii, spacing, squircle, typography } from "../theme";
import { Avatar, Button, ScreenHeader } from "../components/ui";

function shiftWhenLabel(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const date = start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const startTime = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const endTime = end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date} · ${startTime}–${endTime}`;
}

type RosterRow = { status: "approved" | "completed" | "no_show" };

type Phase = "review" | "submitting" | "done";

type Props = NativeStackScreenProps<RootStackParamList, "shelterVolunteerCancel">;

export function ShelterVolunteerCancelScreen({ navigation, route }: Props) {
  const api = useApi();
  const { shiftId } = route.params;

  const [shift, setShift] = useState<ShelterShift | null>(null);
  const [affected, setAffected] = useState<number | null>(null);
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);

  const [phase, setPhase] = useState<Phase>("review");
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [cancelledSignups, setCancelledSignups] = useState(0);

  const load = useCallback(() => {
    Promise.all([
      api.get(`/shelter/shifts/${shiftId}`),
      api.get(`/shelter/shifts/${shiftId}/roster`),
      api.get(`/shelter/shifts/${shiftId}/requests`)
    ]).then(([shiftRes, rosterRes, requestsRes]) => {
      // ⚠️ ALL-OR-NOTHING, AND THAT INVERTS US-R2's MULTI-FETCH RULE ON PURPOSE.
      //
      // Elsewhere a failed secondary degrades its own panel and the screen still renders.
      // Here the secondaries ARE the answer: `affected` is the blast radius printed directly
      // above a destructive confirm. Rendering with a failed roster would tell a shelter
      // admin "0 volunteers signed up" about an activity twelve people have arranged their
      // Saturday around — and then take the cancel.
      //
      // So the worst of the three decides the state. 404 on the shift still resolves to
      // `gone` through loadState, which is where the old hand-rolled `notFound` branch went.
      const worst = [shiftRes, rosterRes, requestsRes].find((r) => !r.ok) ?? shiftRes;
      setRes({ ok: worst.ok, status: worst.status });
      if (!worst.ok) return;
      const approved = (rosterRes.data?.results ?? []).filter(
        (r: RosterRow) => r.status === "approved"
      ).length;
      const pending = (requestsRes.data?.results ?? []).length;
      setShift(shiftRes.data);
      setAffected(approved + pending);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus
  }, [shiftId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function onConfirm() {
    setConfirmVisible(false);
    setPhase("submitting");
    setBanner(null);
    const res = await api.post(`/shelter/shifts/${shiftId}/cancel`);
    if (!res.ok) {
      const code = res.data?.error?.code;
      if (res.status === 409 && code === "shift_closed") {
        setBanner("This activity is already closed.");
      } else if (res.status === 403 && code === "not_your_shift") {
        setBanner("You don't have permission to cancel this activity.");
      } else if (res.status === 404) {
        setBanner("This activity no longer exists.");
      } else {
        setBanner(res.data?.error?.message ?? "Couldn't cancel this activity. Try again.");
      }
      setPhase("review");
      return;
    }
    setCancelledSignups(res.data?.cancelled_signups ?? 0);
    setPhase("done");
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Cancel activity" onBack={() => navigation.goBack()} align="center" />

      {phase === "done" ? (
        <View style={styles.content}>
          <View style={[styles.iconCircle, { backgroundColor: colors.successBg }]}>
            <CheckIcon color={colors.success} size={32} />
          </View>
          <Text style={styles.heading}>Activity cancelled</Text>
          <Text style={styles.subheading}>
            {cancelledSignups} volunteer{cancelledSignups === 1 ? "" : "s"} notified.
          </Text>
          <Button
            label="Back to activities"
            onPress={() => navigation.navigate("shelterVolunteer")}
            style={styles.primaryButton}
          />
        </View>
      ) : phase === "submitting" ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={colors.teal} />
        </View>
      ) : !shift || affected === null ? (
        <LoadStateView state={loadState(res)} subject="activity" onRetry={load}
          onBack={() => navigation.goBack()} />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.summaryCard}>
            <Avatar size={48}>
              <VolunteerIcon color={colors.teal} size={26} />
            </Avatar>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryTitle}>{shiftTypeLabel(shift.type)}</Text>
              <Text style={styles.summaryWhen}>{shiftWhenLabel(shift.starts_at, shift.ends_at)}</Text>
              <Text style={styles.summarySub}>
                {affected} volunteer{affected === 1 ? "" : "s"} signed up
              </Text>
            </View>
          </View>

          <Text style={styles.question}>Cancel this activity?</Text>
          <Text style={styles.body}>{blastRadiusCopy(affected)}</Text>

          {!!banner && (
            <View style={styles.bannerBox}>
              <Text style={styles.bannerText}>{banner}</Text>
            </View>
          )}

          <Button
            label="Cancel activity"
            onPress={() => setConfirmVisible(true)}
            variant="destructive"
            style={styles.cancelButton}
          />
          <TouchableOpacity style={styles.keepLink} activeOpacity={0.75} onPress={() => navigation.goBack()} hitSlop={TAP_SLOP}>
            <Text style={styles.keepLinkText}>Keep activity</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <ConfirmModal
        visible={confirmVisible}
        title="Cancel this activity?"
        body={affected !== null ? blastRadiusCopy(affected) : ""}
        confirmLabel="Yes, cancel activity"
        tone="danger"
        onConfirm={onConfirm}
        onCancel={() => setConfirmVisible(false)}
      />
    </View>
  );
}


const card = {
  backgroundColor: colors.white, ...elevation.soft
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  content: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: 20, paddingBottom: 60, alignItems: "center" },
  summaryCard: {
    width: "100%", flexDirection: "row", alignItems: "center", gap: 14,
    borderRadius: radii.field, padding: 18, ...card
  },
  summaryTitle: { color: colors.ink, ...typography.subtitle, fontWeight: "800" },
  summaryWhen: { marginTop: 3, color: colors.teal, ...typography.meta, fontWeight: "700" },
  summarySub: { marginTop: 3, color: colors.muted, ...typography.meta },
  question: { alignSelf: "flex-start", marginTop: 26, color: colors.ink, ...typography.hero },
  body: { alignSelf: "flex-start", marginTop: 10, color: colors.muted, ...typography.body },
  bannerBox: { width: "100%", marginTop: 18, borderRadius: radii.notice, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: colors.dangerBg },
  bannerText: { color: colors.danger, ...typography.meta, fontWeight: "700", textAlign: "center" },
  cancelButton: { width: "100%", marginTop: 36 },
  keepLink: { marginTop: 16, height: 40, alignItems: "center", justifyContent: "center" },
  keepLinkText: { color: colors.teal, ...typography.meta, fontWeight: "800" },
  iconCircle: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center" },
  heading: { marginTop: 22, color: colors.ink, ...typography.hero },
  subheading: { marginTop: 10, color: colors.muted, ...typography.body, textAlign: "center" },
  primaryButton: { width: "100%", marginTop: 32 }
});
