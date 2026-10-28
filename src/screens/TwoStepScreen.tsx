// Plan Task 14c · Two-step verification: opt in (or out) of a code before the sensitive actions.
//
// What it protects is five actions and nothing else: deleting the account, changing the password or the email,
// exporting the data, and turning this off. Not sign-in, not log out, not settings toggles: a prompt on every
// action trains people to ignore it. Turning it ON needs a proof first (the server insists), which shows the code
// channel works before the account depends on it.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useApi } from "../api/useApi";
import { useStepUp } from "../auth/useStepUp";
import { LoadStateView } from "../components/LoadStateView";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { Button, Card, ScreenHeader } from "../components/ui";
import { loadState } from "../net";
import { RootStackParamList } from "../navigation/types";
import { colors, maxFontScale, radii, spacing, typography } from "../theme";
import { authColors } from "./AuthFormKit";

type Props = NativeStackScreenProps<RootStackParamList, "twoStep">;

export function TwoStepScreen({ navigation }: Props) {
  const api = useApi();
  const { run, prompt } = useStepUp();
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const load = useCallback(() => {
    setRes(null);
    api.get("/me").then((r) => {
      setRes({ ok: r.ok, status: r.status });
      if (r.ok) setEnabled(!!r.data?.two_factor_enabled);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on open, and on retry
  }, []);
  useEffect(() => { load(); }, [load]);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    try {
      // Both directions need a proof; the hook asks once and retries once.
      const out = await run((headers) => enabled
        ? api.post("/me/2fa/disable", {}, { headers })
        : api.post("/me/2fa/enable", {}, { headers }));
      if (out.kind === "cancelled") return;
      if (out.kind === "unavailable") { setError(out.message); return; }
      if (out.res.ok) setEnabled(!!out.res.data?.two_factor_enabled);
      else setError(out.res.status === 0 ? "Couldn't connect. Check your connection and try again."
                                          : "That didn't work. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const state = loadState(res);
  return (
    <View style={styles.screen} testID="screen.twoStep">
      <ScreenBackdrop />
      {prompt}
      <ScreenHeader title="Two-step verification" onBack={() => navigation.goBack()} align="center" />

      {state.kind !== "ready" ? (
        <LoadStateView state={state} onRetry={load} onBack={() => navigation.goBack()} />
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets showsVerticalScrollIndicator={false}>
          <Text style={styles.lede}>
            We&apos;ll ask for a code before you delete your account, change your password or email, or export your data.
          </Text>
          <Card style={styles.card}>
            <Text style={styles.status} accessibilityRole="header" maxFontSizeMultiplier={maxFontScale.title}
                  testID="text.twoStep.state">
              {enabled ? "Two-step verification is on" : "Two-step verification is off"}
            </Text>
            <Text style={styles.body}>
              {enabled
                ? "The code goes to your verified email. Turning this off needs a code too."
                : "The code goes to your verified email. We'll check it works before turning this on."}
            </Text>
          </Card>
          {!!error && <Text style={styles.formError} accessibilityRole="alert">{error}</Text>}
          <Button testID="btn.twoStep.toggle" label={enabled ? "Turn off" : "Turn on"}
                  variant={enabled ? "secondary" : "primary"} onPress={toggle} loading={busy} style={styles.action} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "transparent" },
  content: { padding: 20, paddingBottom: 48 },
  lede: { color: authColors.muted, ...typography.body, marginBottom: 12 },
  card: { marginTop: 4 },
  status: { color: authColors.ink, ...typography.title },
  body: { color: authColors.muted, ...typography.body, marginTop: 6 },
  formError: {
    alignSelf: "stretch",
    marginTop: 12,
    // On a tint, not the raw backdrop: the same contrast reason as Log in's error line.
    backgroundColor: colors.dangerBg,
    borderRadius: radii.chip,
    paddingHorizontal: 12,
    paddingVertical: 8,
    overflow: "hidden",
    color: authColors.danger,
    ...typography.meta,
    fontWeight: "700",
  },
  action: { alignSelf: "stretch", marginTop: spacing.lg },
});
