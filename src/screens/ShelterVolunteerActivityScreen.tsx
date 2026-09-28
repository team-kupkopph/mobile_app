// Task 9 · the activity timeline (G7, G8, G11, G20, K16) — one screen, Pending → Confirmed →
// Attendance, replacing the old standalone ShelterVolunteerRequestsScreen and
// ShelterVolunteerAttendanceScreen. GET /shelter/shifts/{shiftId} is the owner-only detail
// endpoint from Task 1; it returns the same `_shift_repr` shape as the volunteer-facing
// GET /shifts/{id} (ShelterShift = BrowseShift), so no new type is needed for the header.
//
// The shift fetch is treated as PRIMARY here (unlike the three sections below it, which each
// degrade on their own, US-R2) — the header, the SegmentedControl's gating, and the footer's
// K15 rule all need it, so a screen with no shift to show is a screen with nothing to show.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { RootStackParamList } from "../navigation/types";
import { ActivitySection, ShelterShift, activitySection } from "../shelterVolunteer";
import { shiftHeadline } from "../volunteer";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { PendingSection } from "../components/shelterVolunteer/PendingSection";
import { ConfirmedSection } from "../components/shelterVolunteer/ConfirmedSection";
import { AttendanceSection } from "../components/shelterVolunteer/AttendanceSection";
import { colors, radii, spacing, typography } from "../theme";
import { Button, ScreenHeader, SegmentedControl } from "../components/ui";

const SECTION_ORDER: ActivitySection[] = ["pending", "confirmed", "attendance"];

function shiftWhenLabel(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const date = start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const startTime = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const endTime = end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date} · ${startTime}–${endTime}`;
}

function hasEnded(shift: ShelterShift, nowMs: number = Date.now()): boolean {
  return nowMs >= new Date(shift.ends_at).getTime();
}

type Props = NativeStackScreenProps<RootStackParamList, "shelterVolunteerActivity">;

export function ShelterVolunteerActivityScreen({ navigation, route }: Props) {
  const api = useApi();
  const { shiftId } = route.params;

  const [shift, setShift] = useState<ShelterShift | null>(null);
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);

  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [confirmedCount, setConfirmedCount] = useState<number | null>(null);

  const requestedIndex = route.params.section ? SECTION_ORDER.indexOf(route.params.section) : -1;
  const [index, setIndex] = useState(requestedIndex >= 0 ? requestedIndex : 0);
  // Once a section is picked — explicitly via route params, or auto-picked below once the
  // shift and the pending count both settle — never move it again on our own; only the
  // person tapping a segment (onSegmentChange) should change it after that.
  const autoPicked = useRef(requestedIndex >= 0);
  const [gateBanner, setGateBanner] = useState<string | null>(null);

  const load = useCallback(() => {
    setRes(null);
    api.get(`/shelter/shifts/${shiftId}`).then((r) => {
      setRes({ ok: r.ok, status: r.status });
      if (r.ok) setShift(r.data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus
  }, [shiftId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    if (autoPicked.current || !shift || pendingCount === null) return;
    setIndex(SECTION_ORDER.indexOf(activitySection(shift, pendingCount)));
    autoPicked.current = true;
  }, [shift, pendingCount]);

  const ended = shift ? hasEnded(shift) : false;

  function onSegmentChange(i: number) {
    if (i === 2 && !ended) {
      setGateBanner("Attendance opens when the shift ends.");
      return;
    }
    setGateBanner(null);
    autoPicked.current = true;
    setIndex(i);
  }

  const pendingLabel = `Pending${pendingCount !== null ? ` · ${pendingCount}` : ""}`;
  const confirmedLabel = `Confirmed${confirmedCount !== null ? ` · ${confirmedCount}` : ""}`;
  const segments = [pendingLabel, confirmedLabel, "Attendance"];

  const footerHidden = !shift || shift.status === "closed" || hasEnded(shift);

  return (
    <View style={styles.screen}>
      <ScreenBackdrop />
      <ScreenHeader title={shift ? shiftHeadline(shift) : "Activity"} onBack={() => navigation.goBack()} align="center">
        {!!shift && (
          <Text style={styles.subtitle}>{shiftWhenLabel(shift.starts_at, shift.ends_at)} · {shift.city}</Text>
        )}
      </ScreenHeader>

      {!shift ? (
        <LoadStateView state={loadState(res)} subject="activity" onRetry={load} onBack={() => navigation.goBack()} />
      ) : (
        <>
          <View style={styles.segmentWrap}>
            <SegmentedControl segments={segments} index={index} onChange={onSegmentChange} testID="seg.activity" />
          </View>

          {!!gateBanner && (
            <View style={styles.bannerBox}>
              <Text style={styles.bannerText}>{gateBanner}</Text>
            </View>
          )}

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* All three sections stay mounted (hidden via `display`, not unmounted) so each
                keeps its own fetch/retry state across tab switches, and so Pending/Confirmed
                can report their counts for the segment labels before the person ever visits
                them. */}
            <View style={index === 0 ? undefined : styles.hidden}>
              <PendingSection
                shiftId={shiftId}
                shift={shift}
                onOpenDetail={(signupId) => navigation.navigate("shelterVolunteerDetail", { signupId })}
                onCountSettled={setPendingCount}
              />
            </View>
            <View style={index === 1 ? undefined : styles.hidden}>
              <ConfirmedSection
                shiftId={shiftId}
                shift={shift}
                onOpenDetail={(signupId) => navigation.navigate("shelterVolunteerDetail", { signupId })}
                onCountSettled={setConfirmedCount}
              />
            </View>
            <View style={index === 2 ? undefined : styles.hidden}>
              <AttendanceSection shiftId={shiftId} />
            </View>
          </ScrollView>

          {!footerHidden && (
            <View style={styles.footer}>
              <View style={styles.footerRow}>
                <Button
                  label="Edit"
                  variant="secondary"
                  onPress={() => navigation.navigate("shelterVolunteerEdit", { shiftId })}
                  style={styles.footerHalf}
                />
                <Button
                  label="Duplicate"
                  variant="secondary"
                  onPress={() => navigation.navigate("shelterVolunteerCreate", { copyFrom: shiftId })}
                  style={styles.footerHalf}
                />
              </View>
              <Button
                label="Cancel activity"
                onPress={() => navigation.navigate("shelterVolunteerCancel", { shiftId })}
                variant="destructive"
                style={styles.cancelButton}
              />
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  subtitle: { marginTop: 3, color: colors.muted, ...typography.meta, textAlign: "center" },
  segmentWrap: { paddingHorizontal: spacing.lg, paddingTop: 16 },
  bannerBox: { marginHorizontal: spacing.lg, marginTop: 10, borderRadius: radii.notice, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: colors.warningBg },
  bannerText: { color: colors.warningStrong, ...typography.meta, fontWeight: "700", textAlign: "center" },
  content: { paddingHorizontal: spacing.lg, paddingTop: 16, paddingBottom: 40 },
  hidden: { display: "none" },
  footer: { paddingHorizontal: spacing.lg, paddingTop: 10, paddingBottom: 24 },
  footerRow: { flexDirection: "row", gap: 10 },
  footerHalf: { flex: 1 },
  cancelButton: { marginTop: 10 }
});
