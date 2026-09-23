// US-V8 · the Kawang-Gawa hub — the Volunteer tab. Browse open shifts across shelters, or
// switch to "My shifts" for everything the volunteer already signed up for.
// Reference: screens/user/screen-kawanggawa.png. GET /shifts (optionally ?type=), plus
// GET /me/signups for the impact strip and the My shifts tab.
//
// Redesigned 2026-09-09. What was here: a 26pt title that collided with two 14pt header links
// at phone width, seven filter chips wrapping onto three rows above a list that often held one
// shift, and cards reading "Dog walking / E2E shelter / Fri, Sep 11 · 11:29 PM–1:29 AM /
// 5 of 5 slots left". Nothing said how long a shift takes, whether it was nearly gone, or what
// the volunteer had already done — there was nothing on the screen to bring anyone back.
//
// Task 5 (K30, G9), 2026-09-23. The two header pills ("My schedule", "History") each opened a
// standalone screen re-fetching the same /me/signups this screen already had. Folded onto one
// screen instead: a SegmentedControl under the title, Browse (the body below, unchanged) and
// My shifts (KawangGawaScheduleScreen's upcoming/requested + KawangGawaHistoryScreen's stats +
// history, all rendered by <MyShifts> over the SAME `mine` state the impact strip already
// fetches — switching segments no longer refetches Browse, and My shifts needs no fetch of its
// own either). `route.params.tab` seeds the initial segment (a notification tap or the
// Requested screen's CTA opens straight onto "mine") and keeps it in sync if the hub is
// popped back to with a new `tab` param rather than freshly mounted.
//
// ⚠️ WHAT THE DATA WILL NOT SUPPORT. `_shift_repr` carries no location, description or photo
// (volunteer/views.py), so "shelters near you", distance and imagery are not available here
// without backend work. Everything below is derived from the two endpoints that already exist.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { useAuth } from "../auth/AuthContext";
import { LoadStateView } from "../components/LoadStateView";
import { StaleBanner } from "../components/StaleBanner";
import { MyShifts } from "../components/volunteer/MyShifts";
import { isOffline, loadState } from "../net";
import { VolunteerIcon } from "../components/AppIcons";
import { GuestTabs } from "../components/GuestTabs";
import { OwnerTabs } from "../components/OwnerTabs";
import { SignupWall, SignupWallAction } from "../components/SignupWall";
import { setIntent } from "../guestIntent";
import { RootStackParamList } from "../navigation/types";
import { TAP_SLOP } from "../touch";
import { useCachedFeed } from "../useCachedFeed";
import {
  BrowseShift, MySignups, ShiftType, groupShiftsByDay, nextBookedShift, shiftDurationLabel,
  shiftHeadline, shiftSlotsChip, shiftTimeRange, shiftTypeLabel, volunteerTotals, volunteerTotalsLabel
} from "../volunteer";
import { colors, elevation, radii, spacing, typography } from "../theme";
import { SegmentedControl } from "../components/ui";

const SHIFT_TYPES: ShiftType[] = ["walking", "feeding", "visitor", "event", "facility", "transport"];
const FILTERS: Array<{ key: "" | ShiftType; label: string }> = [
  { key: "", label: "All" },
  ...SHIFT_TYPES.map((t) => ({ key: t, label: shiftTypeLabel(t) }))
];

const TONE = {
  amber: { bg: "#FAEEDA", fg: "#633806" }, teal: { bg: "#E2EEF0", fg: "#14504F" },
  green: { bg: "#EAF3DE", fg: "#27500A" }, grey: { bg: "#ECEAE3", fg: "#5F5E5A" }
} as const;

type Props = NativeStackScreenProps<RootStackParamList, "kawanggawa">;

export function KawangGawaScreen({ navigation, route }: Props) {
  const api = useApi();
  const { tokens, city, isReady } = useAuth();
  // G13 · guests may browse the hub read-only: no /me/signups call, no impact strip, no
  // My shifts segment (there is nothing of theirs to show) — Browse only, and the tab bar
  // is the guest one rather than OwnerTabs.
  const isGuest = tokens === null;
  const { rows: shifts, res, stale, load: loadFeed } =
    useCachedFeed<BrowseShift>(api, (d) => d?.results ?? []);

  const [type, setType] = useState<"" | ShiftType>("");
  // P2 · city scope. Off (browsing every city) until the volunteer taps "Change" — defaults
  // to their own city whenever one is on file, same as the home feed.
  const [allCities, setAllCities] = useState(false);
  // ⚠️ Set ONLY on a successful response, and the strip renders only when it is non-null. A
  // failed /me/signups therefore draws nothing rather than a confident "0 shifts" — the same
  // rule the rescue panels follow, and for the same reason: an empty answer and an answer that
  // never arrived are not the same statement. A genuine first-timer comes back non-null with
  // zeroes and gets the invitation line instead.
  const [mine, setMine] = useState<MySignups | null>(null);
  // US-R4 · same result-not-booleans shape KawangGawaScheduleScreen/HistoryScreen used before
  // they folded into this tab — lets LoadStateView tell offline/error/gone apart on the My
  // shifts segment, the same way those screens' load states did.
  const [mineRes, setMineRes] = useState<{ ok: boolean; status: number } | null>(null);

  // G13 · Adopt/You are still gated for a guest browsing the hub — same wall the guest Home
  // uses for those two tabs.
  const [wall, setWall] = useState<SignupWallAction | null>(null);

  const [tabIndex, setTabIndex] = useState(route.params?.tab === "mine" ? 1 : 0);
  // The hub is a single screen for the life of the volunteer's session — a notification tap
  // or the Requested screen's "View my shifts" CTA navigate back to an ALREADY-MOUNTED hub
  // with a fresh `tab` param, which does not re-run useState's initializer. This keeps the
  // segment in sync with that param on every change, not just first mount.
  useEffect(() => {
    if (route.params?.tab) setTabIndex(route.params.tab === "mine" ? 1 : 0);
  }, [route.params?.tab]);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (city && !allCities) params.set("city", city);
    const qs = params.toString();
    loadFeed(`/shifts${qs ? `?${qs}` : ""}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus + filter/city change
  }, [type, city, allCities]);

  const loadMine = useCallback(() => {
    setMineRes(null);
    api.get("/me/signups").then((r) => {
      setMineRes({ ok: r.ok, status: r.status });
      if (r.ok) setMine(r.data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus
  }, []);

  // ⚠️ Gated on `isReady` for the same cold-start reason HomeScreen's `loadCityPanels`
  // documents: AuthContext reads the cached city out of SecureStore ASYNCHRONOUSLY, so on a
  // cold start `city` is still null on the first render. Firing before `isReady` would query
  // every city once, then re-query on the city landing — a visible flash from "all cities" to
  // scoped. Waiting for `isReady` means it fires exactly once, with the real answer.
  useFocusEffect(useCallback(() => {
    if (!isReady) return;
    load();
    if (!isGuest) loadMine();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- api identity is stable per render
  }, [load, loadMine, isReady, isGuest]));

  const totalsLabel = volunteerTotalsLabel(volunteerTotals(mine));
  const next = nextBookedShift(mine);
  const groups = groupShiftsByDay(shifts ?? []);
  const state = loadState(res, shifts?.length);
  let cardIndex = -1; // flat across day sections — e2e flow 30 taps card.kawanggawa.0

  return (
    <View style={styles.screen} testID="screen.kawanggawa">
      {/* The title had `justifyContent: space-between` against two links and no room to
          shrink, so "Kawang-Gawa" ran straight into "My schedule ›" at 402 pt. It gets its
          own line now, and the two destinations folded into one segmented control below. */}
      <View style={styles.header}>
        <Text style={styles.title}>Kawang-Gawa</Text>
        {/* G13 · a guest has no My shifts to switch to — Browse is the only segment, so the
            control that would let them switch away from it is not mounted at all. */}
        {!isGuest && (
          <SegmentedControl
            segments={["Browse", "My shifts"]}
            index={tabIndex}
            onChange={setTabIndex}
            style={styles.segmented}
            testID="seg.kawanggawa"
          />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {mine && (
          <View style={styles.impact}>
            <Text style={styles.impactTotals}>{totalsLabel ?? "Your first shift is waiting."}</Text>
            {next ? (
              <>
                <View style={styles.impactDivider} />
                <TouchableOpacity
                  style={styles.impactNext}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`Next shift: ${shiftTypeLabel(next.shift.type)} at ${next.shift.org_name}`}
                  onPress={() => setTabIndex(1)}
                >
                  <View style={styles.impactNextCopy}>
                    <Text style={styles.impactNextLabel}>
                      Next · {shiftTypeLabel(next.shift.type)} at {next.shift.org_name}
                    </Text>
                    <Text style={styles.impactNextWhen}>
                      {shiftTimeRange(next.shift.starts_at, next.shift.ends_at)} · {shiftDurationLabel(next.shift.starts_at, next.shift.ends_at)}
                    </Text>
                  </View>
                  <Text style={styles.impactChevron}>›</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        )}

        {!isGuest && tabIndex === 1 ? (
          mine ? (
            <MyShifts
              data={mine}
              onOpen={(item) => navigation.navigate("kawanggawaCheckin", { signupId: item.signup_id })}
              onCancel={(item) => navigation.navigate("kawanggawaCancel", { signupId: item.signup_id })}
            />
          ) : (
            <LoadStateView state={loadState(mineRes)} subject="shifts" onRetry={loadMine} />
          )
        ) : (
          <>
        {/* P2 · city scope row. Mirrors the home feed's city chip: a saved city scopes the
            feed by default, and "Change" is a plain toggle rather than a trip to the picker —
            the picker is one tap further, for the "no city yet" case only. */}
        <View style={styles.scopeRow}>
          {city ? (
            <>
              <Text style={styles.scopeText}>{allCities ? "All cities" : `Near ${city}`}</Text>
              <TouchableOpacity
                hitSlop={TAP_SLOP}
                accessibilityRole="button"
                accessibilityState={{ selected: allCities }}
                onPress={() => setAllCities((v) => !v)}
              >
                <Text style={styles.scopeAction}>Change</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.scopeText}>All cities</Text>
              <TouchableOpacity
                hitSlop={TAP_SLOP}
                accessibilityRole="button"
                onPress={() => navigation.navigate("locationPicker")}
              >
                <Text style={styles.scopeAction}>Set your city ›</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* One scrolling row. Seven chips wrapped onto three rows before, taking ~140 pt of
            the screen above a list that is often shorter than the filter that sorts it. */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key || "all"}
              style={[styles.filterChip, type === f.key && styles.filterChipActive]}
              onPress={() => setType(f.key)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityState={{ selected: type === f.key }}
            >
              <Text style={[styles.filterText, type === f.key && styles.filterTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {state.kind !== "ready" ? (
          <>
            <LoadStateView
              state={state}
              emptyTitle={
                city && !allCities ? `No open shifts in ${city} right now.` : "No open shifts right now — check back soon."
              }
              onRetry={load}
            />
            {/* `LoadStateView`'s own retry button never renders for `empty` (there is nothing
                to retry) — this is a second action, not that one: it widens the scope rather
                than re-asking the same query. */}
            {state.kind === "empty" && city && !allCities && (
              <TouchableOpacity
                style={styles.emptyAction}
                activeOpacity={0.8}
                accessibilityRole="button"
                onPress={() => setAllCities(true)}
              >
                <Text style={styles.emptyActionText}>See all cities</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <>
          {stale ? <StaleBanner offline={isOffline(res)} /> : null}
          {groups.map((group) => (
            <View key={group.label}>
              <Text style={styles.groupHead}>{group.label}</Text>
              {group.shifts.map((s) => {
                cardIndex += 1;
                const chip = shiftSlotsChip(s.slots_left, s.capacity);
                const tone = TONE[chip.tone];
                const full = s.slots_left <= 0;
                return (
                  <TouchableOpacity
                    testID={`card.kawanggawa.${cardIndex}`}
                    key={s.shift_id}
                    style={styles.card}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={`${shiftTypeLabel(s.type)} at ${s.org_name}, ${shiftTimeRange(s.starts_at, s.ends_at)}, ${chip.label}`}
                    onPress={() => navigation.navigate("kawanggawaDetail", { shiftId: s.shift_id })}
                  >
                    <View style={[styles.cardIcon, full && styles.cardIconFull]}>
                      <VolunteerIcon color={full ? colors.muted : colors.teal} size={22} />
                    </View>
                    {/* The chip sits in the TITLE row, not a third column. As a column it
                        left the time line about 156 pt and "11:29 PM–1:29 AM · 2 hours"
                        wrapped onto two lines on a 402 pt screen. */}
                    <View style={styles.cardCopy}>
                      <View style={styles.cardTop}>
                        <Text style={styles.cardTitle} numberOfLines={1}>{shiftHeadline(s)}</Text>
                        <View style={[styles.chip, { backgroundColor: tone.bg }]}>
                          <Text style={[styles.chipText, { color: tone.fg }]}>{chip.label}</Text>
                        </View>
                      </View>
                      <Text style={styles.cardOrg}>
                        {shiftTypeLabel(s.type)} · {s.org_name}{s.city ? ` · ${s.city}` : ""}
                      </Text>
                      <Text style={styles.cardMeta}>
                        {shiftTimeRange(s.starts_at, s.ends_at)} · {shiftDurationLabel(s.starts_at, s.ends_at)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
          </>
        )}
          </>
        )}
      </ScrollView>

      {isGuest ? (
        <GuestTabs active="volunteer" onGated={setWall} />
      ) : (
        <OwnerTabs active="volunteer" />
      )}

      {isGuest && (
        <SignupWall
          visible={!!wall}
          action={wall ?? "account"}
          onCreateAccount={() => { if (wall) setIntent(wall); setWall(null); navigation.navigate("accountType"); }}
          onLogin={() => { setWall(null); navigation.navigate("signin"); }}
          onDismiss={() => setWall(null)}
        />
      )}
    </View>
  );
}

const card = {
  backgroundColor: colors.white, ...elevation.soft
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  header: { paddingTop: 58, paddingHorizontal: spacing.lg, paddingBottom: 4 },
  title: { color: colors.ink, ...typography.hero },
  segmented: { marginTop: 16 },
  content: { paddingHorizontal: spacing.lg, paddingTop: 16, paddingBottom: 130 },
  impact: { borderRadius: radii.tile, paddingVertical: 16, paddingHorizontal: 18, marginBottom: 18, ...card },
  impactTotals: { color: colors.ink, ...typography.section },
  impactDivider: { marginTop: 14, height: 1, backgroundColor: colors.border },
  impactNext: { marginTop: 12, flexDirection: "row", alignItems: "center" },
  impactNextCopy: { flex: 1 },
  impactNextLabel: { color: colors.teal, ...typography.meta, fontWeight: "800" },
  impactNextWhen: { marginTop: 3, color: colors.muted, ...typography.meta },
  impactChevron: { marginLeft: 10, color: colors.teal, fontSize: 19, fontWeight: "700" },
  scopeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between",
              marginBottom: 14 },
  scopeText: { color: colors.ink, ...typography.meta, fontWeight: "800" },
  scopeAction: { color: colors.teal, ...typography.meta, fontWeight: "800" },
  emptyAction: { alignSelf: "center", marginTop: 4, height: 44, justifyContent: "center",
                 paddingHorizontal: 18 },
  emptyActionText: { color: colors.teal, ...typography.strong, fontWeight: "700" },
  filterRow: { gap: 8, paddingRight: 26, marginBottom: 18 },
  filterChip: { paddingHorizontal: 16, height: 44, borderRadius: 22, alignItems: "center",
                justifyContent: "center", backgroundColor: colors.white },
  filterChipActive: { backgroundColor: colors.teal },
  filterText: { color: colors.muted, ...typography.meta, fontWeight: "700" },
  filterTextActive: { color: colors.white },
  groupHead: { marginTop: 4, marginBottom: 10, color: colors.muted, ...typography.meta,
               fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase" },
  card: { flexDirection: "row", alignItems: "center", gap: 12, padding: 18, borderRadius: radii.field, marginBottom: 12, ...card },
  cardIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.soft,
              alignItems: "center", justifyContent: "center" },
  cardIconFull: { backgroundColor: "#ECEAE3" },
  cardCopy: { flex: 1 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  cardTitle: { color: colors.ink, ...typography.subtitle, fontWeight: "800" },
  cardOrg: { marginTop: 2, color: colors.muted, ...typography.meta, fontWeight: "700" },
  cardMeta: { marginTop: 6, color: colors.teal, ...typography.meta, fontWeight: "700" },
  chip: { paddingHorizontal: 12, height: 28, borderRadius: 14, justifyContent: "center" },
  chipText: { ...typography.meta, fontWeight: "800" }
});
