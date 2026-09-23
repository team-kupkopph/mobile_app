// US-V8 · check in / check out on the day of the shift.
// Reference: screens/user/screen-kawanggawa-checkin.png. GET /me/signups is the single source
// of truth for check_in_at/check_out_at — POST /signups/{id}/check-in|check-out just flips a
// timestamp server-side, so after either action we re-fetch instead of guessing the new state.
//
// P3 Task 7 (K7, K21, G5, G6) rebuilds this around `checkinState` (../volunteer): the body is
// driven entirely by the not_yet/can_check_in/can_check_out/done/missed window rather than the
// two hand-rolled booleans this screen used before. It also surfaces the assigned animal
// (G6, once the shelter names one) and an "Add to calendar" share action (G5) that writes an
// .ics to the cache dir and hands it to the OS share sheet — same File/Paths API ExportDataScreen
// already uses, kept consistent rather than reintroducing the older FileSystem.* free functions.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import * as Sharing from "expo-sharing";
import { useCallback, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";

import { useApi } from "../api/useApi";
import { addToCalendar } from "../calendarShare";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { VolunteerIcon } from "../components/AppIcons";
import { RootStackParamList } from "../navigation/types";
import { checkinState, locationLine, MySignupItem, MySignups, shiftHeadline } from "../volunteer";
import { colors, elevation, radii, spacing, squircle, typography } from "../theme";
import { Button, ScreenHeader } from "../components/ui";


const card = {
  backgroundColor: colors.white, ...elevation.soft
};

function shiftWhenLabel(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const date = start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const startTime = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const endTime = end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date} · ${startTime}–${endTime}`;
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

type Props = NativeStackScreenProps<RootStackParamList, "kawanggawaCheckin">;

export function KawangGawaCheckinScreen({ navigation, route }: Props) {
  const api = useApi();
  const { signupId } = route.params;

  const [data, setData] = useState<MySignups | null>(null);
  // US-R4 · was three hand-rolled booleans that collapsed offline, 5xx and "deleted"
  // into one sentence. Keeping the RESULT lets the shared view say which it was — and
  // a 404 here is ordinary: these routes are reached from a push notification about a
  // shift that may since have been cancelled.
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);


  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [calendarError, setCalendarError] = useState<string | undefined>(undefined);

  const load = useCallback(() => {
    setRes(null);
    return api.get("/me/signups").then((r) => {
      setRes({ ok: r.ok, status: r.status });
      if (r.ok) setData(r.data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const item: MySignupItem | undefined = data
    ? [...data.upcoming, ...data.requested, ...data.history].find((i) => i.signup_id === signupId)
    : undefined;


  async function act(action: "in" | "out") {
    if (submitting) return;
    setSubmitting(true);
    setError(undefined);
    const res = await api.post(`/signups/${signupId}/check-${action}`);
    if (!res.ok) {
      const code = res.data?.error?.code;
      if (res.status === 409 && (code === "already_checked_in" || code === "already_checked_out")) {
        // The server disagrees with what this screen thinks the state is — trust GET
        // /me/signups over the 409, and say nothing: the reload alone brings the screen
        // in line with reality, and there's nothing here the volunteer did wrong.
        await load();
        setSubmitting(false);
        return;
      }
      setError(
        res.status === 409 && code === "too_early" ? "Check-in opens 30 minutes before the shift."
        : res.status === 409 && code === "too_late" ? "This shift has ended."
        : res.status === 409 && code === "not_checked_in" ? "Check in first."
        : res.data?.error?.message ?? "Couldn't update your attendance. Try again."
      );
      setSubmitting(false);
      return;
    }
    await load();
    setSubmitting(false);
  }

  async function onAddToCalendar() {
    if (!item) return;
    setCalendarError(undefined);
    try {
      if (!(await Sharing.isAvailableAsync())) {
        setCalendarError("Sharing isn't available on this device.");
        return;
      }
      await addToCalendar(item);
    } catch {
      setCalendarError("Couldn't add this to your calendar.");
    }
  }

  const state = item ? checkinState(item) : null;

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Your shift" onBack={() => navigation.goBack()} />

      {!item ? (
        <View style={styles.centerFill}>
          {/* count is passed HERE and only here: "no shift today" is a real, correct answer
              this screen must be able to give, and it is not the same as a failure. */}
          <LoadStateView
            state={loadState(res, 0)}
            emptyTitle="No shift today"
            emptyBody="You don't have a shift scheduled for today."
            subject="shift"
            onRetry={load}
            onBack={() => navigation.goBack()}
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.shiftCard}>
            <View style={styles.cardIcon}>
              <VolunteerIcon color={colors.teal} size={22} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{shiftHeadline(item.shift)}</Text>
              <Text style={styles.cardOrg}>{item.shift.org_name}</Text>
              <Text style={styles.cardMeta}>{shiftWhenLabel(item.shift.starts_at, item.shift.ends_at)}</Text>
              {/* G2 · the meeting point, once the shelter has approved and it's on the
                  embedded shift. */}
              {item.shift.location && (
                <Text style={styles.cardLocation}>{locationLine(item.shift.location)}</Text>
              )}
            </View>
          </View>

          {/* G6 · once the shelter assigns an animal, who the volunteer is walking today. */}
          {item.assigned_animal && (
            <View style={styles.animalRow}>
              {item.assigned_animal.photo_url ? (
                <Image source={{ uri: item.assigned_animal.photo_url }} style={styles.animalPhoto} />
              ) : (
                <View style={[styles.animalPhoto, styles.animalPhotoPlaceholder]}>
                  <VolunteerIcon color={colors.teal} size={18} />
                </View>
              )}
              <Text style={styles.animalText}>You'll walk {item.assigned_animal.name}</Text>
            </View>
          )}

          {/* K7, K21 · the body is driven entirely by the check-in window, not by which
              timestamps happen to be set — `checkinState` is the one place that logic lives. */}
          {state?.kind === "not_yet" && (
            <View style={[styles.banner, { backgroundColor: colors.warningBg }]}>
              <View style={[styles.bannerDot, { backgroundColor: colors.warningStrong }]} />
              <Text style={[styles.bannerText, { color: colors.warningStrong }]}>
                Check-in opens at {timeLabel(state.opensAt)}.
              </Text>
            </View>
          )}
          {state?.kind === "done" && (
            <View style={[styles.banner, { backgroundColor: colors.soft }]}>
              <View style={[styles.bannerDot, { backgroundColor: colors.teal }]} />
              <Text style={[styles.bannerText, { color: colors.teal }]}>
                Shift complete. Thanks for volunteering!
              </Text>
            </View>
          )}
          {state?.kind === "missed" && (
            <View style={[styles.banner, { backgroundColor: colors.dangerBg }]}>
              <View style={[styles.bannerDot, { backgroundColor: colors.danger }]} />
              <Text style={[styles.bannerText, { color: colors.danger }]}>
                This shift has ended. If you were there, tell the shelter — they mark attendance.
              </Text>
            </View>
          )}
          {state?.kind === "can_check_out" && (
            <View style={[styles.banner, { backgroundColor: colors.successBg }]}>
              <View style={[styles.bannerDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.bannerText, { color: colors.success }]}>
                Happening now — check out when you're done.
              </Text>
            </View>
          )}

          {!!error && <Text style={styles.formError}>{error}</Text>}

          {state?.kind === "can_check_in" && (
            <Button label="Check in" onPress={() => act("in")} loading={submitting} style={styles.actionButton} />
          )}
          {state?.kind === "can_check_out" && (
            <Button label="Check out" onPress={() => act("out")} loading={submitting} style={styles.actionButton} />
          )}

          <Button
            label="Add to calendar"
            onPress={onAddToCalendar}
            variant="secondary"
            size="small"
            style={styles.calendarButton}
          />
          {!!calendarError && <Text style={styles.formError}>{calendarError}</Text>}

          <Text style={styles.helper}>The shelter marks your attendance from this.</Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  content: { paddingHorizontal: spacing.lg, paddingTop: 22, paddingBottom: 60 },
  shiftCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 18, borderRadius: radii.field, ...card },
  cardIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.soft,
              alignItems: "center", justifyContent: "center" },
  cardTitle: { color: colors.ink, ...typography.subtitle, fontWeight: "800" },
  cardOrg: { marginTop: 2, color: colors.muted, ...typography.meta, fontWeight: "700" },
  cardMeta: { marginTop: 6, color: colors.teal, ...typography.meta, fontWeight: "700" },
  cardLocation: { marginTop: 4, color: colors.muted, ...typography.caption, fontWeight: "600" },
  animalRow: { marginTop: 16, flexDirection: "row", alignItems: "center", gap: 12, padding: 14,
               borderRadius: radii.field, ...card },
  animalPhoto: { width: 44, height: 44, borderRadius: squircle(44), backgroundColor: colors.soft },
  animalPhotoPlaceholder: { alignItems: "center", justifyContent: "center" },
  animalText: { flex: 1, color: colors.ink, ...typography.strong, fontWeight: "700" },
  banner: { marginTop: 16, borderRadius: radii.notice, paddingHorizontal: 18, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  bannerDot: { width: 9, height: 9, borderRadius: 5 },
  bannerText: { flex: 1, ...typography.meta, fontWeight: "800" },
  formError: { marginTop: 20, color: colors.danger, ...typography.meta, fontWeight: "700", textAlign: "center" },
  actionButton: { marginTop: 28 },
  calendarButton: { marginTop: 16, alignSelf: "center" },
  helper: { marginTop: 20, color: colors.muted, ...typography.meta, fontWeight: "600", textAlign: "center" }
});
