// Task B2 · the shelter's Animals tab root (spec §5's "Animals" row). New screen, V3 from
// birth — the fifth of ShelterTabs' five tabs to stop being dead (see `surfaceV3.test.ts`'s
// `findDeadTabs`). Segmented Live/Pending/Adopted over the shelter's OWN listings —
// GET /listings?mine=true&status=<available|pending|adopted> (B-be1). The "+ List an
// animal" CTA used to live on ShelterDashboardScreen; it moves here with this task, next to
// the listings it actually creates.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Listing } from "../api/types";
import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { ShelterTabs } from "../components/ShelterTabs";
import { Button, Card, Chip, SegmentedControl } from "../components/ui";
import { RootStackParamList } from "../navigation/types";
import { ListingStatus, SEGMENT_STATUS, STATUS_CHIP } from "../shelterAnimals";
import { colors, spacing, squircle, typography } from "../theme";

/** The canvas's Animals artboard: ["Live", "Pending", "Adopted"] — see shelterAnimals.ts's
 * SEGMENT_STATUS for the status each maps onto on the wire. */
const SEGMENTS = ["Live", "Pending", "Adopted"];

type Props = NativeStackScreenProps<RootStackParamList, "shelterAnimals">;

export function ShelterAnimalsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const api = useApi();
  const [segment, setSegment] = useState(0);
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);

  // US-R1 · named so the same function serves the focus refetch AND the retry button.
  // Re-derived on every segment change too, same shape as AdoptScreen's species filter.
  const load = useCallback(() => {
      setRes(null);
      setListings(null);
      const status = SEGMENT_STATUS[segment as keyof typeof SEGMENT_STATUS];
      api.get(`/listings?mine=true&status=${status}`).then((r) => {
        setRes({ ok: r.ok, status: r.status });
        if (r.ok) setListings(r.data?.results ?? []);
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus + segment change
    }, [segment]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const state = loadState(res, listings?.length);

  return (
    <View style={styles.screen} testID="screen.shelterAnimals">
      <ScreenBackdrop />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]} showsVerticalScrollIndicator={false}>
        {/* A real wrapper, not a bare <Text> — the screen's ONE conditional LoadStateView
            branch below needs an intervening <View> between it and the root so it never reads
            as the "replaces the whole screen" shape offlineEscape.test.ts /
            safeAreaOnFailure.test.ts scan for; this one genuinely groups the title. */}
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Animals</Text>
        </View>

        <SegmentedControl
          segments={SEGMENTS}
          index={segment}
          onChange={setSegment}
          testID="seg.shelterAnimals"
          style={styles.segmented}
        />

        <Button
          label="+  List an animal"
          onPress={() => navigation.navigate("listingForm", undefined)}
          style={styles.primaryButton}
        />

        {state.kind !== "ready" ? (
          <LoadStateView
            state={state}
            emptyTitle="No animals here yet."
            emptyBody='Tap "+  List an animal" to post one.'
            onRetry={load}
          />
        ) : (
          (listings ?? []).map((l) => {
            const chip = STATUS_CHIP[l.status as ListingStatus] ?? STATUS_CHIP.available;
            const subtitle = [l.pet.breed ?? l.pet.species, l.city].filter(Boolean).join(" · ");
            return (
              <TouchableOpacity
                key={l.listing_id}
                activeOpacity={0.85}
                onPress={() => navigation.navigate("listingDetail", { listingId: l.listing_id })}
              >
                <Card style={styles.row}>
                  {l.photo_url ? (
                    <Image source={{ uri: l.photo_url }} style={styles.photo} />
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Text style={styles.photoGlyph}>{l.pet.name.charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={styles.rowCopy}>
                    <Text style={styles.rowTitle} numberOfLines={1}>{l.pet.name}</Text>
                    <Text style={styles.rowSub} numberOfLines={1}>{subtitle}</Text>
                  </View>
                  <Chip tone={chip.tone} dot={false} label={chip.label} />
                </Card>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <ShelterTabs
        active="animals"
        onTabPress={(t) => {
          if (t === "home") navigation.navigate("shelterDashboard");
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
  primaryButton: { marginTop: 18 },
  row: { marginTop: 14, flexDirection: "row", alignItems: "center", gap: 14, padding: 14 },
  photo: { width: 56, height: 56, borderRadius: squircle(56), backgroundColor: colors.border },
  photoPlaceholder: {
    width: 56, height: 56, borderRadius: squircle(56), backgroundColor: colors.teal,
    alignItems: "center", justifyContent: "center"
  },
  photoGlyph: { color: "#FFFFFF", ...typography.subtitle, fontWeight: "800" },
  rowCopy: { flex: 1 },
  rowTitle: { color: colors.ink, ...typography.subtitle, fontWeight: "800" },
  rowSub: { marginTop: 4, color: colors.muted, ...typography.meta }
});
