// US-V9 · the shelter's "manage" list for Kawang-Gawa — posted shifts and their sign-ups.
// Reference: screens/user/screen-shelter-volunteer.png. GET /shelter/shifts.
//
// Task 10 (K8) · Upcoming | Past, paged 20 at a time (backend PAGE_SIZE). A Past row whose
// `attendance_due` is nonzero (approved signups past `ends_at` never marked) gets a warning
// Chip that jumps straight to the timeline's attendance section — the same 409-free shortcut
// the dashboard's own "Mark attendance" line (Task 10 Step 5) points at.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { VolunteerIcon } from "../components/AppIcons";
import { RootStackParamList } from "../navigation/types";
import { ShelterShiftRow, shiftStatusChip } from "../shelterVolunteer";
import { shiftHeadline } from "../volunteer";
import { TAP_SLOP } from "../touch";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { colors, spacing, typography } from "../theme";
import { Card, Chip, ScreenHeader, SegmentedControl } from "../components/ui";

function shiftWhenLabel(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const date = start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const startTime = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const endTime = end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date} · ${startTime}–${endTime}`;
}

const SEGMENTS: Array<"upcoming" | "past"> = ["upcoming", "past"];

// Registered under "shelterVolunteer" (the real list) and, temporarily, under the remaining
// not-yet-built US-V9 route names too — RootNavigator points them all at this component so the
// app compiles before Tasks 6–10 swap in their real screens. The union keeps that placeholder
// wiring typechecking without an `any` cast; this screen never reads `route.params`.
// This component only serves the `shelterVolunteer` route; navigating onward to the sibling
// shelter-volunteer screens needs no union here (navigation.navigate accepts any route). The
// old wide union was left over from when this file held several screens.
type Props = NativeStackScreenProps<RootStackParamList, "shelterVolunteer">;

export function ShelterVolunteerScreen({ navigation }: Props) {
  const api = useApi();
  const [segment, setSegment] = useState(0);
  const when = SEGMENTS[segment];
  const [shifts, setShifts] = useState<ShelterShiftRow[]>([]);
  const [next, setNext] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  // US-R3 · consolidation, not a bug fix — this screen already split loading/error/empty
  // by hand and got it right. LoadStateView adds the one distinction its own boolean
  // could not make: offline versus the server refusing.
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);


  // F-R3-6 · named so LoadStateView's "Try again" can re-run it — offline or a 5xx on the
  // first page otherwise left the shelter with no way back short of leaving the screen.
  const load = useCallback(() => {
    setRes(null);
    setNext(null);
    api.get(`/shelter/shifts?when=${when}&page=1`).then((r) => {
      setRes({ ok: r.ok, status: r.status });
      if (r.ok) {
        setShifts(r.data?.results ?? []);
        setNext(r.data?.next ?? null);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus or segment change
  }, [when]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function loadMore() {
    if (!next || loadingMore) return;
    setLoadingMore(true);
    api.get(`/shelter/shifts?when=${when}&page=${next}`).then((r) => {
      setLoadingMore(false);
      if (r.ok) {
        setShifts((prev) => [...prev, ...(r.data?.results ?? [])]);
        setNext(r.data?.next ?? null);
      }
    });
  }

  return (
    <View style={styles.screen}>
      <ScreenBackdrop />
      <ScreenHeader
        title="Kawang-Gawa"
        onBack={() => navigation.goBack()}
        right={
          <TouchableOpacity hitSlop={TAP_SLOP}
            style={styles.newBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate("shelterVolunteerCreate")}
          >
            <Text style={styles.newBtnText}>+ Post an activity</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Your volunteer activities</Text>
            <Text style={styles.sectionSub}>Posted shifts and their sign-ups.</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate("shelterVolunteerCalendar")} hitSlop={TAP_SLOP}>
            <Text style={styles.calendarLink}>Calendar ›</Text>
          </TouchableOpacity>
        </View>

        <SegmentedControl
          segments={["Upcoming", "Past"]}
          index={segment}
          onChange={setSegment}
          style={styles.segments}
          testID="seg.shelterVolunteerList"
        />

        {loadState(res, shifts.length).kind !== "ready" ? (
          <LoadStateView
            state={loadState(res, shifts.length)}
            emptyTitle={when === "upcoming" ? "No volunteer activities posted yet" : "No past activities yet"}
            emptyBody={when === "upcoming" ? 'Tap "+ Post an activity" to start.' : undefined}
            onRetry={load}
          />
        ) : (
          <>
            {shifts.map((s) => {
              const chip = shiftStatusChip(s);
              const signedUp = s.capacity - s.slots_left;
              const needsAttendance = when === "past" && s.attendance_due > 0;
              return (
                <TouchableOpacity
                  key={s.shift_id}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate("shelterVolunteerActivity", { shiftId: s.shift_id })}
                >
                  <Card style={styles.card}>
                    <View style={styles.cardIcon}>
                      <VolunteerIcon color={colors.teal} size={22} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle} numberOfLines={2}>{shiftHeadline(s)}</Text>
                      <Text style={styles.cardMeta}>{shiftWhenLabel(s.starts_at, s.ends_at)}</Text>
                      <Text style={styles.cardSignedUp}>{signedUp} / {s.capacity} signed up</Text>
                      {needsAttendance && (
                        <TouchableOpacity
                          activeOpacity={0.85}
                          style={styles.attendanceChipWrap}
                          onPress={() => navigation.navigate("shelterVolunteerActivity", {
                            shiftId: s.shift_id, section: "attendance"
                          })}
                        >
                          <Chip label="Mark attendance" tone="warning" />
                        </TouchableOpacity>
                      )}
                    </View>
                    <Chip label={chip.label} tone={chip.tone} dot={false} />
                  </Card>
                </TouchableOpacity>
              );
            })}

            {next !== null && (
              <TouchableOpacity
                style={styles.loadMore}
                activeOpacity={0.7}
                hitSlop={TAP_SLOP}
                onPress={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <ActivityIndicator color={colors.teal} />
                ) : (
                  <Text style={styles.loadMoreText}>Load more</Text>
                )}
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}


const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  header: {
    paddingTop: 58, paddingHorizontal: spacing.lg, paddingBottom: 10,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8
  },
  newBtn: { paddingHorizontal: 16, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: colors.teal },
  newBtnText: { color: colors.white, ...typography.meta, fontWeight: "800" },
  content: { paddingHorizontal: spacing.lg, paddingTop: 20, paddingBottom: 60 },
  sectionHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 20 },
  sectionTitle: { color: colors.ink, ...typography.hero },
  sectionSub: { marginTop: 6, color: colors.muted, ...typography.meta },
  calendarLink: { color: colors.teal, ...typography.strong, fontWeight: "800", marginTop: 4 },
  segments: { marginBottom: 18 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, padding: 18, marginBottom: 12 },
  cardIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.soft, alignItems: "center", justifyContent: "center" },
  cardTitle: { color: colors.ink, ...typography.section },
  cardMeta: { marginTop: 4, color: colors.teal, ...typography.meta, fontWeight: "700" },
  cardSignedUp: { marginTop: 4, color: colors.muted, ...typography.meta },
  // Fix round 1 (Finding 2) · the Chip itself is a fixed 30 pt tall, well under the 44 pt
  // minimum — the touchTargets guard only scans bare-Text touchables, so a Chip-only wrapper
  // slipped through it. `minHeight` grows the tappable area around the chip without touching
  // the chip's own rendered size (still centered inside).
  attendanceChipWrap: { marginTop: 8, alignSelf: "flex-start", minHeight: 44, justifyContent: "center" },
  empty: { marginTop: 40, color: colors.muted, ...typography.subtitle, textAlign: "center" },
  loadMore: { marginTop: 6, marginBottom: 10, height: 44, alignItems: "center", justifyContent: "center" },
  loadMoreText: { color: colors.teal, ...typography.strong, fontWeight: "800" }
});
