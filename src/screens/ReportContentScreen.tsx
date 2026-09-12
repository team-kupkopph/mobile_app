// US-M1 · "Report this" on a stray report or listing. One small screen reused for
// every flaggable target type (route.params.targetType) — POST /moderation/flags.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { useApi } from "../api/useApi";
import { RootStackParamList } from "../navigation/types";
import { colors, spacing } from "../theme";
import { Button, Field, ScreenHeader } from "../components/ui";

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
        <Field
          label="What's wrong?"
          value={reason}
          onChangeText={setReason}
          multiline
          placeholder="Spam, a fake listing, abusive contact…"
          error={error ? error : undefined}
        />
        <Button label="Send report" onPress={submit} loading={submitting} style={styles.submit} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 20 },
  submit: { marginTop: 26 }
});
