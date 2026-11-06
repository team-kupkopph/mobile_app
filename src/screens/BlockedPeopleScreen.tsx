// Review step 7d · the people you have blocked, and the way to undo it. Reached from Settings.
//
// Shows names only: the server never hands back an account id, only the id of the BLOCK, which is what Unblock takes.
// Unblocking is immediate: it is the safe direction, and a person who changed their mind should not need a dialog.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { Avatar, Card, ScreenHeader } from "../components/ui";
import type { BlockedPerson } from "../moderation";
import { loadState } from "../net";
import { RootStackParamList } from "../navigation/types";
import { TAP_SLOP } from "../touch";
import { colors, spacing, typography } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "blockedPeople">;

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");

export function BlockedPeopleScreen({ navigation }: Props) {
  const api = useApi();
  const [people, setPeople] = useState<BlockedPerson[]>([]);
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);

  const load = useCallback(() => {
    setRes(null);
    api.get("/me/blocks").then((r) => {
      setRes({ ok: r.ok, status: r.status });
      if (r.ok) setPeople(r.data?.results ?? []);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(load, [load]);

  async function unblock(person: BlockedPerson) {
    const r = await api.del(`/me/blocks/${person.block_id}`);
    if (!r.ok) { Alert.alert("Could not unblock", "Try again."); return; }
    setPeople((rows) => rows.filter((p) => p.block_id !== person.block_id));
  }

  return (
    <View style={styles.screen} testID="screen.blockedPeople">
      <ScreenHeader title="Blocked people" onBack={() => navigation.goBack()} />
      {!res?.ok ? (
        <LoadStateView state={loadState(res)} subject="blocked list" onRetry={load}
          onBack={() => navigation.goBack()} />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.lede}>
            You and a blocked person will not see each other's posts or be able to contact each other. They are not told.
            Anything already under way between you, such as an adoption, carries on.
          </Text>
          {people.length === 0 ? (
            <Text style={styles.empty} testID="txt.blockedPeople.empty">You have not blocked anyone.</Text>
          ) : (
            <Card style={styles.card}>
              {people.map((p) => (
                <View key={p.block_id} style={styles.row} testID={`row.blockedPeople.${p.block_id}`}>
                  <Avatar initials={initials(p.display_name)} size={44} />
                  <Text style={styles.name}>{p.display_name}</Text>
                  <TouchableOpacity hitSlop={TAP_SLOP} onPress={() => { void unblock(p); }} accessibilityRole="button"
                    accessibilityLabel={`Unblock ${p.display_name}`} testID={`btn.blockedPeople.unblock.${p.block_id}`}>
                    <Text style={styles.unblock}>Unblock</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </Card>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 20, paddingBottom: 60 },
  lede: { color: colors.muted, ...typography.body, marginBottom: 22 },
  empty: { color: colors.ink, ...typography.subtitle, fontWeight: "700", textAlign: "center", marginTop: 40 },
  card: { paddingVertical: 6, paddingHorizontal: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 14, minHeight: 64 },
  name: { flex: 1, color: colors.ink, ...typography.strong, fontWeight: "700" },
  unblock: { color: colors.teal, ...typography.meta, fontWeight: "700" }
});
