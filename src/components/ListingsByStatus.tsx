// Spec 2026-10-06 §3 · the body shared by Shelter Animals and an individual poster's My listings:
// the poster's OWN listings (GET /listings?mine=true&status=<available|pending|adopted>, B-be1),
// segmented Live / Reserved / Adopted, with a strip of private drafts above them. Extracted whole
// from ShelterAnimalsScreen (Task B2); the two screens differ only in chrome and where a row goes.
import { useFocusEffect } from "@react-navigation/native";
import { ReactNode, useCallback, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Listing } from "../api/types";
import { useApi } from "../api/useApi";
import { loadState } from "../net";
import { DRAFT_STATUS, ListingStatus, SEGMENT_STATUS, STATUS_CHIP, applicantsChip } from "../shelterAnimals";
import { colors, spacing, squircle, typography } from "../theme";
import { LoadStateView } from "./LoadStateView";
import { Card, Chip, SegmentedControl } from "./ui";

/** The canvas's Animals artboard: ["Live", "Reserved", "Adopted"] — see shelterAnimals.ts's
 * SEGMENT_STATUS for the status each maps onto on the wire ("Reserved" is the wire's `pending`). */
const SEGMENTS = ["Live", "Reserved", "Adopted"];

type Props = {
  onOpen: (listingId: string) => void;
  onOpenDraft: (listingId: string) => void;
  /** Rendered between the segments and the rows — where "+ List an animal" sits. */
  actions?: ReactNode;
  segmentTestID?: string;
};

export function ListingsByStatus({ onOpen, onOpenDraft, actions, segmentTestID }: Props) {
  const api = useApi();
  const [segment, setSegment] = useState(0);
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);
  // D7 · animals taken in from a rescuer's placement arrive as private drafts. Fetched on
  // their own, independent of the segment, and shown only when there are some — a failed
  // fetch shows nothing rather than claiming there are none.
  const [drafts, setDrafts] = useState<Listing[]>([]);

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
      api.get(`/listings?mine=true&status=${DRAFT_STATUS}`).then((r) => {
        if (r.ok) setDrafts(r.data?.results ?? []);
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus + segment change
    }, [segment]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const state = loadState(res, listings?.length);

  return (
    <View>
      {drafts.length > 0 ? (
        <Card style={styles.draftsCard}>
          <Text style={styles.draftsTitle}>
            {drafts.length === 1 ? "1 draft to finish" : `${drafts.length} drafts to finish`}
          </Text>
          <Text style={styles.draftsSub}>
            Taken in from a rescue. Add a story and fee, then publish. Only you can see these.
          </Text>
          {drafts.map((d) => (
            <TouchableOpacity
              key={d.listing_id}
              style={styles.draftRow}
              accessibilityRole="button"
              accessibilityLabel={`Finish the listing for ${d.pet.name || "this animal"}`}
              onPress={() => onOpenDraft(d.listing_id)}
            >
              <Text style={styles.draftName} numberOfLines={1}>{d.pet.name || "Unnamed"}</Text>
              <Chip tone="warning" dot={false} label="Draft" />
            </TouchableOpacity>
          ))}
        </Card>
      ) : null}

      <SegmentedControl
        segments={SEGMENTS}
        index={segment}
        onChange={setSegment}
        testID={segmentTestID}
        style={styles.segmented}
      />

      {actions}

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
          const applicants = applicantsChip(l.open_inquiries);
          const subtitle = [l.pet.breed ?? l.pet.species, l.city].filter(Boolean).join(" · ");
          return (
            <TouchableOpacity key={l.listing_id} activeOpacity={0.85} onPress={() => onOpen(l.listing_id)}>
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
                {applicants ? <Chip tone="info" dot={false} label={applicants} /> : null}
              </Card>
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  segmented: { marginTop: 18 },
  row: { marginTop: 14, flexDirection: "row", alignItems: "center", gap: 14, padding: 14 },
  draftsCard: { marginTop: 14, padding: spacing.lg },
  draftsTitle: { color: colors.ink, ...typography.subtitle, fontWeight: "800" },
  draftsSub: { marginTop: 4, marginBottom: 6, color: colors.muted, ...typography.meta, lineHeight: 17 },
  draftRow: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, borderTopWidth: 1, borderTopColor: colors.border },
  draftName: { flex: 1, color: colors.ink, ...typography.subtitle, fontWeight: "700" },
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
