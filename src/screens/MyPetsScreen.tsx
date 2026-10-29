// US-H3 · the recipient's own pets — the ones a rescuer/shelter placed with them, or that
// they adopted. GET /me/pets.
// PP12 · a row opens the pet's own screen, where its actions live. PQ2 · below the list, the pets
// this account rehomed through Kupkop, read-only, as they were when they left.
// PP14 · each card says what the pet is in the middle of (listed, a draft, removed, lost) and
// carries one action: its listing, or the way to list it. The action is its own button below the
// row, not nested in it, so VoiceOver reaches both.
// Step 11 · V3, following the "My pets" artboard (design/mobile-v3/MyPets.dc.html, approved
// 2026-10-29): the mesh backdrop, one Card per pet with its action under a hairline, a quieter
// Rehomed card, and a first-run Empty card whose one primary is Add a pet (the header's + Add
// appears once there are pets).
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { MyPet, RehomedPet } from "../api/types";
import { useApi } from "../api/useApi";
import { AdoptIcon } from "../components/AppIcons";
import { LoadStateView } from "../components/LoadStateView";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { Button, Card, Chip, ScreenHeader } from "../components/ui";
import { loadState } from "../net";
import { RootStackParamList } from "../navigation/types";
import { MY_PETS_EMPTY, REHOMED_TITLE, ageLabel, capitalize, petCardAction, petChips, rehomedLine } from "../petForm";
import { TAP_SLOP } from "../touch";
import { colors, spacing, squircle, typography } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "myPets">;

export function MyPetsScreen({ navigation }: Props) {
  const api = useApi();
  const [pets, setPets] = useState<MyPet[]>([]);
  const [rehomed, setRehomed] = useState<RehomedPet[]>([]);
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);

  const load = useCallback(() => {
    setRes(null);
    api.get("/me/pets").then((r) => {
      setRes({ ok: r.ok, status: r.status });
      if (r.ok) { setPets(r.data?.results ?? []); setRehomed(r.data?.rehomed ?? []); }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // US-R3 · loading, offline and a server refusal stay LoadStateView's; an empty list is this
  // screen's own designed state (the artboard's Empty), so it is not passed a count.
  const state = loadState(res);
  const addPet = () => navigation.navigate("petForm");

  return (
    <View style={styles.screen} testID="screen.myPets">
      <ScreenBackdrop />
      <ScreenHeader title="My pets" onBack={() => navigation.goBack()}
        right={pets.length ? <Button size="small" label="+ Add" testID="btn.myPets.add" onPress={addPet} /> : undefined} />

      {state.kind !== "ready" ? (
        <View style={styles.centerFill}>
          <LoadStateView state={state} onRetry={load} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {pets.length === 0 ? (
            <Card style={styles.emptyCard} testID="card.myPets.empty">
              <View style={styles.emptyIcon}><AdoptIcon color={colors.teal} size={32} /></View>
              <Text style={styles.emptyText}>{MY_PETS_EMPTY}</Text>
              <Button label="Add a pet" onPress={addPet} testID="btn.myPets.addFirst" style={styles.emptyButton} />
            </Card>
          ) : null}

          {pets.map((p) => {
            const chips = petChips(p);
            const action = petCardAction(p);
            const meta = [capitalize(p.species), ageLabel(p.birthdate)].filter(Boolean).join(" · ");
            return (
              <Card key={p.pet_id} style={styles.petCard}>
                <TouchableOpacity style={styles.petRow} activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={[p.name, meta, ...chips.map((ch) => ch.label)].join(", ")}
                  testID={`row.myPets.${p.pet_id}`}
                  onPress={() => navigation.navigate("petDetail", { petId: p.pet_id })}>
                  {p.photo_url ? (
                    <Image source={{ uri: p.photo_url }} style={styles.thumb} resizeMode="cover" />
                  ) : (
                    <View style={[styles.thumb, styles.thumbEmpty]}><AdoptIcon color={colors.teal} size={30} /></View>
                  )}
                  <View style={styles.petText}>
                    <Text style={styles.petName}>{p.name}</Text>
                    <Text style={styles.petMeta}>{meta}</Text>
                    {chips.length ? (
                      <View style={styles.chips}>
                        {chips.map((ch) => <Chip key={ch.label} label={ch.label} tone={ch.tone} />)}
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.chevron} allowFontScaling={false}>›</Text>
                </TouchableOpacity>
                <View style={styles.hairline} />
                <TouchableOpacity hitSlop={TAP_SLOP} accessibilityRole="button" style={styles.cardAction}
                  testID={`btn.myPets.action.${p.pet_id}`}
                  onPress={() => action.route === "posterListing"
                    ? navigation.navigate("posterListing", action.params)
                    : navigation.navigate("listingForm", action.params)}>
                  <Text style={styles.cardActionLabel}>{action.label} ›</Text>
                </TouchableOpacity>
              </Card>
            );
          })}

          {rehomed.length ? (
            <>
              <Text style={styles.section} accessibilityRole="header">{REHOMED_TITLE}</Text>
              <Card style={styles.rehomedCard} testID="card.myPets.rehomed">
                {rehomed.map((h, i) => (
                  <View key={`${h.rehomed_at}-${i}`} style={styles.rehomedRow} testID="row.myPets.rehomed">
                    {h.photo_url ? (
                      <Image source={{ uri: h.photo_url }} style={styles.rehomedThumb} resizeMode="cover" />
                    ) : (
                      <View style={[styles.rehomedThumb, styles.rehomedThumbEmpty]}><AdoptIcon color={colors.muted} size={22} /></View>
                    )}
                    <View style={styles.petText}>
                      <Text style={styles.rehomedName}>{h.name}</Text>
                      <Text style={styles.petMeta}>{rehomedLine(h.rehomed_at)}</Text>
                    </View>
                  </View>
                ))}
              </Card>
            </>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 60 },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 },
  petCard: { marginBottom: 14, paddingHorizontal: 6, paddingTop: 6, paddingBottom: 4 },
  petRow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 10 },
  thumb: { width: 62, height: 62, borderRadius: squircle(62), backgroundColor: colors.soft },
  thumbEmpty: { alignItems: "center", justifyContent: "center" },
  petText: { flex: 1, minWidth: 0 },
  petName: { color: colors.ink, ...typography.section },
  petMeta: { marginTop: 2, color: colors.muted, ...typography.meta, fontWeight: "700" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  chevron: { color: colors.muted, ...typography.section },
  hairline: { height: 1, marginHorizontal: 10, backgroundColor: colors.border },
  cardAction: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center", paddingHorizontal: 10 },
  cardActionLabel: { color: colors.teal, ...typography.strong, fontWeight: "800" },
  section: { marginTop: 12, marginBottom: 12, color: colors.ink, ...typography.section },
  rehomedCard: { padding: 6, opacity: 0.86 },
  rehomedRow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 10 },
  rehomedThumb: { width: 48, height: 48, borderRadius: squircle(48), backgroundColor: colors.greyPill },
  rehomedThumbEmpty: { alignItems: "center", justifyContent: "center" },
  rehomedName: { color: colors.muted, ...typography.subtitle, fontWeight: "800" },
  emptyCard: { marginTop: 10, paddingVertical: 28, paddingHorizontal: 20, alignItems: "center", backgroundColor: colors.soft },
  emptyIcon: { width: 64, height: 64, borderRadius: squircle(64), alignItems: "center", justifyContent: "center", backgroundColor: colors.white },
  emptyText: { marginTop: 14, color: colors.muted, ...typography.subtitle, fontWeight: "700", textAlign: "center" },
  emptyButton: { marginTop: 18, alignSelf: "stretch" }
});
