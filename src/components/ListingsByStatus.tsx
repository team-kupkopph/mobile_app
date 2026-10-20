// Spec 2026-10-06 §3 · the body shared by Shelter Animals and an individual poster's My listings:
// the poster's OWN listings (GET /listings?mine=true&status=<available|pending|adopted>, B-be1),
// segmented Live / Reserved / Adopted, with a strip of private drafts above them. Extracted whole
// from ShelterAnimalsScreen (Task B2); the two screens differ only in chrome and where a row goes.
import { useFocusEffect } from "@react-navigation/native";
import { ReactNode, useCallback, useRef, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Listing } from "../api/types";
import { useApi } from "../api/useApi";
import { loadState } from "../net";
import { ARCHIVED_STATUS, DRAFT_STATUS, SEGMENT_STATUS, applicantsChip, cardChip, listingInitial, listingTitle } from "../shelterAnimals";
import { TAP_SLOP } from "../touch";
import { colors, spacing, squircle, typography } from "../theme";
import { useLargeText } from "../useLargeText";
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
  // At Dynamic Type AX3 and up a row's photo, text and chip cannot share a line (the name truncated to "R1 Dr…"), so the row
  // stacks and its text may wrap.
  const large = useLargeText();
  const api = useApi();
  const [segment, setSegment] = useState(0);
  // AD10 · withdrawn listings, behind a link (the segmented control holds three). While showing them no segment is
  // selected (R8-F4), and tapping one returns to that segment.
  const [archived, setArchived] = useState(false);
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);
  // D7 · animals taken in from a rescuer's placement arrive as private drafts. Fetched on
  // their own, independent of the segment, and shown only when there are some — a failed
  // fetch shows nothing rather than claiming there are none.
  const [drafts, setDrafts] = useState<Listing[]>([]);

  // R1-F1 · the server pages at 20; `next` is the following page number, null on the last.
  const [next, setNext] = useState<number | null>(null);
  // Bumped on every page-1 load: an answer from an earlier segment (or a stale page 2) is dropped, so rows never mix statuses.
  const generation = useRef(0);
  const loadPage = useCallback((page: number) => {
      const gen = page === 1 ? ++generation.current : generation.current;
      if (page === 1) {
        setRes(null);
        setListings(null);
        setNext(null);
      }
      const status = archived ? ARCHIVED_STATUS : SEGMENT_STATUS[segment as keyof typeof SEGMENT_STATUS];
      api.get(`/listings?mine=true&status=${status}&page=${page}`).then((r) => {
        if (gen !== generation.current) return;
        if (page === 1) setRes({ ok: r.ok, status: r.status });
        if (!r.ok) return;
        setListings((prev) => (page === 1 ? (r.data?.results ?? []) : [...(prev ?? []), ...(r.data?.results ?? [])]));
        setNext(r.data?.next ?? null);
      });
      if (page === 1) {
        api.get(`/listings?mine=true&status=${DRAFT_STATUS}`).then((r) => {
          if (r.ok) setDrafts(r.data?.results ?? []);
        });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus + segment change
    }, [segment, archived]);
  // US-R1 · named so the same function serves the focus refetch AND the retry button.
  // Re-derived on every segment change too, same shape as AdoptScreen's species filter.
  const load = useCallback(() => loadPage(1), [loadPage]);
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
            Finish the details, then publish. Only you can see these.
          </Text>
          {drafts.map((d) => (
            <TouchableOpacity
              key={d.listing_id}
              style={[styles.draftRow, large && styles.draftRowLarge]}
              accessibilityRole="button"
              accessibilityLabel={`Finish the listing for ${d.pet.name || "this animal"}`}
              onPress={() => onOpenDraft(d.listing_id)}
            >
              <Text style={[styles.draftName, large && styles.draftNameLarge]} numberOfLines={large ? 3 : 1}>{listingTitle(d.pet.name)}</Text>
              <Chip tone="warning" dot={false} label="Draft" />
            </TouchableOpacity>
          ))}
        </Card>
      ) : null}

      <SegmentedControl
        segments={SEGMENTS}
        index={archived ? -1 : segment}
        onChange={(i) => {
          setArchived(false);
          setSegment(i);
        }}
        testID={segmentTestID}
        style={styles.segmented}
      />

      {actions}

      <TouchableOpacity hitSlop={TAP_SLOP} accessibilityRole="button" testID="btn.listings.archived"
        style={styles.archivedLink} onPress={() => setArchived((a) => !a)}>
        <Text style={styles.archivedLabel}>{archived ? "‹ Back to your listings" : "Archived listings ›"}</Text>
      </TouchableOpacity>

      {state.kind !== "ready" ? (
        <LoadStateView
          state={state}
          emptyTitle={archived ? "Nothing archived." : "No animals here yet."}
          emptyBody={archived ? "Listings you withdraw show up here." : 'Tap "+  List an animal" to post one.'}
          onRetry={load}
        />
      ) : (
        (listings ?? []).map((l) => {
          const chip = cardChip(l, archived);
          const applicants = applicantsChip(l.open_inquiries);
          const subtitle = [l.pet.breed ?? l.pet.species, l.city].filter(Boolean).join(" · ");
          return (
            <TouchableOpacity key={l.listing_id} activeOpacity={0.85} onPress={() => onOpen(l.listing_id)}>
              <Card style={[styles.row, large && styles.rowLarge]}>
                {l.photo_url ? (
                  <Image source={{ uri: l.photo_url }} style={styles.photo} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Text style={styles.photoGlyph} maxFontSizeMultiplier={1.2}>{listingInitial(l.pet.name)}</Text>
                  </View>
                )}
                <View style={[styles.rowCopy, large && styles.rowCopyLarge]}>
                  <Text style={styles.rowTitle} numberOfLines={large ? 3 : 1}>{listingTitle(l.pet.name)}</Text>
                  <Text style={styles.rowSub} numberOfLines={large ? 3 : 1}>{subtitle}</Text>
                  {applicants ? (
                    <View style={styles.rowApplicants}>
                      <Chip tone="info" dot={false} label={applicants} />
                    </View>
                  ) : null}
                </View>
                <Chip tone={chip.tone} dot={false} label={chip.label} />
              </Card>
            </TouchableOpacity>
          );
        })
      )}

      {state.kind === "ready" && next ? (
        <TouchableOpacity hitSlop={TAP_SLOP} accessibilityRole="button" testID="btn.listings.loadMore"
          style={styles.more} onPress={() => loadPage(next)}>
          <Text style={styles.archivedLabel}>Load more</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  segmented: { marginTop: 18 },
  archivedLink: { alignSelf: "flex-start", marginTop: 12, minHeight: 44, justifyContent: "center" },
  more: { alignSelf: "center", marginTop: 12, minHeight: 44, justifyContent: "center", paddingHorizontal: 16 },
  archivedLabel: { color: colors.teal, ...typography.strong, fontWeight: "700" },
  row: { marginTop: 14, flexDirection: "row", alignItems: "center", gap: 14, padding: 14 },
  draftsCard: { marginTop: 14, padding: spacing.lg },
  draftsTitle: { color: colors.ink, ...typography.subtitle, fontWeight: "800" },
  draftsSub: { marginTop: 4, marginBottom: 6, color: colors.muted, ...typography.meta, lineHeight: 17 },
  draftRow: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, borderTopWidth: 1, borderTopColor: colors.border },
  draftRowLarge: { flexDirection: "column", alignItems: "flex-start", gap: 6, paddingVertical: 10 },
  draftNameLarge: { alignSelf: "stretch", flexGrow: 0, flexBasis: "auto" },
  draftName: { flex: 1, color: colors.ink, ...typography.subtitle, fontWeight: "700" },
  photo: { width: 56, height: 56, borderRadius: squircle(56), backgroundColor: colors.border },
  photoPlaceholder: {
    width: 56, height: 56, borderRadius: squircle(56), backgroundColor: colors.teal,
    alignItems: "center", justifyContent: "center"
  },
  photoGlyph: { color: "#FFFFFF", ...typography.subtitle, fontWeight: "800" },
  rowCopy: { flex: 1 },
  // large: stacked. The base `rowCopy` is `flex: 1`, which survives in a style array and would collapse the text in a column.
  rowLarge: { flexDirection: "column", alignItems: "flex-start", gap: 10 },
  rowCopyLarge: { marginLeft: 0, alignSelf: "stretch", flexGrow: 0, flexBasis: "auto" },
  rowTitle: { color: colors.ink, ...typography.subtitle, fontWeight: "800" },
  rowSub: { marginTop: 4, color: colors.muted, ...typography.meta },
  rowApplicants: { marginTop: 8, alignSelf: "flex-start" }
});
