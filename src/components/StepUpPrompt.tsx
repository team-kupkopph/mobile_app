// Plan Task 14c · "Confirm it's you": the one prompt a sensitive action shows when two-step verification is on.
// A code went to the account's verified email; typing it here trades it for a short-lived step-up token (the
// logic is src/stepUp.ts). Wrong codes show their error and the prompt stays; only Cancel closes it empty-handed.
import { useState } from "react";
import { Modal, ScrollView, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApi } from "../api/useApi";
import { requestStepUpCode, verifyStepUp } from "../stepUp";
import { colors, maxFontScale, radii, spacing, typography } from "../theme";
import { Button, Card, Field } from "./ui";

export function StepUpPrompt({ sentTo, onToken, onCancel }: {
  sentTo: string;
  onToken: (token: string) => void;
  onCancel: () => void;
}) {
  const api = useApi();
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | undefined>(undefined);
  const [sentNote, setSentNote] = useState<string | undefined>(undefined);
  const [destination, setDestination] = useState(sentTo);
  const [busy, setBusy] = useState(false);

  async function confirm() {
    if (busy) return;
    setBusy(true);
    setMessage(undefined);
    try {
      const out = await verifyStepUp(api, code);
      if (out.ok) { onToken(out.token); return; }
      setMessage(out.message);
      if (out.restart) setCode("");
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (busy) return;
    setBusy(true);
    setMessage(undefined);
    try {
      const out = await requestStepUpCode(api);
      if (out.ok) { setDestination(out.sentTo); setCode(""); setSentNote("A new code is on its way."); }
      else setMessage(out.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      {/* At the largest text size the card is taller than the screen. It scrolls, clears the notch and the home
          indicator, and follows the keyboard, so Cancel is always reachable (the AX5 walk found it cut off). */}
      <ScrollView
        style={styles.scrim}
        contentContainerStyle={[styles.scroller, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg }]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.card} testID="prompt.stepUp">
          <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={maxFontScale.title}>
            Confirm it&apos;s you
          </Text>
          <Text style={styles.body}>
            We sent a 6-digit code to {destination || "your email"}. Enter it to continue.
          </Text>
          {!!sentNote && <Text style={styles.note}>{sentNote}</Text>}
          <Field
            testID="field.stepUp.code"
            label="Code"
            value={code}
            onChangeText={(v) => { setCode(v.replace(/\D/g, "").slice(0, 6)); if (message) setMessage(undefined); }}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            maxLength={6}
            error={message}
            returnKeyType="go"
            onSubmitEditing={confirm}
          />
          <Button testID="btn.stepUp.confirm" label="Continue" onPress={confirm} loading={busy} style={styles.action} />
          <Button testID="btn.stepUp.resend" label="Send a new code" variant="secondary" onPress={resend}
                  style={styles.secondary} />
          <Button testID="btn.stepUp.cancel" label="Cancel" variant="secondary" onPress={onCancel}
                  style={styles.secondary} />
        </Card>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: "rgba(18,33,58,0.45)" },
  // flexGrow, not flex: the card is centred when it fits and the content simply grows (and scrolls) when it does not.
  scroller: { flexGrow: 1, justifyContent: "center", paddingHorizontal: spacing.lg },
  card: { borderRadius: radii.card },
  title: { color: colors.ink, ...typography.title },
  body: { color: colors.muted, ...typography.body, marginTop: 6 },
  note: { color: colors.teal, ...typography.meta, fontWeight: "700", marginTop: 8 },
  action: { alignSelf: "stretch", marginTop: spacing.lg },
  secondary: { alignSelf: "stretch", marginTop: spacing.sm },
});
