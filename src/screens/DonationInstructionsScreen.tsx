// US-W3 · the shelter's drop-off instructions: where and when givers should bring wishlist items. One multiline
// field, saved to the shelter profile (PATCH /shelter/profile). A giver reads it on the pledge form and again
// on the confirmation, so it is the shelter's own words, not ours.
//
// The current text comes from the wishlist list response (`donation_instructions`). If that load fails the
// form warns (PrefillWarning) and refuses to save: an empty field over real instructions invites overwriting
// them with blanks (the rule in PrefillWarning.tsx).
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useApi } from "../api/useApi";
import { INSTRUCTIONS_MAX } from "../community";
import { PrefillWarning } from "../components/PrefillWarning";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { Button, Field, ScreenHeader } from "../components/ui";
import { RootStackParamList } from "../navigation/types";
import { colors, spacing, typography } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "donationInstructions">;

/** Shown in the banner and on a blocked save — one wording, one place (PrefillWarning rule 3). */
const PREFILL_FAILED = "We couldn't load your current instructions, so this can't be saved yet. "
  + "Check your connection and reopen it.";

export function DonationInstructionsScreen({ navigation }: Props) {
  const api = useApi();
  const [text, setText] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [prefillFailed, setPrefillFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api.get("/me").then((me) => {
      if (!alive) return;
      if (!me.ok) { setPrefillFailed(true); return; }
      api.get(`/shelters/${me.data.account_id}/needs`).then((r) => {
        if (!alive) return;
        if (!r.ok) { setPrefillFailed(true); return; }
        setText(r.data.donation_instructions ?? "");
        setLoaded(true);
      });
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on open
  }, []);

  // Until the current text has arrived the field is read-only (typing would be overwritten by it) and Save waits.
  const loading = !loaded && !prefillFailed;

  async function submit() {
    if (busy) return;
    if (prefillFailed) { setError(PREFILL_FAILED); return; }
    if (!loaded) return;
    const value = text.trim();
    if (value.length > INSTRUCTIONS_MAX) { setError(`Keep it to ${INSTRUCTIONS_MAX} characters or fewer.`); return; }
    setBusy(true);
    setError(null);
    const res = await api.patch("/shelter/profile", { donation_instructions: value });
    setBusy(false);
    if (res.ok) navigation.goBack();
    else setError(res.status === 0 || res.status >= 500
      ? "Couldn't reach Kupkop. Check your connection and try again."
      : "Couldn't save. Please try again.");
  }

  return (
    <View style={styles.screen}>
      <ScreenBackdrop />
      <ScreenHeader title="Drop-off instructions" onBack={() => navigation.goBack()} />
      <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {prefillFailed ? <PrefillWarning message={PREFILL_FAILED} /> : null}
        <Text style={styles.note}>
          Tell givers where and when to bring what they pledged. They see this when they pledge and after.
        </Text>
        <Field
          label="Drop-off instructions"
          value={text}
          onChangeText={setText}
          multiline
          numberOfLines={5}
          maxLength={INSTRUCTIONS_MAX}
          placeholder="e.g. Gate B, weekdays 9am–4pm. Ask for Ate Liza."
          readOnly={loading}
          error={error ?? undefined}
        />
        {loading ? <Text style={styles.loadingNote}>Loading your current instructions…</Text> : null}
        <Text style={styles.count}>{text.length} / {INSTRUCTIONS_MAX}</Text>
        <Button label="Save" onPress={submit} loading={busy || loading} style={styles.primaryBtn} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 60 },
  note: { color: colors.muted, ...typography.body, lineHeight: 21, marginBottom: 16 },
  loadingNote: { marginTop: 6, marginLeft: 6, color: colors.muted, ...typography.meta },
  count: { marginTop: 6, marginRight: 6, alignSelf: "flex-end", color: colors.muted, ...typography.meta },
  primaryBtn: { marginTop: 24 }
});
