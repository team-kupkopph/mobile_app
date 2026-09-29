// US-V9 · the shelter's volunteer schedule — posted shifts grouped by date.
// Reference: screens/user/screen-shelter-volunteer-calendar.png, scoped down per the Task 6
// brief to a date-sectioned list (not a full month grid) — same scoping call as V8's schedule
// screen. GET /shelter/shifts is the same list the manage hub (Task 5) already uses.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { VolunteerIcon } from "../components/AppIcons";
import { RootStackParamList } from "../navigation/types";
import { ShelterShift, shiftStatusChip } from "../shelterVolunteer";
import { shiftHeadline } from "../volunteer";
import { TAP_SLOP } from "../touch";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { colors, spacing, typography } from "../theme";
import { Card, Chip, ScreenHeader } from "../components/ui";

function dateHeading(startsAt: string): string {
  return new Date(startsAt).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

function timeRangeLabel(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const startTime = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const endTime = end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${startTime}–${endTime}`;
}

// Group shifts by calendar day (local time), preserving each group's shifts in the order the
// API returned them, and ordering the day sections by their earliest shift's timestamp.
function groupByDate(shifts: ShelterShift[]): { key: string; heading: string; shifts: ShelterShift[] }[] {
  const groups = new Map<string, ShelterShift[]>();
  for (const s of shifts) {
    const d = new Date(s.starts_at);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const bucket = groups.get(key);
    if (bucket) bucket.push(s);
    else groups.set(key, [s]);
  }
  return Array.from(groups.entries())
    .map(([key, groupShifts]) => ({
      key,
      heading: dateHeading(groupShifts[0].starts_at),
      shifts: groupShifts
    }))
    .sort((a, b) => new Date(a.shifts[0].starts_at).getTime() - new Date(b.shifts[0].starts_at).getTime());
}

type Props = NativeStackScreenProps<RootStackParamList, "shelterVolunteerCalendar">;

export function ShelterVolunteerCalendarScreen({ navigation }: Props) {
  const api = useApi();
  const [shifts, setShifts] = useState<ShelterShift[]>([]);
  // F-R2-5 · the backend pages 20 at a time and returns `next` as a page number; this screen
  // used to stop at page 1, so a busy shelter's schedule silently lost everything past the
  // twentieth activity. Same "Load more" the manage list (K8) follows.
  const [next, setNext] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  // US-R3 · consolidation, not a bug fix — this screen already split loading/error/empty
  // by hand and got it right. LoadStateView adds the one distinction its own boolean
  // could not make: offline versus the server refusing.
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);


  const load = useCallback(() => {
    setRes(null);
    setNext(null);
    // Task 10 (K8) · the schedule only ever shows what's ahead — same `?when=upcoming`
    // the manage list and the You-tab count now use, so "how many activities" agrees
    // everywhere it's asked.
    api.get("/shelter/shifts?when=upcoming&page=1").then((r) => {
      setRes({ ok: r.ok, status: r.status });
      if (r.ok) {
        setShifts(r.data?.results ?? []);
        setNext(r.data?.next ?? null);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus only
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function loadMore() {
    if (!next || loadingMore) return;
    setLoadingMore(true);
    api.get(`/shelter/shifts?when=upcoming&page=${next}`).then((r) => {
      setLoadingMore(false);
      if (r.ok) {
        setShifts((prev) => [...prev, ...(r.data?.results ?? [])]);
        setNext(r.data?.next ?? null);
      }
    });
  }

  const groups = groupByDate(shifts);

  return (
    <View style={styles.screen}>
      <ScreenBackdrop />
      <ScreenHeader title="Volunteer schedule" onBack={() => navigation.goBack()} align="center" />

      {loadState(res, groups.length).kind !== "ready" ? (
        <View style={styles.centerFill}>
          <LoadStateView
            state={loadState(res, groups.length)}
            emptyTitle="No volunteer activities posted yet."
            onRetry={load}
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Card style={styles.grid}>
            {groups.map((group) => (
              <View key={group.key} style={styles.section}>
                <Text style={styles.sectionHeading}>{group.heading}</Text>
                {group.shifts.map((s) => {
                  const chip = shiftStatusChip(s);
                  const signedUp = s.capacity - s.slots_left;
                  return (
                    <TouchableOpacity
                      key={s.shift_id}
                      style={styles.card}
                      activeOpacity={0.85}
                      onPress={() => navigation.navigate("shelterVolunteerActivity", { shiftId: s.shift_id })}
                    >
                      <View style={styles.cardIcon}>
                        <VolunteerIcon color={colors.teal} size={22} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle} numberOfLines={2}>{shiftHeadline(s)}</Text>
                        <Text style={styles.cardMeta}>
                          {timeRangeLabel(s.starts_at, s.ends_at)} · {signedUp} / {s.capacity} signed up
                        </Text>
                      </View>
                      <Chip label={chip.label} tone={chip.tone} dot={false} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </Card>

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
        </ScrollView>
      )}
    </View>
  );
}


const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  empty: { color: colors.muted, ...typography.body, textAlign: "center" },
  content: { paddingHorizontal: spacing.lg, paddingTop: 16, paddingBottom: 60 },
  section: { marginBottom: 22 },
  sectionHeading: { marginBottom: 12, color: colors.ink, ...typography.subtitle, fontWeight: "800" },
  grid: { padding: spacing.sm },
  card: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, marginBottom: 10 },
  cardIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.soft, alignItems: "center", justifyContent: "center" },
  cardTitle: { color: colors.ink, ...typography.subtitle, fontWeight: "800" },
  cardMeta: { marginTop: 4, color: colors.muted, ...typography.meta },
  loadMore: { marginTop: 16, height: 44, alignItems: "center", justifyContent: "center" },
  loadMoreText: { color: colors.teal, ...typography.strong, fontWeight: "800" }
});
