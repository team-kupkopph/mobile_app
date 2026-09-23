// US-V9 · edit a posted activity. Reference: ShelterVolunteerActivityScreen for style,
// ShelterVolunteerCreateScreen for the form (same shared ShiftFormFields).
// GET /shelter/shifts/{shiftId} prefills; PATCH /shelter/shifts/{shiftId} sends only the
// fields that changed from what was loaded — diffed via `shiftFormBody`, key by key, rather
// than tracking a separate list of "touched" fields.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useApi } from "../api/useApi";
import { windowParts } from "../shiftTime";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { RootStackParamList } from "../navigation/types";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { colors, spacing, typography } from "../theme";
import { Button, ScreenHeader } from "../components/ui";
import { ShiftFormFields, ShiftFormValue, ShiftFormErrors, validateShiftForm, shiftFormBody, revealLocationOnError } from "../components/ShiftFormFields";

type Props = NativeStackScreenProps<RootStackParamList, "shelterVolunteerEdit">;

export function ShelterVolunteerEditScreen({ navigation, route }: Props) {
  const api = useApi();
  const { shiftId } = route.params;

  const [form, setForm] = useState<ShiftFormValue | null>(null);
  const [initialForm, setInitialForm] = useState<ShiftFormValue | null>(null);

  /**
   * US-R5 · this screen was ALREADY immune to the overwrite bug that ListingForm had, and
   * not by accident: `submit()` diffs against `initialForm` and sends only changed keys, so
   * a failed prefill can produce no patch at all. That is PrefillWarning's rules 3 and 4
   * satisfied structurally rather than by a banner, and it is the better way to do it.
   *
   * ⚠️ It had a DIFFERENT bug of the same family, though, and this is the one the R5 sweep
   * turned up: `useFocusEffect` refetches on every focus and re-prefilled the editable
   * fields from the response. So leaving this screen and coming back — or anything else
   * that refocuses it — silently discarded whatever the shelter had typed and replaced it
   * with the server's values. A SUCCESSFUL request destroying typed work, where rule 4 only
   * anticipated a failed one. `prefilled` below fixes that: the fields fill in once.
   */
  const prefilled = useRef(false);
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);
  const [errors, setErrors] = useState<ShiftFormErrors>({});
  const [banner, setBanner] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    setRes(null);
    api.get(`/shelter/shifts/${shiftId}`).then((r) => {
      setRes({ ok: r.ok, status: r.status });
      if (!r.ok) return;
      const d = r.data;
      // `useShelterAddress: false` so the stored address is shown and editable — d.location
      // is always present on the response, whether it came from the shelter's own custom
      // fields or the server's shelter-primary-address default.
      const loaded: ShiftFormValue = {
        type: d.type, title: d.title, description: d.description ?? "", meetingPoint: d.location?.meeting_point ?? "",
        ...windowParts(d.starts_at, d.ends_at), capacity: String(d.capacity),
        useShelterAddress: false,
        addressLine1: d.location?.address_line1 ?? "", barangay: d.location?.barangay ?? "",
        city: d.location?.city ?? "", province: d.location?.province ?? ""
      };
      // `initialForm` is the diff baseline and must always track the server, or a re-save
      // would resend fields the shelter never touched.
      setInitialForm(loaded);
      // The EDITABLE form, however, fills in exactly once — see the note above.
      if (prefilled.current) return;
      prefilled.current = true;
      setForm(loaded);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus, keyed by shiftId
  }, [shiftId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function submit() {
    if (submitting || !form || !initialForm) return;
    setBanner(undefined);

    const found = validateShiftForm(form);
    setErrors(found);
    if (Object.keys(found).length) return;

    const body = shiftFormBody(form)!;
    const baseline = shiftFormBody(initialForm)!;
    const patch: Record<string, unknown> = {};
    for (const key of Object.keys(body)) {
      if (JSON.stringify(body[key]) !== JSON.stringify(baseline[key])) patch[key] = body[key];
    }

    if (Object.keys(patch).length === 0) {
      navigation.goBack();
      return;
    }

    setSubmitting(true);
    const res = await api.patch(`/shelter/shifts/${shiftId}`, patch);
    setSubmitting(false);

    if (res.ok) {
      navigation.goBack();
      return;
    }
    const err = res.data?.error;
    if (res.status === 409 && err?.code === "shift_closed")
      return setBanner("This activity is closed and can't be edited.");
    if (res.status === 422 && err?.code === "bad_window") return setErrors({ when: "End must be after start." });
    if (res.status === 422 && err?.code === "location_required") {
      setForm(revealLocationOnError(form));
      setErrors({ location: "Add your shelter's address in Organization details, or enter one here." });
      return;
    }
    if (res.status === 400 && err?.field === "title") return setErrors({ title: err.message });
    if (res.status === 400 && err?.field === "capacity") return setErrors({ capacity: err.message });
    if (res.status === 403) return setBanner("Your organization must be verified before posting activities.");
    setBanner(err?.message ?? "Couldn't save changes. Try again.");
  }

  return (
    <View style={styles.screen}>
      <ScreenBackdrop />
      <ScreenHeader title="Edit activity" onBack={() => navigation.goBack()} />

      {/* Gated on `!form`, not on the request: once the form is up, a failed REFETCH must
          not replace it — that would throw away typed work, which is the whole reason forms
          get PrefillWarning instead of a full-screen state. Here nothing has been typed yet. */}
      {!form ? (
        <LoadStateView state={loadState(res)} subject="activity" onRetry={load}
          onBack={() => navigation.goBack()} />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {banner ? <Text style={styles.banner}>{banner}</Text> : null}

          <ShiftFormFields value={form} onChange={setForm} errors={errors} lockShelterAddress />

          <Button label="Save changes" onPress={submit} loading={submitting} style={styles.submit} />
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
