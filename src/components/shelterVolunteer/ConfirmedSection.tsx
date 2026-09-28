// Task 9 · the Confirmed tab of the activity timeline — approved roster rows, with a
// re-assign-animal picker and a "Remove" that frees the slot. Owns its own
// GET /shelter/shifts/{id}/roster fetch so a failed load shows ITS OWN retry (US-R2) rather
// than a confident, wrong "0 confirmed".
import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { ActivityIndicator, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useApi } from "../../api/useApi";
import { LoadStateView } from "../LoadStateView";
import { loadState } from "../../net";
import { ConfirmModal } from "../ConfirmModal";
import { ListingCard, RosterRow, ShelterShift } from "../../shelterVolunteer";
import { TAP_SLOP } from "../../touch";
import { colors, radii, squircle, typography } from "../../theme";
import { Avatar, Card, Chip } from "../ui";

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
  /** Reported every time the roster fetch settles, over just the approved rows — the screen
   * needs it for the "Confirmed · N" segment label. */
  onCountSettled?: (count: number | null) => void;
};

export function ConfirmedSection({ shiftId, shift, onOpenDetail, onCountSettled }: Props) {
  const api = useApi();
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);

  const [banner, setBanner] = useState<string | null>(null);
  const [busySignupId, setBusySignupId] = useState<string | null>(null);

  const [pickerSignupId, setPickerSignupId] = useState<string | null>(null);
  const [listings, setListings] = useState<ListingCard[]>([]);
  const [listingsLoaded, setListingsLoaded] = useState(false);
  const [listingsError, setListingsError] = useState(false);

  const [removeSignupId, setRemoveSignupId] = useState<string | null>(null);

  const loadRoster = useCallback(() => {
    setRes(null);
    api.get(`/shelter/shifts/${shiftId}/roster`).then((r) => {
      setRes({ ok: r.ok, status: r.status });
      if (r.ok) {
        const rows: RosterRow[] = r.data?.results ?? [];
        setRoster(rows);
        onCountSettled?.(rows.filter((row) => row.status === "approved").length);
      } else {
        onCountSettled?.(null);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus
  }, [shiftId]);

  useFocusEffect(useCallback(() => { loadRoster(); }, [loadRoster]));

  function loadListingsIfNeeded() {
    if (listingsLoaded) return;
    api.get("/listings?mine=true").then((r) => {
      if (r.ok) {
        setListings(r.data?.results ?? []);
        setListingsError(false);
      } else {
        setListingsError(true);
      }
      setListingsLoaded(true);
    });
  }

  function openPicker(signupId: string) {
    loadListingsIfNeeded();
    setPickerSignupId(signupId);
  }

  async function reassign(listingId: string | null) {
    const signupId = pickerSignupId;
    setPickerSignupId(null);
    if (!signupId) return;
    setBusySignupId(signupId);
    setBanner(null);
    const res = await api.patch(`/shelter/signups/${signupId}`, { assigned_listing_id: listingId });
    setBusySignupId(null);
    if (res.ok) {
      loadRoster();
    } else {
      setBanner(res.data?.error?.message ?? "Couldn't change the assigned animal. Try again.");
    }
  }

  async function confirmRemove() {
    const signupId = removeSignupId;
    setRemoveSignupId(null);
    if (!signupId || busySignupId) return;
    setBusySignupId(signupId);
    setBanner(null);
    const res = await api.post(`/shelter/signups/${signupId}/remove`);
    setBusySignupId(null);
    if (res.ok) {
      loadRoster();
    } else {
      setBanner(res.data?.error?.message ?? "Couldn't remove this volunteer. Try again.");
    }
  }

  const approved = roster.filter((row) => row.status === "approved");
  const removeRow = removeSignupId ? approved.find((r) => r.signup_id === removeSignupId) : undefined;
  const state = loadState(res);

  return (
    <View>
      {!!banner && (
        <View style={styles.bannerBox}>
          <Text style={styles.bannerText}>{banner}</Text>
        </View>
      )}

      {state.kind !== "ready" ? (
        <LoadStateView state={state} subject="roster" onRetry={loadRoster} />
      ) : approved.length === 0 ? (
        <Text style={styles.empty}>No one's confirmed yet.</Text>
      ) : (
        approved.map((row) => {
          const busy = busySignupId === row.signup_id;
          return (
            <TouchableOpacity key={row.signup_id} activeOpacity={0.85} onPress={() => onOpenDetail(row.signup_id)} disabled={busy}>
              <Card style={styles.card}>
                <View style={styles.cardTop}>
                  <Avatar initials={initials(row.volunteer.display_name)} size={44} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{row.volunteer.display_name}</Text>
                    {shift?.type === "walking" && (
                      <View style={styles.animalRow}>
                        <Text style={styles.animalLabel}>
                          {row.assigned_animal ? `Walking ${row.assigned_animal.name}` : "No animal assigned"}
                        </Text>
                        <TouchableOpacity hitSlop={TAP_SLOP} onPress={() => openPicker(row.signup_id)}>
                          <Text style={styles.changeLink}>Change</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                  {row.contact_shared && <Chip label="Contact shared" tone="neutral" />}
                </View>

                <TouchableOpacity
                  style={styles.removeBtn}
                  hitSlop={TAP_SLOP}
                  onPress={() => setRemoveSignupId(row.signup_id)}
                  disabled={busy}
                >
                  <Text style={styles.removeText}>{busy ? "Removing…" : "Remove"}</Text>
                </TouchableOpacity>
              </Card>
            </TouchableOpacity>
          );
        })
      )}

      {/* The re-assign-animal picker — walking shifts only; opened from a row's "Change". */}
      <Modal visible={pickerSignupId !== null} transparent animationType="slide" onRequestClose={() => setPickerSignupId(null)}>
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Change the assigned animal</Text>
              <TouchableOpacity onPress={() => setPickerSignupId(null)} hitSlop={TAP_SLOP}>
                <Text style={styles.pickerClose}>Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.pickerList} showsVerticalScrollIndicator={false}>
              {!listingsLoaded ? (
                <ActivityIndicator color={colors.teal} style={{ marginTop: 20 }} />
              ) : listingsError ? (
                <Text style={styles.empty}>Couldn't load your animals. You can still clear it.</Text>
              ) : listings.length === 0 ? (
                <Text style={styles.empty}>No animals listed yet.</Text>
              ) : (
                listings.map((l) => (
                  <TouchableOpacity key={l.listing_id} activeOpacity={0.85} onPress={() => reassign(l.listing_id)}>
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

            <TouchableOpacity style={styles.skipBtn} activeOpacity={0.85} onPress={() => reassign(null)}>
              <Text style={styles.skipText}>Clear — no animal assigned</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ConfirmModal
        visible={!!removeSignupId}
        title={`Remove ${removeRow?.volunteer.display_name ?? "this volunteer"}?`}
        body="They'll be told the plan changed. It won't count against them."
        confirmLabel="Remove"
        tone="danger"
        onConfirm={confirmRemove}
        onCancel={() => setRemoveSignupId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { color: colors.muted, ...typography.body, textAlign: "center", marginTop: 8 },
  bannerBox: { marginBottom: 12, borderRadius: radii.notice, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: colors.dangerBg },
  bannerText: { color: colors.danger, ...typography.meta, fontWeight: "700", textAlign: "center" },
  card: { padding: 16, marginBottom: 14 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  name: { color: colors.ink, ...typography.subtitle, fontWeight: "800" },
  animalRow: { marginTop: 4, flexDirection: "row", alignItems: "center", gap: 10 },
  animalLabel: { color: colors.muted, ...typography.meta },
  changeLink: { color: colors.teal, ...typography.meta, fontWeight: "800" },
  removeBtn: { marginTop: 14, alignSelf: "flex-start", height: 44, justifyContent: "center" },
  removeText: { color: colors.danger, ...typography.meta, fontWeight: "800" },
  pickerOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(18, 33, 58, 0.45)" },
  pickerSheet: { maxHeight: "78%", borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: colors.page, paddingHorizontal: 22, paddingTop: 20, paddingBottom: 28 },
  pickerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pickerTitle: { color: colors.ink, ...typography.section },
  pickerClose: { color: colors.teal, ...typography.meta, fontWeight: "800" },
  pickerList: { marginTop: 14 },
  animalCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, marginBottom: 10 },
  animalPhoto: { width: 52, height: 52, borderRadius: squircle(52) },
  animalPhotoEmpty: { backgroundColor: colors.greyPill },
  animalName: { color: colors.ink, ...typography.strong, fontWeight: "800" },
  animalSpecies: { marginTop: 2, color: colors.muted, ...typography.meta },
  skipBtn: { marginTop: 8, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center", backgroundColor: colors.soft },
  skipText: { color: colors.tealDark, ...typography.meta, fontWeight: "800" }
});
