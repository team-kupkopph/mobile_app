// AD18 · the Adopt tab's Saved segment: the listings swiped right on, to come back to.
// GET /me/shortlist/listings (paginated). Saving itself still happens on the deck (useShortlist).
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Listing } from "../api/types";
import { useApi } from "../api/useApi";
import { loadState } from "../net";
import { RootStackParamList } from "../navigation/types";
import { SAVED_EMPTY, savedFee, savedMeta, savedStatus } from "../savedList";
import { TAP_SLOP } from "../touch";
import { useLargeText } from "../useLargeText";
import { colors, elevation, maxFontScale, radii, squircle, typography } from "../theme";
import { LoadStateView } from "./LoadStateView";
import { Chip } from "./ui";

export function SavedList() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  // At AX3 and up the photo | name | chip row cannot share a line, so it stacks.
  const large = useLargeText();
  const api = useApi();
  const [rows, setRows] = useState<Listing[]>([]);
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);
  const [next, setNext] = useState<number | null>(null);

  const load = useCallback((page: number) => {
    if (page === 1) setRes(null);
    api.get(`/me/shortlist/listings?page=${page}`).then((r) => {
      if (page === 1) setRes({ ok: r.ok, status: r.status });
      if (!r.ok) return;
      setRows((prev) => (page === 1 ? r.data?.results ?? [] : [...prev, ...(r.data?.results ?? [])]));
      setNext(r.data?.next ?? null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus
  }, []);
  useFocusEffect(useCallback(() => { load(1); }, [load]));

  const state = loadState(res, rows.length);
  if (state.kind !== "ready") {
    return <LoadStateView state={state} emptyTitle={SAVED_EMPTY} onRetry={() => load(1)} />;
  }
  return (
    <>
      {rows.map((l) => {
        const status = savedStatus(l.status);
        return (
          <TouchableOpacity key={l.listing_id} activeOpacity={0.85} accessibilityRole="button"
            testID={`card.saved.${l.listing_id}`} style={[styles.card, large && styles.cardLarge]}
            onPress={() => navigation.navigate("listingDetail", { listingId: l.listing_id })}>
            {l.photo_url ? <Image source={{ uri: l.photo_url }} style={styles.photo} /> : <View style={styles.photo} />}
            <View style={large ? styles.copyLarge : styles.copy}>
              <Text style={styles.name} maxFontSizeMultiplier={maxFontScale.title} numberOfLines={large ? undefined : 1}>
                {l.pet.name || "Unnamed"}
              </Text>
              <Text style={styles.meta} numberOfLines={large ? undefined : 1}>{savedMeta(l)}</Text>
              <Text style={styles.meta}>{savedFee(l)}</Text>
            </View>
            <Chip label={status.label} tone={status.tone} dot={false} />
          </TouchableOpacity>
        );
      })}
      {next ? (
        <TouchableOpacity hitSlop={TAP_SLOP} accessibilityRole="button" style={styles.more} onPress={() => load(next)}>
          <Text style={styles.moreLabel}>Load more</Text>
        </TouchableOpacity>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: radii.card, backgroundColor: colors.white, ...elevation.soft },
  // large: the rows stack, and `flex: 0` (not just dropping `flex: 1`) is what survives in a style array (#189).
  cardLarge: { flexDirection: "column", alignItems: "flex-start" },
  photo: { width: 62, height: 62, borderRadius: squircle(62), backgroundColor: colors.soft },
  copy: { flex: 1 },
  copyLarge: { flex: 0, alignSelf: "stretch", flexGrow: 0, flexBasis: "auto" },
  name: { color: colors.ink, ...typography.subtitle, fontWeight: "800" },
  meta: { marginTop: 3, color: colors.muted, ...typography.meta },
  more: { alignSelf: "center", marginTop: 12, minHeight: 44, justifyContent: "center", paddingHorizontal: 16 },
  moreLabel: { color: colors.teal, ...typography.strong, fontWeight: "700" }
});
