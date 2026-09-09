// US-A4 · the adopter's own inquiries with each one's stage progress.
// GET /me/inquiries. "Both sides see the same state" — this reads the same stage rows the
// poster's advance writes.
//
// US-H3: a direct placement (US-H2) is also an AdoptionInquiry with `adopter_account` set to
// the recipient — CasePlaceView creates every stage row and immediately marks it SKIPPED (the
// bypass), so "every stage is skipped" is the client-side signal that this row is a placement
// awaiting the recipient's decision, not a real inquiry working through the normal ladder.
// There's no separate flag on the wire for this — it's derived from `stages`, same as
// inquiryProgressLabel() below derives its label from the same array.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { MyInquiry } from "../api/types";
import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { inquiryProgressLabel } from "../adoption";
import { RootStackParamList } from "../navigation/types";
import { TAP_SLOP } from "../touch";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { colors } from "../theme";
import { Chip, type ChipTone } from "../components/ui";


// inquiry_status (not stage state): active/adopted/declined/withdrawn.
// Mapped onto the SHARED status vocabulary (chipTones) rather than carrying its own colours.
// adopted/declined/withdrawn were already exact matches for success/danger/neutral.
// ⚠️ `active` is the one value that moves: its tint goes from `soft` (#E7F0EF) to the shared
// `info` (#E2EEF0). Same foreground, and the design system's own rule is that a status reuses
// this mapping rather than inventing a colour per feature. Contrast is unchanged in practice —
// tealDark clears 7:1 on both.
const STATUS_TONE: Record<string, { tone: ChipTone; label: string }> = {
  active: { tone: "info", label: "Active" },
  adopted: { tone: "success", label: "Adopted" },
  declined: { tone: "danger", label: "Declined" },
  withdrawn: { tone: "neutral", label: "Withdrawn" }
};

// See the file header: every stage SKIPPED is the direct-placement bypass. `some` guards
// against an inquiry with no stage rows at all (shouldn't happen, but "every" on an empty
// array is vacuously true) reading as a false-positive placement.
function isPlacement(iq: MyInquiry): boolean {
  return iq.stages.length > 0 && iq.stages.every((s) => s.state === "skipped");
}

type Props = NativeStackScreenProps<RootStackParamList, "myInquiries">;

export function MyInquiriesScreen({ navigation }: Props) {
  const api = useApi();
  const [inquiries, setInquiries] = useState<MyInquiry[]>([]);
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);


  const load = useCallback(() => {
    setRes(null);
    api.get("/me/inquiries").then((r) => {
      setRes({ ok: r.ok, status: r.status });
      if (r.ok) setInquiries(r.data?.results ?? []);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus
  }, []);
  useFocusEffect(load);

  return (
    <View style={styles.screen} testID="screen.myInquiries">
      <ScreenBackdrop />
      <View style={styles.header}>
        <TouchableOpacity testID="btn.back" onPress={() => navigation.goBack()} style={styles.back} hitSlop={12}
          accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backGlyph}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My inquiries</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loadState(res, inquiries.length).kind !== "ready" ? (
          <LoadStateView
            state={loadState(res, inquiries.length)}
            emptyTitle="You haven't inquired on any pets yet."
            onRetry={load}
          />
        ) : (
          inquiries.map((iq) => {
            const tone = STATUS_TONE[iq.status] ?? STATUS_TONE.active;
            const placement = isPlacement(iq);
            const pendingPlacement = placement && iq.status === "active";
            // A placement still awaiting the recipient's decision goes to the accept/decline
            // screen; a decided placement (or a normal inquiry) goes to the listing like today.
            function onPress() {
              if (pendingPlacement) navigation.navigate("placeRequest", { inquiryId: iq.inquiry_id });
              else navigation.navigate("listingDetail", { listingId: iq.listing.listing_id });
            }
            return (
              <TouchableOpacity
                key={iq.inquiry_id}
                style={styles.card}
                activeOpacity={0.85}
                onPress={onPress}
              >
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardName}>{iq.listing.name}</Text>
                    <Text style={styles.cardMeta}>{capitalize(iq.listing.species)}</Text>
                  </View>
                  <Chip label={tone.label} tone={tone.tone} />
                </View>
                {pendingPlacement ? (
                  <Text style={styles.placementNote}>Placement offer — tap to accept or decline</Text>
                ) : (
                  <Text style={styles.progress}>{inquiryProgressLabel(iq.stages)}</Text>
                )}
                {/* US-T2 · the "Share your adoption story" CTA goes live on an adopted inquiry
                    (was a dead control), opening compose prefilled with this listing. */}
                {iq.status === "adopted" ? (
                  <TouchableOpacity hitSlop={TAP_SLOP}
                    style={styles.shareStory}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate("storyCompose",
                      { adoptionListingId: iq.listing.listing_id })}
                  >
                    <Text style={styles.shareStoryLabel}>Share your adoption story ›</Text>
                  </TouchableOpacity>
                ) : null}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

const card = {
  backgroundColor: colors.white, shadowColor: colors.shadowCast, shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08, shadowRadius: 7, elevation: 2
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "transparent" },
  header: { paddingTop: 58, paddingHorizontal: 26, paddingBottom: 6, flexDirection: "row", alignItems: "center", gap: 16 },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", ...card },
  backGlyph: { color: colors.ink, fontSize: 30, fontWeight: "800", marginTop: -4 },
  title: { color: colors.ink, fontSize: 22, fontWeight: "800" },
  content: { paddingHorizontal: 26, paddingTop: 16, paddingBottom: 60 },
  card: { padding: 18, borderRadius: 20, marginBottom: 12, ...card },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  cardName: { color: colors.ink, fontSize: 18, fontWeight: "800" },
  cardMeta: { marginTop: 4, color: colors.muted, fontSize: 14 },
  progress: { marginTop: 12, color: colors.teal, fontSize: 14, fontWeight: "700" },
  placementNote: { marginTop: 12, color: colors.teal, fontSize: 14, fontWeight: "800" },
  shareStory: { marginTop: 14, alignSelf: "flex-start", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, backgroundColor: colors.successBg },
  shareStoryLabel: { color: colors.success, fontSize: 14.5, fontWeight: "700" },
  empty: { marginTop: 40, color: colors.muted, fontSize: 16, textAlign: "center" }
});
