// Task 9 · the Pending tab of the activity timeline — the old ShelterVolunteerRequestsScreen's
// cards, rendering only. Every action (approve/decline/picker/re-approval) comes from
// `useRequestActions`, moved verbatim; this file owns just the list fetch and the JSX.
import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { ActivityIndicator, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useApi } from "../../api/useApi";
import { LoadStateView } from "../LoadStateView";
import { loadState } from "../../net";
import { AlertIcon } from "../AppIcons";
import { ConfirmModal } from "../ConfirmModal";
import { PendingRequest, ShelterShift, reapprovalCopy, reliabilityChip } from "../../shelterVolunteer";
import { TAP_SLOP } from "../../touch";
import { colors, radii, squircle, typography } from "../../theme";
import { Avatar, Button, Card, ChipTone, chipTones } from "../ui";
import { useRequestActions } from "./useRequestActions";

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

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

type Props = {
  shiftId: string;
  shift: ShelterShift | null;
  onOpenDetail: (signupId: string) => void;
  /** Reported every time the fetch settles — the screen needs the count to pick the initial
   * SegmentedControl tab and to label it "Pending · N". */
  onCountSettled?: (count: number | null) => void;
};

export function PendingSection({ shiftId, shift, onOpenDetail, onCountSettled }: Props) {
  const api = useApi();
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  // US-R2 · PRIMARY for this section — a failed load must not read as "0 pending".
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);

  const loadRequests = useCallback(() => {
    setRes(null);
    api.get(`/shelter/shifts/${shiftId}/requests`).then((r) => {
      setRes({ ok: r.ok, status: r.status });
      if (r.ok) {
        const rows = r.data?.results ?? [];
        setRequests(rows);
        onCountSettled?.(rows.length);
      } else {
        onCountSettled?.(null);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus
  }, [shiftId]);

  useFocusEffect(useCallback(() => { loadRequests(); }, [loadRequests]));

  const actions = useRequestActions(shiftId, shift, loadRequests);
  const reapproveRow = actions.reapprove
    ? requests.find((r) => r.signup_id === actions.reapprove!.signupId)
    : undefined;
  const reapproveName = reapproveRow?.volunteer.display_name ?? "This volunteer";
  const reapproveCopy = actions.reapprove ? reapprovalCopy(reapproveName, actions.reapprove.details) : null;

  const state = loadState(res);

  return (
    <View>
      {!!actions.banner && (
        <View style={styles.bannerBox}>
          <Text style={styles.bannerText}>{actions.banner}</Text>
        </View>
      )}

      {state.kind !== "ready" ? (
        <LoadStateView state={state} subject="requests" onRetry={loadRequests} />
      ) : requests.length === 0 ? (
        <Text style={styles.empty}>No pending requests right now.</Text>
      ) : (
        requests.map((row) => {
          const chip = reliabilityChip(row.reliability);
          const busy = actions.busySignupId === row.signup_id;
          // Approve stays in its `loading` state (spinner in place of the label) until the
          // shift's type is known — IMPORTANT 1: approving a walking shift before then would
          // silently skip the animal picker with no way to attach a listing afterward.
          const approveBusy = busy || !shift;
          return (
            <Card key={row.signup_id} style={styles.card}>
              <TouchableOpacity activeOpacity={0.85} onPress={() => onOpenDetail(row.signup_id)}>
                <View style={styles.cardTop}>
                  <Avatar initials={initials(row.volunteer.display_name)} size={44} />
                  <View style={{ flex: 1 }}>
                    <View style={styles.nameRow}>
                      <Text style={styles.name}>{row.volunteer.display_name}</Text>
                      {row.is_verified_member && (
                        <View style={[styles.chip, CHIP_STYLE.info]}>
                          <Text style={[styles.chipText, CHIP_TEXT_STYLE.info]}>Verified Member</Text>
                        </View>
                      )}
                    </View>
                    {!!row.requested_at && (
                      <Text style={styles.requestedAt}>requested {timeAgo(row.requested_at)}</Text>
                    )}
                    {row.previously_declined && (
                      <Text style={styles.declinedNote}>Declined once before</Text>
                    )}
                  </View>
                  {!!chip && (
                    <View style={[styles.chip, CHIP_STYLE[chip.tone]]}>
                      <Text style={[styles.chipText, CHIP_TEXT_STYLE[chip.tone]]}>{chip.label}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              {row.reliability.needs_reapproval && (
                <View style={styles.flagStrip}>
                  <AlertIcon color={colors.warningStrong} size={26} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.flagTitle}>Needs re-approval</Text>
                    <Text style={styles.flagSub}>
                      {row.reliability.consecutive_no_shows} no-show{row.reliability.consecutive_no_shows === 1 ? "" : "s"} in a row
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.actionsRow}>
                <Button size="small" variant="secondary" label="Decline" accessibilityLabel={`Decline ${row.volunteer.display_name}`} onPress={() => actions.doDecline(row.signup_id)} style={styles.half} />
                <Button size="small" label="Approve" accessibilityLabel={`Approve ${row.volunteer.display_name}`} onPress={() => actions.onPressApprove(row.signup_id)} loading={approveBusy} style={styles.half} />
              </View>
            </Card>
          );
        })
      )}

      {/* D-S5-3 — the walking-shift animal picker. Non-walking shifts never open this. */}
      <Modal visible={actions.pickerSignupId !== null} transparent animationType="slide" onRequestClose={() => actions.onPickListing(null)}>
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Assign an animal</Text>
              <TouchableOpacity onPress={() => actions.onPickListing(null)} hitSlop={TAP_SLOP}>
                <Text style={styles.pickerClose}>Close</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.pickerSub}>Optional — pick which of your animals this volunteer will walk.</Text>

            <ScrollView style={styles.pickerList} showsVerticalScrollIndicator={false}>
              {!actions.listingsLoaded ? (
                <ActivityIndicator color={colors.teal} style={{ marginTop: 20 }} />
              ) : actions.listingsError ? (
                <Text style={styles.empty}>Couldn't load your animals. You can still skip.</Text>
              ) : actions.listings.length === 0 ? (
                <Text style={styles.empty}>No animals listed yet. You can still skip.</Text>
              ) : (
                actions.listings.map((l) => (
                  <TouchableOpacity
                    key={l.listing_id}
                    activeOpacity={0.85}
                    onPress={() => actions.onPickListing(l.listing_id)}
                  >
                    <Card style={styles.animalCard}>
                      {l.photo_url ? (
                        <Image source={{ uri: l.photo_url }} style={styles.animalPhoto} resizeMode="cover" />
                      ) : (
                        <View style={[styles.animalPhoto, styles.animalPhotoEmpty]} />
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.animalName}>{l.pet.name}</Text>
                        <Text style={styles.animalSpecies}>{capitalize(l.pet.species)}</Text>
                      </View>
                    </Card>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <TouchableOpacity style={styles.skipBtn} activeOpacity={0.85} onPress={() => actions.onPickListing(null)}>
              <Text style={styles.skipText}>Skip — approve without assigning an animal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* K11 · the no-show re-approval disclosure — server-enforced 409, this is just the ack. */}
      <ConfirmModal
        visible={!!actions.reapprove}
        title={reapproveCopy?.title ?? ""}
        body={reapproveCopy?.body ?? ""}
        confirmLabel="Approve anyway"
        tone="danger"
        secondaryLabel="Decline instead"
        onSecondary={() => {
          // Guard against a double-tap firing two concurrent declines, same as the row
          // buttons' own busy-signup guard.
          if (actions.reapprove && !actions.busySignupId) actions.doDecline(actions.reapprove.signupId);
        }}
        onConfirm={() => {
          // Same double-tap guard as onSecondary above — a second "Approve anyway" before the
          // first resolves would fire two concurrent approves (the 2nd a harmless not_pending,
          // but no reason to send it).
          if (actions.reapprove && !actions.busySignupId) {
            actions.doApprove(actions.reapprove.signupId, actions.reapprove.assignedListingId, true);
          }
        }}
        onCancel={actions.dismissReapprove}
      />
    </View>
  );
}

const CHIP_STYLE: Record<ChipTone, { backgroundColor: string }> = Object.fromEntries(
  Object.entries(chipTones).map(([tone, { bg }]) => [tone, { backgroundColor: bg }])
) as Record<ChipTone, { backgroundColor: string }>;
const CHIP_TEXT_STYLE: Record<ChipTone, { color: string }> = Object.fromEntries(
  Object.entries(chipTones).map(([tone, { fg }]) => [tone, { color: fg }])
) as Record<ChipTone, { color: string }>;

const styles = StyleSheet.create({
  empty: { color: colors.muted, ...typography.body, textAlign: "center", marginTop: 8 },
  bannerBox: { marginBottom: 12, borderRadius: radii.notice, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: colors.dangerBg },
  bannerText: { color: colors.danger, ...typography.meta, fontWeight: "700", textAlign: "center" },
  card: { padding: 16, marginBottom: 14 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  name: { color: colors.ink, ...typography.subtitle, fontWeight: "800" },
  requestedAt: { marginTop: 2, color: colors.muted, ...typography.meta },
  declinedNote: { marginTop: 2, color: colors.muted, ...typography.meta, fontStyle: "italic" },
  chip: { paddingHorizontal: 12, height: 30, borderRadius: 15, justifyContent: "center" },
  chipText: { ...typography.meta, fontWeight: "800" },
  flagStrip: {
    marginTop: 12, borderRadius: radii.notice, paddingVertical: 10, paddingHorizontal: 12,
    flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.warningBg
  },
  flagTitle: { color: colors.warningStrong, ...typography.meta, fontWeight: "800" },
  flagSub: { marginTop: 1, color: colors.warningStrong, ...typography.meta },
  actionsRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  half: { flex: 1, alignSelf: "stretch" },
  pickerOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(18, 33, 58, 0.45)" },
  pickerSheet: { maxHeight: "78%", borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: colors.page, paddingHorizontal: 22, paddingTop: 20, paddingBottom: 28 },
  pickerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pickerTitle: { color: colors.ink, ...typography.section },
  pickerClose: { color: colors.teal, ...typography.meta, fontWeight: "800" },
  pickerSub: { marginTop: 6, color: colors.muted, ...typography.meta },
  pickerList: { marginTop: 14 },
  animalCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, marginBottom: 10 },
  animalPhoto: { width: 52, height: 52, borderRadius: squircle(52) },
  animalPhotoEmpty: { backgroundColor: colors.greyPill },
  animalName: { color: colors.ink, ...typography.strong, fontWeight: "800" },
  animalSpecies: { marginTop: 2, color: colors.muted, ...typography.meta },
  skipBtn: { marginTop: 8, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center", backgroundColor: colors.soft },
  skipText: { color: colors.tealDark, ...typography.meta, fontWeight: "800" }
});
