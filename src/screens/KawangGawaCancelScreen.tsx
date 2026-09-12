// US-V8 · cancel a shift. Reference: screens/user/screen-kawanggawa-cancel(-late).png.
// `was_late` is decided server-side by POST /signups/{id}/cancel — never a device clock — so the
// pattern here is: show a neutral ConfirmModal first ("Cancel this shift?"), and only after the
// server responds do we know whether it was a free or a late (recorded) cancellation. The result
// phase renders lateCancelCopy(was_late) straight from that response.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useApi } from "../api/useApi";
import { AlertIcon, CheckIcon } from "../components/AppIcons";
import { ConfirmModal } from "../components/ConfirmModal";
import { RootStackParamList } from "../navigation/types";
import { lateCancelCopy } from "../volunteer";
import { colors, elevation, spacing, typography } from "../theme";
import { Button, ScreenHeader } from "../components/ui";



type Phase = "confirm" | "submitting" | "result";

type Props = NativeStackScreenProps<RootStackParamList, "kawanggawaCancel">;

export function KawangGawaCancelScreen({ navigation, route }: Props) {
  const api = useApi();
  const { signupId } = route.params;

  const [phase, setPhase] = useState<Phase>("confirm");
  const [wasLate, setWasLate] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  async function onConfirm() {
    setPhase("submitting");
    setErrorMessage(undefined);
    const res = await api.post(`/signups/${signupId}/cancel`);
    if (!res.ok) {
      const code = res.data?.error?.code;
      if (res.status === 409 && code === "not_cancellable") {
        setErrorMessage("This shift can no longer be cancelled.");
      } else {
        setErrorMessage(res.data?.error?.message ?? "Couldn't cancel this shift. Try again.");
      }
      setPhase("confirm");
      return;
    }
    setWasLate(!!res.data.was_late);
    setPhase("result");
  }

  const resultTone = wasLate
    ? { bg: colors.warningBg, fg: colors.warningStrong }
    : { bg: colors.successBg, fg: colors.success };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Cancel shift" onBack={() => navigation.goBack()} />

      {phase === "submitting" && (
        <View style={styles.centerFill}>
          <ActivityIndicator color={colors.teal} />
        </View>
      )}

      {phase === "result" && (
        <View style={styles.content}>
          <View style={[styles.iconCircle, { backgroundColor: resultTone.bg }]}>
            {wasLate
              ? <AlertIcon color={resultTone.fg} size={40} />
              : <CheckIcon color={resultTone.fg} size={32} />}
          </View>

          <Text style={styles.heading}>Shift cancelled</Text>
          <Text style={styles.subheading}>{lateCancelCopy(!!wasLate)}</Text>

          <Button
            label="Back to schedule"
            onPress={() => navigation.navigate("kawanggawaSchedule")}
            style={styles.primaryButton}
          />
        </View>
      )}

      {phase === "confirm" && !!errorMessage && (
        <View style={styles.content}>
          <View style={[styles.iconCircle, { backgroundColor: colors.dangerBg }]}>
            <AlertIcon color={colors.danger} size={40} />
          </View>
          <Text style={styles.heading}>Couldn't cancel</Text>
          <Text style={styles.subheading}>{errorMessage}</Text>

          <Button label="Back to schedule" onPress={() => navigation.goBack()} style={styles.primaryButton} />
        </View>
      )}

      <ConfirmModal
        visible={phase === "confirm" && !errorMessage}
        title="Cancel this shift?"
        body="Cancelling more than 12 hours before your shift is free. Cancelling closer to the start time will be recorded on your account."
        confirmLabel="Cancel shift"
        tone="neutral"
        onConfirm={onConfirm}
        onCancel={() => navigation.goBack()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  content: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: 60, alignItems: "center" },
  iconCircle: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center" },
  heading: { marginTop: 22, color: colors.ink, ...typography.hero },
  subheading: { marginTop: 10, color: colors.muted, ...typography.body, textAlign: "center" },
  primaryButton: { width: "100%", marginTop: 32 }
});
