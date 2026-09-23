// US-V9 · post a new volunteer activity. Reference: ShelterVolunteerActivityScreen for style.
// POST /shelter/shifts.
//
// K29 / G1 · the form itself lives in ShiftFormFields (shared with the Edit screen): pickers
// for day/start/duration instead of ISO text, a required title, and an optional custom
// address that defaults to the shelter's own. Per-field errors land under the offending
// control; anything that isn't about one field (a 403, a network failure) goes to `banner`.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useApi } from "../api/useApi";
import { upcomingDays } from "../shiftTime";
import { RootStackParamList } from "../navigation/types";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { colors, spacing, typography } from "../theme";
import { Button, ScreenHeader } from "../components/ui";
import { ShiftFormFields, ShiftFormValue, ShiftFormErrors, validateShiftForm, shiftFormBody } from "../components/ShiftFormFields";

type Props = NativeStackScreenProps<RootStackParamList, "shelterVolunteerCreate">;

const initialForm: ShiftFormValue = {
  type: "walking", title: "", description: "", meetingPoint: "",
  day: upcomingDays(1)[0], start: "09:00", durationMins: 120, capacity: "1",
  useShelterAddress: true, addressLine1: "", barangay: "", city: "", province: ""
};

export function ShelterVolunteerCreateScreen({ navigation }: Props) {
  const api = useApi();

  const [form, setForm] = useState<ShiftFormValue>(initialForm);
  const [errors, setErrors] = useState<ShiftFormErrors>({});
  const [banner, setBanner] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (submitting) return;
    setBanner(undefined);

    const found = validateShiftForm(form);
    setErrors(found);
    if (Object.keys(found).length) return;

    const body = shiftFormBody(form)!;
    setSubmitting(true);
    const res = await api.post("/shelter/shifts", body);
    setSubmitting(false);

    if (res.ok) {
      navigation.goBack();
      return;
    }
    const err = res.data?.error;
    if (res.status === 422 && err?.code === "bad_window") return setErrors({ when: "End must be after start." });
    if (res.status === 422 && err?.code === "location_required")
      return setErrors({ location: "Add your shelter's address in Organization details, or enter one here." });
    if (res.status === 400 && err?.field === "title") return setErrors({ title: err.message });
    if (res.status === 400 && err?.field === "capacity") return setErrors({ capacity: err.message });
    if (res.status === 403) return setBanner("Your organization must be verified before posting activities.");
    setBanner(err?.message ?? "Couldn't post this activity. Try again.");
  }

  return (
    <View style={styles.screen}>
      <ScreenBackdrop />
      <ScreenHeader title="Post an activity" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {banner ? <Text style={styles.banner}>{banner}</Text> : null}

        <ShiftFormFields value={form} onChange={setForm} errors={errors} />

        <Button label="Post activity" onPress={submit} loading={submitting} style={styles.submit} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 60 },
  banner: {
    marginTop: 16, color: colors.danger, ...typography.meta, fontWeight: "600"
  },
  submit: { marginTop: 26 }
});
