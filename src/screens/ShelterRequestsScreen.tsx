// Task B3 · the shelter's Requests tab root (spec §5's "Requests" row). New screen, V3 from
// birth — the LAST of ShelterTabs' five tabs to stop being dead (see `surfaceV3.test.ts`'s
// `findDeadTabs`). Segmented Adoption/Volunteer/Placement over B-be2's merged inbox —
// GET /shelter/requests?kind=<adoption|volunteer|placement>&status=open — one endpoint
// across three unrelated backend models. A row opens `requestRoute(item)`: adoption and
// placement both land on the same inquiry ladder (the shelter reads it either as the
// poster or as the placement recipient), volunteer opens that shift's activity timeline
// on the Pending section (Task 9 folded the old standalone requests queue into it).
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ShelterRequest } from "../api/types";
import { useApi } from "../api/useApi";
import { AdoptIcon, MailIcon, VolunteerIcon } from "../components/AppIcons";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { EMPTY_PAGED, PagedState, createPagedList } from "../pagedList";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { ShelterTabs } from "../components/ShelterTabs";
import { shelterTabNavigate } from "../shelterTabs";
import { Card, Chip, SegmentedControl } from "../components/ui";
import { RootStackParamList } from "../navigation/types";
import {
  DEFAULT_STATUS_TONE, REQUEST_KIND_TILE, REQUEST_STATUS_TONE, SEGMENT_KIND, requestCountLine, requestRoute,
  requestsEmptyCopy
} from "../shelterRequests";
import { TAP_SLOP } from "../touch";
import { colors, maxFontScale, spacing, squircle, typography } from "../theme";
import { useLargeText } from "../useLargeText";

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
  // At Dynamic Type AX3 and up a row's title and status chip cannot share a line (the animal's name truncated to "R5 N…"),
  // so the row stacks and its text may wrap.
  const large = useLargeText();
  const insets = useSafeAreaInsets();
  const api = useApi();
  const [segment, setSegment] = useState(0);
  // SH3 / SH6 · B-be2 pages at 20, newest first, so page 1 alone hid the OLDEST requests (the people waiting longest);
  // and a slow answer for the previous segment could overwrite the current one. createPagedList reads every page
  // ("Load more") and drops any answer for a segment that is no longer showing.
  const [paged, setPaged] = useState<PagedState<ShelterRequest>>(EMPTY_PAGED);
  const apiRef = useRef(api);
  apiRef.current = api;
  const [list] = useState(() => createPagedList<ShelterRequest>((path) => apiRef.current.get(path), setPaged));
  const requests = paged.items;

  // Named so the same function serves the focus refetch AND the retry button — same shape
  // as ShelterAnimalsScreen's `load`. Re-derived on every segment change too.
  const load = useCallback(() => {
      const kind = SEGMENT_KIND[segment as keyof typeof SEGMENT_KIND];
      list.reset(`/shelter/requests?kind=${kind}&status=open`);
    }, [segment, list]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const state = loadState(paged.res, requests?.length);
  // V3 · the artboard's count line and per-segment empty state. The count is the server's total, not the rows on
  // screen: those stop at 20 until Load more.
  const countLine = requestCountLine(paged.count, SEGMENTS[segment]);
  const empty = requestsEmptyCopy(SEGMENTS[segment]);

  return (
    <View style={styles.screen} testID="screen.shelterRequests">
      <ScreenBackdrop />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]} showsVerticalScrollIndicator={false}>
        {/* A real wrapper, not a bare <Text> — the screen's ONE conditional LoadStateView
            branch below needs an intervening <View> between it and the root so it never reads
            as the "replaces the whole screen" shape offlineEscape.test.ts /
            safeAreaOnFailure.test.ts scan for; this one genuinely groups the title. */}
        <View style={styles.header}>
          <Text style={styles.pageTitle} maxFontSizeMultiplier={maxFontScale.title}>Requests</Text>
        </View>

        <SegmentedControl
          segments={SEGMENTS}
          index={segment}
          onChange={setSegment}
          testID="seg.shelterRequests"
          style={styles.segmented}
        />

        {state.kind === "ready" && countLine ? <Text style={styles.countLine}>{countLine}</Text> : null}

        {state.kind !== "ready" ? (
          <LoadStateView
            state={state}
            emptyTitle={empty.title}
            emptyBody={empty.body}
            onRetry={load}
          />
        ) : (
          (requests ?? []).map((item) => {
            const chip = REQUEST_STATUS_TONE[item.status] ?? DEFAULT_STATUS_TONE;
            const tile = REQUEST_KIND_TILE[item.kind] ?? REQUEST_KIND_TILE.adoption;
            // Branch on the route name rather than spreading `route.params` into a generic
            // `navigate` call — same shape as NotificationsScreen's own target dispatch —
            // so each call stays fully typed against RootStackParamList instead of an `any`.
            const route = requestRoute(item);
            function onPress() {
              // R2-F2 · dispatch on route.name directly rather than collapsing non-volunteer
              // routes into the inquiry ladder. `requestRoute` returns `placeRequest` for a
              // placement still awaiting this shelter's decision (shelterRequests.ts:71) —
              // the ladder behind that case has every stage SKIPPED and no buttons, so a
              // row that falls through to `inquiry` strands the shelter with no way to
              // Accept/Decline from the inbox (Sagip test plan Run 2 R2-F2). Enumerated so
              // adding a new route forces a decision rather than silently defaulting.
              if (route.name === "shelterVolunteerActivity") {
                navigation.navigate("shelterVolunteerActivity", { shiftId: route.params.shiftId, section: "pending" });
              } else if (route.name === "placeRequest") {
                navigation.navigate("placeRequest", { inquiryId: route.params.inquiryId });
              } else if (route.name === "applicant") {
                navigation.navigate("applicant", { inquiryId: route.params.inquiryId });
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
                <Card style={[styles.row, large && styles.rowLarge]}>
                  {/* V3 · the kind glyph tile: what tells the three kinds apart at a glance. Decorative: the
                      segment already says which kind this is. */}
                  <View testID={`tile.shelterRequests.${item.kind}`} style={[styles.tile, { backgroundColor: tile.bg }]}
                    accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                    {tile.icon === "mail" ? <MailIcon color={colors.tealDark} size={20} />
                      : tile.icon === "volunteer" ? <VolunteerIcon color={colors.warningStrong} size={20} />
                      : <AdoptIcon color={colors.danger} size={20} />}
                  </View>
                  <View style={[styles.rowCopy, large && styles.rowCopyLarge]}>
                    <Text style={styles.rowTitle} numberOfLines={large ? 3 : 1}>{item.title}</Text>
                    <Text style={styles.rowSub} numberOfLines={large ? 3 : 1}>{item.subtitle}</Text>
                  </View>
                  <View style={[styles.rowSide, large && styles.rowSideLarge]}>
                    <Chip tone={chip.tone} dot={false} label={chip.label} />
                    <Text style={styles.rowTime}>{timeAgo(item.created_at)}</Text>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })
        )}

        {state.kind === "ready" && paged.next ? (
          <TouchableOpacity hitSlop={TAP_SLOP} accessibilityRole="button" testID="btn.shelterRequests.loadMore"
            style={styles.more} onPress={() => list.more()}>
            <Text style={styles.moreLabel}>{paged.moreFailed ? "Couldn't load more. Try again" : "Load more"}</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      <ShelterTabs
        active="requests"
        onTabPress={(t) => shelterTabNavigate(navigation, t)}
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
  // large: stacked. The base `rowCopy` is `flex: 1`, which survives in a style array and would collapse the text in a column.
  rowLarge: { flexDirection: "column", alignItems: "flex-start", gap: 10 },
  rowCopyLarge: { marginLeft: 0, alignSelf: "stretch", flexGrow: 0, flexBasis: "auto" },
  rowTitle: { color: colors.ink, ...typography.subtitle, fontWeight: "800" },
  rowSub: { marginTop: 4, color: colors.muted, ...typography.meta },
  rowTime: { color: colors.muted, ...typography.meta },
  // The artboard's 44 pt squircle tile.
  tile: { width: 44, height: 44, borderRadius: squircle(44), alignItems: "center", justifyContent: "center" },
  rowSide: { alignItems: "flex-end", gap: 6 },
  rowSideLarge: { alignItems: "flex-start" },
  countLine: { marginTop: 16, color: colors.muted, ...typography.meta, fontWeight: "700" },
  more: { alignSelf: "center", marginTop: 12, minHeight: 44, justifyContent: "center", paddingHorizontal: 16 },
  moreLabel: { color: colors.teal, ...typography.strong, fontWeight: "700" }
});
