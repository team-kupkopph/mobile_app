// US-M1 · "Report this" — one form for everything that can be reported: a listing, a story, a rescue report, a shift,
// and (review step 7) a PERSON. POST /moderation/flags.
//
// Review step 7g: a category first (MQ3), then an optional note, required only for "something else". Naming what is
// being reported at the top means a mistaken tap is noticed before it is sent (Design v3 review, V2). It ends on its own
// confirmation screen, like every other submit in this app, not on an Alert.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useApi } from "../api/useApi";
import {
  REPORT_REASONS, reportBody, reportFailure, reportSubject, stillWrong, validateReport, type ReportProblems, type ReportReason,
} from "../moderation";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { RootStackParamList } from "../navigation/types";
import { colors, pill, radii, spacing, typography } from "../theme";
import { Button, Card, Field, PressScale, ScreenHeader } from "../components/ui";

type Props = NativeStackScreenProps<RootStackParamList, "reportContent">;

export function ReportContentScreen({ navigation, route }: Props) {
  const api = useApi();
  const params = route.params;
  const subject = reportSubject(params);
  const [code, setCode] = useState<ReportReason | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [problems, setProblems] = useState<ReportProblems>({});

  async function submit() {
    if (submitting) return;
    const found = validateReport(code, note);
    if (!code || found.reason || found.note) { setProblems(found); return; }
    setSubmitting(true);
    setProblems({});
    const res = await api.post("/moderation/flags", reportBody(params, code, note));
    setSubmitting(false);
    if (res.ok) { navigation.replace("reportContentSent", { subject, person: params.person, leaveContent: params.leaveContent }); return; }
    setProblems({ form: reportFailure(res) });
  }

  return (
    <View style={styles.screen} testID="screen.reportContent">
      <ScreenBackdrop />
      <ScreenHeader title="Report this" onBack={() => navigation.goBack()} />

      <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.subjectCard}>
          <Text style={styles.subject} testID="txt.reportContent.subject">You are reporting {subject}</Text>
        </Card>

        <Text style={styles.label}>WHAT IS WRONG?</Text>
        <View accessibilityRole="radiogroup" style={styles.group}>
          {REPORT_REASONS.map((r) => {
            const selected = code === r.code;
            return (
              <PressScale key={r.code} testID={`opt.reportContent.${r.code}`}
                accessibilityRole="radio" accessibilityState={{ checked: selected }}
                accessibilityLabel={`${r.label}. ${r.hint}`}
                onPress={() => { setCode(r.code); setProblems((p) => stillWrong(p, r.code, note)); }}
                style={[styles.option, selected && styles.optionOn]}>
                <View style={[styles.radio, selected && styles.radioOn]}>
                  {selected ? <View style={styles.radioDot} /> : null}
                </View>
                <View style={styles.optionText}>
                  <Text style={styles.optionLabel}>{r.label}</Text>
                  <Text style={styles.optionHint}>{r.hint}</Text>
                </View>
              </PressScale>
            );
          })}
        </View>
        {problems.reason ? (
          <Text style={styles.error} accessibilityLiveRegion="polite" testID="err.reportContent.reason">{problems.reason}</Text>
        ) : null}

        <Field
          label={code === "other" ? "Tell us what is wrong" : "Add a note (optional)"}
          value={note}
          onChangeText={(text) => { setNote(text); setProblems((p) => stillWrong(p, code, text)); }}
          multiline
          maxLength={2000}
          placeholder="What did you see?"
          error={problems.note}
          style={styles.note}
        />

        <Button label="Send report" onPress={submit} loading={submitting} style={styles.submit} testID="btn.reportContent.send" />
        {problems.form ? (
          <Text style={styles.error} accessibilityLiveRegion="polite" testID="err.reportContent.form">{problems.form}</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 20, paddingBottom: 60 },
  subjectCard: { marginBottom: 22 },
  subject: { color: colors.ink, ...typography.subtitle, fontWeight: "700" },
  label: { color: colors.muted, ...typography.label, marginBottom: 10 },
  group: { gap: 10 },
  option: {
    flexDirection: "row", alignItems: "center", gap: 14, minHeight: 64, paddingVertical: 12, paddingHorizontal: 16,
    borderRadius: radii.notice, backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border
  },
  optionOn: { borderColor: colors.teal, backgroundColor: colors.soft },
  radio: {
    width: 22, height: 22, borderRadius: pill(22), borderWidth: 2, borderColor: colors.muted, alignItems: "center",
    justifyContent: "center"
  },
  radioOn: { borderColor: colors.teal },
  radioDot: { width: 10, height: 10, borderRadius: pill(10), backgroundColor: colors.teal },
  optionText: { flex: 1 },
  optionLabel: { color: colors.ink, ...typography.strong, fontWeight: "700" },
  optionHint: { color: colors.muted, ...typography.meta, marginTop: 2 },
  note: { marginTop: 22 },
  submit: { marginTop: 26 },
  error: { color: colors.danger, ...typography.meta, fontWeight: "600", marginTop: 10 }
});
