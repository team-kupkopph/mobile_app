// PP12 (My Pets review 2026-10-28) · one pet: what the owner entered, and everything they can do
// with it — edit, list it for adoption (or open the listing it has), report it lost, or remove it.
// Before this, My pets rows were a dead end and GET /me/pets/{id} only prefilled a listing.
// Removing archives the pet (PQ1); the server refuses while a listing describes it.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";

import { PetDetail } from "../api/types";
import { useApi } from "../api/useApi";
import { ConfirmModal } from "../components/ConfirmModal";
import { LoadStateView } from "../components/LoadStateView";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { Button, Card, Chip, ScreenHeader, SegmentedControl } from "../components/ui";
import { loadState } from "../net";
import { RootStackParamList } from "../navigation/types";
import {
  LIST_PET_LABEL, REMOVE_PET_BODY, REMOVE_REASONS, RemoveReason, VIEW_LISTING_LABEL, ageLabel, petActionError, petChips
} from "../petForm";
import { colors, spacing, squircle, typography } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "petDetail">;

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** The facts the owner entered, in reading order; a blank one is left out rather than shown empty.
 *  The age is not one of them: it already sits under the name. */
function facts(p: PetDetail): [string, string][] {
  const rows: [string, string | null][] = [
    ["Breed", p.breed],
    ["Sex", p.sex && p.sex !== "unknown" ? cap(p.sex) : null],
    ["Size", p.size_category ? cap(p.size_category) : null],
    ["Colour and markings", p.color_markings],
    ["Spayed / neutered", p.spayed_neutered === null ? null : p.spayed_neutered ? "Yes" : "No"],
    ["Temperament", p.temperament],
    ["Medical notes", p.medical_conditions],
    ["Vet", p.vet_contact]
  ];
  return rows.filter((r): r is [string, string] => !!r[1]);
}

export function PetDetailScreen({ navigation, route }: Props) {
  const api = useApi();
  const { petId } = route.params;
  const [pet, setPet] = useState<PetDetail | null>(null);
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);
  const [removing, setRemoving] = useState(false);
  const [reason, setReason] = useState<RemoveReason>("other");
  const [error, setError] = useState<string | undefined>(undefined);

  const load = useCallback(() => {
    setRes(null);
    api.get(`/me/pets/${petId}`).then((r) => {
      setRes({ ok: r.ok, status: r.status });
      if (r.ok) setPet(r.data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus, keyed by petId
  }, [petId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function remove() {
    setRemoving(false);
    setError(undefined);
    const r = await api.del(`/me/pets/${petId}`, { reason });
    if (r.ok) { navigation.goBack(); return; }
    setError(petActionError(r.data?.error?.code) ?? r.data?.error?.message ?? "Couldn't remove it. Try again.");
    load();
  }

  if (!pet) {
    return (
      <View style={styles.screen} testID="screen.petDetail">
        <ScreenBackdrop />
        <ScreenHeader title="Pet" onBack={() => navigation.goBack()} />
        <LoadStateView state={loadState(res)} subject="pet" onRetry={load} onBack={() => navigation.goBack()} />
      </View>
    );
  }

  const age = ageLabel(pet.birthdate);
  const listing = pet.open_listing;
  return (
    <View style={styles.screen} testID="screen.petDetail">
      <ScreenBackdrop />
      <ScreenHeader title={pet.name} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card tone="hero" style={styles.card}>
          {pet.photos[0] ? (
            <Image source={{ uri: pet.photos[0] }} style={styles.photo} resizeMode="cover"
              accessibilityLabel={`Photo of ${pet.name}`} />
          ) : null}
          <Text style={styles.title}>{pet.name}</Text>
          <Text style={styles.sub}>{[cap(pet.species), age].filter(Boolean).join(" · ")}</Text>
          {petChips(pet).length ? (
            <View style={styles.chipRow}>
              {petChips(pet).map((ch) => <Chip key={ch.label} label={ch.label} tone={ch.tone} />)}
            </View>
          ) : null}
        </Card>

        {facts(pet).length ? (
          <Card style={styles.card}>
            {facts(pet).map(([label, value]) => (
              <View key={label} style={styles.fact}>
                <Text style={styles.factLabel}>{label}</Text>
                <Text style={styles.factValue}>{value}</Text>
              </View>
            ))}
          </Card>
        ) : null}

        {error ? <Text style={styles.error} testID="text.petDetail.error">{error}</Text> : null}

        <Button label="Edit details" variant="secondary" style={styles.action} testID="btn.petDetail.edit"
          onPress={() => navigation.navigate("petForm", { petId })} />
        {listing ? (
          <Button label={VIEW_LISTING_LABEL} variant="secondary" style={styles.action} testID="btn.petDetail.listing"
            onPress={() => navigation.navigate("posterListing", { listingId: listing.listing_id })} />
        ) : (
          <Button label={LIST_PET_LABEL} variant="secondary" style={styles.action} testID="btn.petDetail.list"
            onPress={() => navigation.navigate("listingForm", { petId })} />
        )}
        {/* PP14 · a pet already reported lost opens that report; offering a second one would file a duplicate. */}
        {pet.lost_report_id ? (
          <Button label="View lost report" variant="secondary" style={styles.action} testID="btn.petDetail.lostReport"
            onPress={() => navigation.navigate("reportDetail", { reportId: pet.lost_report_id! })} />
        ) : (
          <Button label="Report lost" variant="secondary" style={styles.action} testID="btn.petDetail.lost"
            onPress={() => navigation.navigate("reportStray", { mode: "lost", petId })} />
        )}
        <Button label="Remove from My pets" variant="destructive" style={styles.action} testID="btn.petDetail.remove"
          onPress={() => { setError(undefined); setRemoving(true); }} />
      </ScrollView>

      <ConfirmModal visible={removing} tone="danger" title={`Remove ${pet.name}?`} body={REMOVE_PET_BODY}
        confirmLabel="Remove" onConfirm={remove} onCancel={() => setRemoving(false)}>
        <SegmentedControl testID="seg.petDetail.reason" segments={REMOVE_REASONS.map((r) => r.label)}
          index={REMOVE_REASONS.findIndex((r) => r.value === reason)}
          onChange={(i) => setReason(REMOVE_REASONS[i].value)} />
      </ConfirmModal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 48 },
  card: { marginTop: 14, padding: spacing.lg },
  photo: { width: "100%", height: 220, borderRadius: squircle(56), backgroundColor: colors.soft, marginBottom: 16 },
  title: { color: colors.ink, ...typography.title },
  sub: { marginTop: 4, color: colors.muted, ...typography.subtitle },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
  fact: { paddingVertical: 10 },
  factLabel: { color: colors.muted, ...typography.meta, fontWeight: "600" },
  factValue: { marginTop: 2, color: colors.ink, ...typography.strong },
  error: { marginTop: 18, color: colors.danger, ...typography.strong, fontWeight: "700" },
  action: { marginTop: 12 }
});
