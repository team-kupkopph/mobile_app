// US-W3 · post or edit a wishlist need. Filled-pill fields, an inline error under the field
// that needs attention, and a submit that stays enabled (Kupkop's rule — never a dead button).
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import {
  ScrollView, StyleSheet, Text, TouchableOpacity, View
} from "react-native";

import { useApi } from "../api/useApi";
import { NEED_DETAILS_MAX, NEED_TITLE_MAX, NEED_UNIT_MAX, NeedFormErrors, needFormErrors, needSaveError, withoutError } from "../community";
import { PrefillWarning } from "../components/PrefillWarning";
import { QuantityStepper } from "../components/QuantityStepper";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { RootStackParamList } from "../navigation/types";
import { TAP_SLOP } from "../touch";
import { colors, pill, spacing, typography } from "../theme";
import { Button, Field, ScreenHeader } from "../components/ui";

// `funds` is not a wishlist category: money goes through the Donation QR, and the server refuses it (400 bad_category).
const CATEGORIES = ["food", "medicine", "supplies", "other"] as const;

type Props = NativeStackScreenProps<RootStackParamList, "needForm">;

/** Shown in the banner (rule 1) and on a blocked submit (rule 3) — one wording, one place. */
const PREFILL_FAILED = "We couldn't load your shelter profile, so this form can't be saved yet. "
  + "Check your connection and reopen it.";

export function NeedFormScreen({ navigation, route }: Props) {
  const api = useApi();
  const editing = route.params?.need;
  const [title, setTitle] = useState(editing?.title ?? "");
  const [category, setCategory] = useState<string>(editing?.category ?? "food");
  const [qty, setQty] = useState(editing?.quantity_needed ?? 1);
  const [unit, setUnit] = useState(editing?.unit ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [myId, setMyId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Each message sits under the field it is about (AW20); `error` is the form-level one above the button.
  const [errors, setErrors] = useState<NeedFormErrors>({});
  const [error, setError] = useState<string | null>(null);
  // ⚠️ A form is the one place a full-screen error state is WRONG (US-R2's rule): it
  // would throw away whatever the shelter has already typed. Warn inline and refuse
  // to submit instead — an empty editable form over real data invites overwriting it
  // with blanks.
  const [prefillFailed, setPrefillFailed] = useState(false);

  useEffect(() => {
    // US-R1 · keep the RESULT. The previous line was `r.ok && setMyId(...)`, which discarded
    // the failure — leaving `myId` null and the submit below POSTing to
    // `/shelters/null/needs`. The server 404s, and the catch-all error told the shelter
    // "Couldn't save. Please try again." — blaming their network for a prefill we never
    // loaded, and inviting them to retry a request that can never succeed.
    if (!editing) {
      api.get("/me").then((r) => {
        if (r.ok) setMyId(r.data.account_id);
        else setPrefillFailed(true);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit() {
    if (busy) return;
    // Rule 3: same words as the banner, from the same constant — two hand-written variants
    // of one message drift, and the drift always lands on the less-clear one.
    if (!editing && !myId) { setError(PREFILL_FAILED); return; }
    const found = needFormErrors({ title, description, qty });
    setErrors(found);
    if (Object.keys(found).length > 0) { setError(null); return; }
    setBusy(true);
    setError(null);
    const body = { title: title.trim(), quantity_needed: qty, description: description.trim() };
    const trimmedUnit = unit.trim();
    const res = editing
      // Only what changed: a legacy need can carry a category (`funds`) the server would now refuse if it were echoed back.
      ? await api.patch(`/needs/${editing.need_id}`, {
          ...body,
          ...(category !== editing.category ? { category } : {}),
          ...(trimmedUnit !== (editing.unit ?? "") ? { unit: trimmedUnit } : {})
        })
      : await api.post(`/shelters/${myId}/needs`, { ...body, category, ...(trimmedUnit ? { unit: trimmedUnit } : {}) });
    setBusy(false);
    if (res.ok) { navigation.goBack(); return; }
    const failure = needSaveError(res.status, res.data?.error?.code, res.data?.error?.details);
    if (failure.field === "quantity") setErrors({ quantity: failure.message });
    else setError(failure.message);
  }

  return (
    <View style={styles.screen}>
      <ScreenBackdrop />
      <ScreenHeader title={editing ? "Edit need" : "Add a need"} onBack={() => navigation.goBack()} />
      <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* US-R5 · moved ABOVE the first field. It was rendered under it, which is rule 1
            only by half — someone scanning down starts typing before they reach the notice
            that nothing they type can be saved. */}
        {prefillFailed ? <PrefillWarning message={PREFILL_FAILED} /> : null}
        <Field
          label="What do you need?"
          value={title}
          onChangeText={(v) => { setTitle(v); setErrors((e) => withoutError(e, "title")); }}
          placeholder="e.g. Dog food (adult, dry)"
          maxLength={NEED_TITLE_MAX}
          error={errors.title}
        />

        <Text style={styles.groupLabel}>Category</Text>
        <View style={styles.segments}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity hitSlop={TAP_SLOP} key={c} onPress={() => setCategory(c)}
              accessibilityRole="button"
              accessibilityLabel={c}
              accessibilityState={{ selected: category === c }}
              style={[styles.segment, category === c ? styles.segmentOn : null]}>
              <Text style={[styles.segmentText, category === c ? styles.segmentTextOn : null]}>
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.groupLabel}>How many needed?</Text>
        <QuantityStepper value={qty} onChange={(n) => { setQty(n); setErrors((e) => withoutError(e, "quantity")); }} decreaseLabel="Decrease quantity needed" increaseLabel="Increase quantity needed" />
        {errors.quantity ? <Text style={styles.fieldError} accessibilityLiveRegion="polite">{errors.quantity}</Text> : null}

        <Field
          label="Unit (optional)"
          value={unit}
          onChangeText={setUnit}
          placeholder="e.g. kg, sacks, boxes"
          maxLength={NEED_UNIT_MAX}
          style={styles.unitField}
        />

        <Field
          label="Details (optional)"
          value={description}
          onChangeText={(v) => { setDescription(v); setErrors((e) => withoutError(e, "description")); }}
          multiline
          placeholder="Brand, size, anything specific"
          maxLength={NEED_DETAILS_MAX}
          error={errors.description}
        />

        {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}

        <Button
          label={editing ? "Save changes" : "Post need"}
          onPress={submit}
          loading={busy}
          style={styles.primaryBtn}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 60 },
  error: { marginTop: 8, color: colors.danger, ...typography.meta, fontWeight: "600" },
  // Sits under the stepper as Field's own error sits under a field.
  fieldError: { marginTop: 6, marginLeft: 6, color: colors.danger, ...typography.meta, fontWeight: "600" },
  groupLabel: { marginTop: 22, marginBottom: 10, color: colors.muted, ...typography.meta, fontWeight: "600", letterSpacing: 0.4 },
  unitField: { marginTop: 14 },
  segments: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  // Four options wrap: a filter row of pills, not a segmented control (the primitive takes two or three).
  segment: { minHeight: 38, paddingVertical: 6, paddingHorizontal: 16, justifyContent: "center", borderRadius: pill(38), backgroundColor: colors.white },
  segmentOn: { backgroundColor: colors.teal },
  segmentText: { color: colors.ink, ...typography.meta, fontWeight: "700", textTransform: "capitalize" },
  segmentTextOn: { color: colors.white },
  primaryBtn: { marginTop: 30 }
});
