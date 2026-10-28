// US-H3 · the recipient's own pets — the ones a rescuer/shelter placed with them, or that
// they adopted. Reference: sibling list screens (MyReportsScreen, MyOffersScreen). GET /me/pets.
// PP12 · a row opens the pet's own screen, where its actions live. PQ2 · below the list, the pets
// this account rehomed through Kupkop, read-only, as they were when they left.
// PP14 · each card says what the pet is in the middle of (listed, a draft, removed, lost) and
// carries one action: its listing, or the way to list it. The action is its own button below the
// row, not nested in it, so VoiceOver reaches both.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { TAP_SLOP } from "../touch";

import { MyPet, RehomedPet } from "../api/types";
import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { RootStackParamList } from "../navigation/types";
import { colors, elevation, radii, spacing, squircle, typography } from "../theme";
import { Button, Chip, ScreenHeader } from "../components/ui";
import { MY_PETS_EMPTY, REHOMED_TITLE, petCardAction, petChips, rehomedLine } from "../petForm";


function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

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

  return (
    <View style={styles.screen}>
      <ScreenHeader title="My pets" onBack={() => navigation.goBack()}
        right={<Button size="small" label="+ Add" testID="btn.myPets.add" onPress={() => navigation.navigate("petForm")} />} />

      {/* US-R3 · this screen already split loading / error / empty by hand, and got it right.
          Consolidating onto LoadStateView keeps that and adds the one distinction its own
          `error` boolean could not make: offline vs the server refusing. */}
      {loadState(res, pets.length + rehomed.length).kind !== "ready" ? (
        <View style={styles.centerFill}>
          <LoadStateView
            state={loadState(res, pets.length + rehomed.length)}
            emptyTitle={MY_PETS_EMPTY}
            onRetry={load}
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {pets.map((p) => {
            const chips = petChips(p);
            const action = petCardAction(p);
            return (
              <View key={p.pet_id} style={styles.cardBox}>
                <TouchableOpacity style={styles.cardRow} activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={[p.name, p.species, ...chips.map((ch) => ch.label)].join(", ")}
                  testID={`row.myPets.${p.pet_id}`}
                  onPress={() => navigation.navigate("petDetail", { petId: p.pet_id })}>
                  {p.photo_url ? (
                    <Image source={{ uri: p.photo_url }} style={styles.thumb} resizeMode="cover" />
                  ) : (
                    <View style={styles.thumb} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{p.name}</Text>
                    <Text style={styles.cardMeta}>{capitalize(p.species)}</Text>
                    {chips.length ? (
                      <View style={styles.chips}>
                        {chips.map((ch) => <Chip key={ch.label} label={ch.label} tone={ch.tone} />)}
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.chevron} allowFontScaling={false}>›</Text>
                </TouchableOpacity>
                <TouchableOpacity hitSlop={TAP_SLOP} accessibilityRole="button" style={styles.cardAction}
                  testID={`btn.myPets.action.${p.pet_id}`}
                  onPress={() => action.route === "posterListing"
                    ? navigation.navigate("posterListing", action.params)
                    : navigation.navigate("listingForm", action.params)}>
                  <Text style={styles.cardActionLabel}>{action.label} ›</Text>
                </TouchableOpacity>
              </View>
            );
          })}
          {rehomed.length ? (
            <>
              <Text style={styles.section} accessibilityRole="header">{REHOMED_TITLE}</Text>
              {rehomed.map((h, i) => (
                <View key={`${h.rehomed_at}-${i}`} style={[styles.card, styles.rehomed]} testID="row.myPets.rehomed">
                  {h.photo_url ? (
                    <Image source={{ uri: h.photo_url }} style={styles.thumb} resizeMode="cover" />
                  ) : (
                    <View style={styles.thumb} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{h.name}</Text>
                    <Text style={styles.cardMeta}>{rehomedLine(h.rehomed_at)}</Text>
                  </View>
                </View>
              ))}
            </>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const card = {
  backgroundColor: colors.white, ...elevation.soft
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 16, paddingBottom: 60 },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 },
  card: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderRadius: radii.field, marginBottom: 12, ...card },
  thumb: { width: 64, height: 64, borderRadius: squircle(64), backgroundColor: colors.border },
  chevron: { color: colors.muted, ...typography.section },
  cardBox: { padding: 14, borderRadius: radii.field, marginBottom: 12, ...card },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  cardAction: { alignSelf: "flex-start", marginTop: 6, marginLeft: 78, minHeight: 44, justifyContent: "center" },
  cardActionLabel: { color: colors.teal, ...typography.strong, fontWeight: "700" },
  section: { marginTop: 20, marginBottom: 10, color: colors.ink, ...typography.section },
  rehomed: { opacity: 0.85 },
  cardTitle: { color: colors.ink, ...typography.section },
  cardMeta: { marginTop: 6, color: colors.muted, ...typography.meta }
});
