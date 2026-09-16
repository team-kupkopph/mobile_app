// Task B3 · the shelter's Requests tab root (spec §5's "Requests" row). New screen, V3 from
// birth — the LAST of ShelterTabs' five tabs to stop being dead (see `surfaceV3.test.ts`'s
// `findDeadTabs`). Segmented Adoption/Volunteer/Placement over B-be2's merged inbox —
// GET /shelter/requests?kind=<adoption|volunteer|placement>&status=open — one endpoint
// across three unrelated backend models. A row opens `requestRoute(item)`: adoption and
// placement both land on the same inquiry ladder (the shelter reads it either as the
// poster or as the placement recipient), volunteer opens that shift's pending-requests
// queue (the existing ShelterVolunteerRequestsScreen, US-V9).
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ShelterRequest } from "../api/types";
import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { ShelterTabs } from "../components/ShelterTabs";
import { Card, Chip, SegmentedControl } from "../components/ui";
import { RootStackParamList } from "../navigation/types";
import { DEFAULT_STATUS_TONE, REQUEST_STATUS_TONE, SEGMENT_KIND, requestRoute } from "../shelterRequests";
import { colors, spacing, typography } from "../theme";

/** The canvas's Requests artboard: ["Adoption", "Volunteer", "Placement"] — see
 * shelterRequests.ts's SEGMENT_KIND for the kind each maps onto on the wire. */
const SEGMENTS = ["Adoption", "Volunteer", "Placement"];

function timeAgo(iso: string, nowMs: number = Date.now()): string {
  const mins = Math.max(0, Math.floor((nowMs - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

type Props = NativeStackScreenProps<RootStackParamList, "shelterRequests">;

export function ShelterRequestsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const api = useApi();
  const [segment, setSegment] = useState(0);
  const [requests, setRequests] = useState<ShelterRequest[] | null>(null);
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);

  // Named so the same function serves the focus refetch AND the retry button — same shape
  // as ShelterAnimalsScreen's `load`. Re-derived on every segment change too.
  const load = useCallback(() => {
      setRes(null);
      setRequests(null);
      const kind = SEGMENT_KIND[segment as keyof typeof SEGMENT_KIND];
      api.get(`/shelter/requests?kind=${kind}&status=open`).then((r) => {
        setRes({ ok: r.ok, status: r.status });
        if (r.ok) setRequests(r.data?.results ?? []);
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus + segment change
    }, [segment]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const state = loadState(res, requests?.length);

  return (
    <View style={styles.screen} testID="screen.shelterRequests">
      <ScreenBackdrop />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]} showsVerticalScrollIndicator={false}>
        {/* A real wrapper, not a bare <Text> — the screen's ONE conditional LoadStateView
            branch below needs an intervening <View> between it and the root so it never reads
            as the "replaces the whole screen" shape offlineEscape.test.ts /
            safeAreaOnFailure.test.ts scan for; this one genuinely groups the title. */}
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Requests</Text>
        </View>

        <SegmentedControl
          segments={SEGMENTS}
          index={segment}
          onChange={setSegment}
          testID="seg.shelterRequests"
          style={styles.segmented}
        />

        {state.kind !== "ready" ? (
          <LoadStateView
            state={state}
            emptyTitle="No requests here yet."
            emptyBody="New adoption, volunteer, and placement requests will show up here."
            onRetry={load}
          />
        ) : (
          (requests ?? []).map((item) => {
            const chip = REQUEST_STATUS_TONE[item.status] ?? DEFAULT_STATUS_TONE;
            // Branch on the route name rather than spreading `route.params` into a generic
            // `navigate` call — same shape as NotificationsScreen's own target dispatch —
            // so each call stays fully typed against RootStackParamList instead of an `any`.
            const route = requestRoute(item);
            function onPress() {
              if (route.name === "shelterVolunteerRequests") {
                navigation.navigate("shelterVolunteerRequests", { shiftId: route.params.shiftId });
              } else {
                navigation.navigate("inquiry", { inquiryId: route.params.inquiryId });
              }
            }
            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.85}
                onPress={onPress}
              >
                <Card style={styles.row}>
                  <View style={styles.rowCopy}>
                    <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.rowSub} numberOfLines={1}>{item.subtitle}</Text>
                    <Text style={styles.rowTime}>{timeAgo(item.created_at)}</Text>
                  </View>
                  <Chip tone={chip.tone} dot={false} label={chip.label} />
                </Card>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <ShelterTabs
        active="requests"
        onTabPress={(t) => {
          if (t === "home") navigation.navigate("shelterDashboard");
          if (t === "animals") navigation.navigate("shelterAnimals");
          if (t === "donate") navigation.navigate("shelterDonate");
          if (t === "profile") navigation.navigate("shelterProfile");
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 24, paddingBottom: 120 },
  pageTitle: { color: colors.ink, ...typography.display },
  header: { flexDirection: "row", alignItems: "center" },
  segmented: { marginTop: 18 },
  row: { marginTop: 14, flexDirection: "row", alignItems: "center", gap: 14, padding: 14 },
  rowCopy: { flex: 1 },
  rowTitle: { color: colors.ink, ...typography.subtitle, fontWeight: "800" },
  rowSub: { marginTop: 4, color: colors.muted, ...typography.meta },
  rowTime: { marginTop: 4, color: colors.muted, ...typography.meta }
});
