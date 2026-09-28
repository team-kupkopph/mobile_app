// US-V9 · post a new volunteer activity. Reference: ShelterVolunteerActivityScreen for style.
// POST /shelter/shifts.
//
// K29 / G1 · the form itself lives in ShiftFormFields (shared with the Edit screen): pickers
// for day/start/duration instead of ISO text, a required title, and an optional custom
// address that defaults to the shelter's own. Per-field errors land under the offending
// control; anything that isn't about one field (a 403, a network failure) goes to `banner`.
//
// Task 10 (K14) · Duplicate. `route.params.copyFrom` (set by the activity screen's
// "Duplicate" button) fetches that shift and prefills everything from it except the day,
// which moves to the same weekday next week (`nextWeekDay`) — reposting last Tuesday's walk
// verbatim would silently ask for volunteers on a day that's already gone.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { nextWeekDay, upcomingDays, windowParts } from "../shiftTime";
import { RootStackParamList } from "../navigation/types";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { colors, spacing, typography } from "../theme";
import { Button, ScreenHeader } from "../components/ui";
import { ShiftFormFields, ShiftFormValue, ShiftFormErrors, validateShiftForm, shiftFormBody, revealLocationOnError, capacityFieldError } from "../components/ShiftFormFields";

type Props = NativeStackScreenProps<RootStackParamList, "shelterVolunteerCreate">;

const blankForm: ShiftFormValue = {
  type: "walking", title: "", description: "", meetingPoint: "",
  day: upcomingDays(1)[0], start: "09:00", durationMins: 120, capacity: "1",
  useShelterAddress: true, addressLine1: "", barangay: "", city: "", province: ""
};

export function ShelterVolunteerCreateScreen({ navigation, route }: Props) {
  const api = useApi();
  const copyFrom = route.params?.copyFrom;

  const [form, setForm] = useState<ShiftFormValue>(blankForm);
  const [errors, setErrors] = useState<ShiftFormErrors>({});
  const [banner, setBanner] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  // Only meaningful when copyFrom is set (the render below only reads it inside a `copyFrom
  // &&` branch) — gates the form behind the prefill fetch so a half-copied shift is never
  // briefly on screen and submittable. Stays null forever on a plain "Post an activity" open.
  const [copyRes, setCopyRes] = useState<{ ok: boolean; status: number } | null>(null);

  const loadCopy = useCallback(() => {
    if (!copyFrom) return;
    setCopyRes(null);
    api.get(`/shelter/shifts/${copyFrom}`).then((r) => {
      setCopyRes({ ok: r.ok, status: r.status });
      if (!r.ok) return;
      const d = r.data;
      const { day, start, durationMins } = windowParts(d.starts_at, d.ends_at);
      setForm({
        type: d.type, title: d.title, description: d.description ?? "", meetingPoint: d.location?.meeting_point ?? "",
        day: nextWeekDay(day), start, durationMins, capacity: String(d.capacity),
        useShelterAddress: false,
        addressLine1: d.location?.address_line1 ?? "", barangay: d.location?.barangay ?? "",
        city: d.location?.city ?? "", province: d.location?.province ?? ""
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot fetch, keyed by copyFrom
  }, [copyFrom]);

  // Deliberately `useEffect`, not `useFocusEffect`: this is a ONE-TIME prefill, not a value
  // that stays in sync with the server. The Edit screen refetches on every focus because it
  // must; doing the same here would silently overwrite whatever the shelter had already
  // typed the moment they came back from picking a type or toggling the address, the exact
  // bug ShelterVolunteerEditScreen's `prefilled` ref exists to prevent — refetching a form
  // that's mid-edit, not one that hasn't loaded yet.
  useEffect(() => { loadCopy(); }, [loadCopy]);

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
    if (res.status === 422 && err?.code === "location_required") {
      setForm(revealLocationOnError(form));
      setErrors({ location: "Add your shelter's address in Organization details, or enter one here." });
      return;
    }
    if (res.status === 400 && err?.field === "title") return setErrors({ title: err.message });
    // Task 10 (K15) · the backend's own capacity ceiling (max_value=500) — validateShiftForm
    // already catches this before the round trip, so this is a backstop, not the primary path.
    // Fix round 1 (Finding 1) · `capacityFieldError` only swaps in the fixed copy for the max
    // case; a min-value 400 (which shouldn't reach here, but might on a race) still forwards
    // the server's own message instead of misreporting it as "too high".
    if (res.status === 400 && err?.field === "capacity")
      return setErrors({ capacity: capacityFieldError(form.capacity, err.message) });
    if (res.status === 403) return setBanner("Your organization must be verified before posting activities.");
    setBanner(err?.message ?? "Couldn't post this activity. Try again.");
  }

  return (
    <View style={styles.screen}>
      <ScreenBackdrop />
      <ScreenHeader title={copyFrom ? "Duplicate activity" : "Post an activity"} onBack={() => navigation.goBack()} />

      {copyFrom && loadState(copyRes).kind !== "ready" ? (
        <LoadStateView state={loadState(copyRes)} subject="activity" onRetry={loadCopy}
          onBack={() => navigation.goBack()} />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {banner ? <Text style={styles.banner}>{banner}</Text> : null}

          <ShiftFormFields value={form} onChange={setForm} errors={errors} />

          <Button label="Post activity" onPress={submit} loading={submitting} style={styles.submit} />
        </ScrollView>
      )}
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
