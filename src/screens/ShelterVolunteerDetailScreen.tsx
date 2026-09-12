// US-V9 · the shelter's read-only detail view for one signup — reliability summary plus
// contact info, gated behind US-P0: the backend only includes `contact` on the response when
// the shelter is allowed to see it for this shift, so `detail.contact` may legitimately be
// absent and this screen must never assume otherwise.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { RootStackParamList } from "../navigation/types";
import { ChipTone, VolunteerDetail, reliabilityChip } from "../shelterVolunteer";
import { colors, elevation, radii, spacing, typography } from "../theme";
import { ScreenHeader } from "../components/ui";

function formatAddress(addr: { line1: string; barangay: string; city: string; province: string }): string {
  return [addr.line1, addr.barangay, addr.city, addr.province].filter(Boolean).join(", ");
}

type Props = NativeStackScreenProps<RootStackParamList, "shelterVolunteerDetail">;

export function ShelterVolunteerDetailScreen({ navigation, route }: Props) {
  const api = useApi();
  const { signupId } = route.params;

  const [detail, setDetail] = useState<VolunteerDetail | null>(null);
  // US-R4 · was three hand-rolled booleans that collapsed offline, 5xx and "deleted"
  // into one sentence. Keeping the RESULT lets the shared view say which it was — and
  // a 404 here is ordinary: these routes are reached from a push notification about a
  // shift that may since have been cancelled.
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);


  const load = useCallback(() => {
    setRes(null);
    api.get(`/shelter/signups/${signupId}/volunteer`).then((r) => {
      setRes({ ok: r.ok, status: r.status });
      if (r.ok) setDetail(r.data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus
  }, [signupId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const chip = detail ? reliabilityChip(detail.reliability) : null;

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Volunteer" onBack={() => navigation.goBack()} align="center" />

      {!detail ? (
        <LoadStateView state={loadState(res)} subject="volunteer" onRetry={load}
          onBack={() => navigation.goBack()} />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <Text style={styles.name}>{detail.display_name}</Text>
            {!!chip && (
              <View style={[styles.chip, CHIP_STYLE[chip.tone]]}>
                <Text style={[styles.chipText, CHIP_TEXT_STYLE[chip.tone]]}>{chip.label}</Text>
              </View>
            )}
            <Text style={styles.reliabilityLine}>
              {detail.reliability.shifts_completed} shift{detail.reliability.shifts_completed === 1 ? "" : "s"} ·{" "}
              {detail.reliability.no_shows} no-show{detail.reliability.no_shows === 1 ? "" : "s"}
            </Text>
          </View>

          <Text style={styles.sectionLabel}>Contact</Text>
          {detail.contact ? (
            <View style={styles.card}>
              {!!detail.contact.phone && (
                <View style={styles.contactRow}>
                  <Text style={styles.contactLabel}>Phone</Text>
                  <Text style={styles.contactValue}>{detail.contact.phone}</Text>
                </View>
              )}
              <View style={styles.contactRow}>
                <Text style={styles.contactLabel}>Email</Text>
                <Text style={styles.contactValue}>{detail.contact.email}</Text>
              </View>
              {!!detail.contact.address && (
                <View style={styles.contactRow}>
                  <Text style={styles.contactLabel}>Address</Text>
                  <Text style={styles.contactValue}>{formatAddress(detail.contact.address)}</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.mutedNote}>Contact not shared for this shift</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}


const CHIP_STYLE: Record<ChipTone, { backgroundColor: string }> = {
  done: { backgroundColor: colors.soft }, muted: { backgroundColor: colors.greyPill }, danger: { backgroundColor: colors.warningBg }
};
const CHIP_TEXT_STYLE: Record<ChipTone, { color: string }> = {
  done: { color: colors.tealDark }, muted: { color: colors.muted }, danger: { color: colors.warningStrong }
};

const card = {
  backgroundColor: colors.white, ...elevation.soft
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 16, paddingBottom: 60 },
  card: { borderRadius: radii.field, padding: 18, marginBottom: 18, ...card },
  name: { color: colors.ink, ...typography.section },
  chip: { alignSelf: "flex-start", marginTop: 10, paddingHorizontal: 12, height: 30, borderRadius: 15, justifyContent: "center" },
  chipText: { ...typography.meta, fontWeight: "800" },
  reliabilityLine: { marginTop: 12, color: colors.muted, ...typography.meta, fontWeight: "700" },
  sectionLabel: { marginBottom: 10, color: colors.muted, ...typography.meta, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase" },
  contactRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  contactLabel: { color: colors.muted, ...typography.meta, fontWeight: "700" },
  contactValue: { marginTop: 3, color: colors.ink, ...typography.strong, fontWeight: "700" },
  mutedNote: { color: colors.muted, ...typography.meta, fontStyle: "italic" }
});
