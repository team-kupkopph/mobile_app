// US-M1 · "Report this" on a stray report or listing. One small screen reused for
// every flaggable target type (route.params.targetType) — POST /moderation/flags.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { RootStackParamList } from "../navigation/types";
import { colors, elevation, radii, spacing, typography } from "../theme";
import { ScreenHeader } from "../components/ui";


type Props = NativeStackScreenProps<RootStackParamList, "reportContent">;

export function ReportContentScreen({ navigation, route }: Props) {
  const api = useApi();
  const { targetType, targetId } = route.params;
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  async function submit() {
    if (submitting) return;
    if (!reason.trim()) { setError("Tell us what's wrong."); return; }
    setSubmitting(true);
    setError(undefined);
    const res = await api.post("/moderation/flags",
      { target_type: targetType, target_id: targetId, reason: reason.trim() });
    setSubmitting(false);
    if (res.ok) {
      Alert.alert("Reported", "Thanks — our team will take a look.", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
      return;
    }
    setError(res.data?.error?.message ?? "Couldn't send the report. Try again.");
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Report this" onBack={() => navigation.goBack()} />

      <View style={styles.content}>
        <Text style={styles.label}>What's wrong?</Text>
        <TextInput
          style={styles.notes}
          value={reason}
          onChangeText={setReason}
          multiline
          placeholder="Spam, a fake listing, abusive contact…"
          placeholderTextColor={colors.faintDeprecated}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity style={styles.submit} onPress={submit} activeOpacity={0.9} disabled={submitting}>
          {submitting ? <ActivityIndicator color={colors.white} />
            : <Text style={styles.submitText}>Send report</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const card = {
  backgroundColor: colors.white, ...elevation.soft
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 20 },
  label: { marginBottom: 10, color: colors.ink, ...typography.strong, fontWeight: "700" },
  notes: { minHeight: 120, borderRadius: radii.tile, padding: 16, color: colors.ink, ...typography.subtitle, textAlignVertical: "top", ...card },
  error: { marginTop: 14, color: colors.danger, ...typography.strong, fontWeight: "700" },
  submit: { marginTop: 26, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", backgroundColor: colors.teal },
  submitText: { color: colors.white, fontSize: 20, fontWeight: "700" }
});
