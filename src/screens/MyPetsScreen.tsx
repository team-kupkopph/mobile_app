// US-H3 · the recipient's own pets — the ones a rescuer/shelter placed with them, or that
// they adopted. Reference: sibling list screens (MyReportsScreen, MyOffersScreen). GET /me/pets.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from "react-native";

import { MyPet } from "../api/types";
import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { RootStackParamList } from "../navigation/types";
import { colors, elevation, radii, spacing, typography } from "../theme";
import { ScreenHeader } from "../components/ui";


function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

type Props = NativeStackScreenProps<RootStackParamList, "myPets">;

export function MyPetsScreen({ navigation }: Props) {
  const api = useApi();
  const [pets, setPets] = useState<MyPet[]>([]);
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);


  const load = useCallback(() => {
    setRes(null);
    api.get("/me/pets").then((r) => {
      setRes({ ok: r.ok, status: r.status });
      if (r.ok) setPets(r.data?.results ?? []);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={styles.screen}>
      <ScreenHeader title="My pets" onBack={() => navigation.goBack()} />

      {/* US-R3 · this screen already split loading / error / empty by hand, and got it right.
          Consolidating onto LoadStateView keeps that and adds the one distinction its own
          `error` boolean could not make: offline vs the server refusing. */}
      {loadState(res, pets.length).kind !== "ready" ? (
        <View style={styles.centerFill}>
          <LoadStateView
            state={loadState(res, pets.length)}
            emptyTitle="Pets you adopt will appear here."
            onRetry={load}
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {pets.map((p) => (
            <View key={p.pet_id} style={styles.card}>
              {p.photo_url ? (
                <Image source={{ uri: p.photo_url }} style={styles.thumb} resizeMode="cover" />
              ) : (
                <View style={[styles.thumb, styles.thumbEmpty]} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{p.name}</Text>
                <Text style={styles.cardMeta}>{capitalize(p.species)}</Text>
              </View>
            </View>
          ))}
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
  thumb: { width: 64, height: 64, borderRadius: 16, backgroundColor: colors.border },
  thumbEmpty: {},
  cardTitle: { color: colors.ink, ...typography.section },
  cardMeta: { marginTop: 6, color: colors.muted, ...typography.meta },
  empty: { color: colors.muted, ...typography.subtitle, textAlign: "center" }
});
