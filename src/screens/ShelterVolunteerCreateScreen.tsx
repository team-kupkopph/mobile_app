// US-V9 · post a new volunteer activity. Reference: ShelterVolunteerActivityScreen for style,
// ListingFormScreen for the form/chip patterns. POST /shelter/shifts.
//
// Deliberately NO title field and NO animal control — ShiftCreateSerializer only accepts
// {type, starts_at, ends_at, capacity}; the animal is assigned when a request is approved
// (Task 8), not at posting time.
//
// No datetime picker exists anywhere in this app yet (grepped — nothing pulls in
// @react-native-community/datetimepicker), so per the task brief this uses plain controlled
// text inputs for the ISO datetimes rather than adding a new dependency for one slice.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { RootStackParamList } from "../navigation/types";
import { ShiftType, shiftTypeLabel } from "../volunteer";
import { colors, elevation, radii, spacing, typography } from "../theme";
import { Button, ScreenHeader } from "../components/ui";

const SHIFT_TYPES: ShiftType[] = ["walking", "feeding", "visitor", "event", "facility", "transport"];


const card = {
  backgroundColor: colors.white, ...elevation.soft
};

type Props = NativeStackScreenProps<RootStackParamList, "shelterVolunteerCreate">;

export function ShelterVolunteerCreateScreen({ navigation }: Props) {
  const api = useApi();

  const [type, setType] = useState<ShiftType>("walking");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [capacity, setCapacity] = useState("1");
  const [error, setError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (submitting) return;
    setError(undefined);

    if (!startsAt.trim() || !endsAt.trim()) {
      setError("Enter a start and end time.");
      return;
    }
    const cap = parseInt(capacity, 10);
    if (!Number.isFinite(cap) || cap < 1) {
      setError("Capacity must be at least 1.");
      return;
    }

    setSubmitting(true);
    const res = await api.post("/shelter/shifts", {
      type, starts_at: startsAt.trim(), ends_at: endsAt.trim(), capacity: cap
    });
    setSubmitting(false);

    if (res.ok) {
      navigation.goBack();
      return;
    }
    const code = res.data?.error?.code;
    if (res.status === 422 && code === "bad_window") {
      setError("End time must be after start time.");
      return;
    }
    setError(res.data?.error?.message ?? "Couldn't post this activity. Try again.");
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Post an activity" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Activity type</Text>
        <TypeChips value={type} onChange={setType} />

        <Text style={styles.label}>Starts</Text>
        <TextInput
          style={styles.input}
          value={startsAt}
          onChangeText={setStartsAt}
          placeholder="2026-08-30T09:00"
          placeholderTextColor={colors.faintDeprecated}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>Ends</Text>
        <TextInput
          style={styles.input}
          value={endsAt}
          onChangeText={setEndsAt}
          placeholder="2026-08-30T11:00"
          placeholderTextColor={colors.faintDeprecated}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>Capacity</Text>
        <TextInput
          style={styles.input}
          value={capacity}
          onChangeText={setCapacity}
          placeholder="1"
          placeholderTextColor={colors.faintDeprecated}
          keyboardType="number-pad"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button label="Post activity" onPress={submit} loading={submitting} style={styles.submit} />
      </ScrollView>
    </View>
  );
}

function TypeChips({ value, onChange }: { value: ShiftType; onChange: (t: ShiftType) => void }) {
  return (
    <View style={styles.chipGrid}>
      {SHIFT_TYPES.map((t) => {
        const active = t === value;
        return (
          <TouchableOpacity
            key={t}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onChange(t)}
            activeOpacity={0.85}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{shiftTypeLabel(t)}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 60 },
  label: { marginTop: 20, marginBottom: 10, color: colors.ink, ...typography.strong, fontWeight: "700" },
  input: { height: 52, borderRadius: radii.field, paddingHorizontal: 16, color: colors.ink, ...typography.subtitle, ...card },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    minWidth: "47%", height: 48, borderRadius: radii.chip, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 12, ...card
  },
  chipActive: { backgroundColor: colors.soft },
  chipText: { color: colors.muted, ...typography.meta, fontWeight: "700" },
  chipTextActive: { color: colors.teal },
  error: { marginTop: 18, color: colors.danger, ...typography.strong, fontWeight: "700" },
  submit: { marginTop: 26 }
});
