// Review step 7a (MQ10) · the community guidelines, and (once counsel has written it) the Terms of Use. Reached from Welcome, Sign up, Settings,
// and, when the server refuses a post until the current terms are accepted, from wherever the person was posting (auth/TermsGate.tsx).
//
// With `accept` it ends in an "I agree" button that records the CURRENT version (POST /me/terms). Without it, it is just a document to read.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useApi } from "../api/useApi";
import { TERMS_VERSION } from "../consent";
import { termsDocument } from "../legal/terms";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { RootStackParamList } from "../navigation/types";
import { colors, spacing, typography } from "../theme";
import { Button, Card, ScreenHeader } from "../components/ui";

type Props = NativeStackScreenProps<RootStackParamList, "terms">;

export function TermsScreen({ navigation, route }: Props) {
  const api = useApi();
  const accept = route.params?.accept === true;
  const doc = termsDocument();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function agree() {
    if (saving) return;
    setSaving(true);
    setError(null);
    const res = await api.post("/me/terms", { version: TERMS_VERSION });
    setSaving(false);
    if (res.ok) { navigation.goBack(); return; }
    // 409: the document moved on while this screen was open. Say so; do not pretend they agreed to it.
    setError(res.status === 409
      ? "The terms were updated. Please update the app, then read and accept them again."
      : res.data?.error?.message ?? "Couldn't save that. Try again.");
  }

  return (
    <View style={styles.screen} testID="screen.terms">
      <ScreenBackdrop />
      <ScreenHeader title={doc.title} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {accept ? (
          <Text style={styles.lead} testID="txt.terms.lead">
            Before you post, please read and accept the {doc.hasLegalTerms ? "terms" : "community guidelines"}. It takes a minute.
          </Text>
        ) : null}
        {doc.sections.map((section) => (
          <Card key={section.title} style={styles.card}>
            <Text style={styles.heading} accessibilityRole="header">{section.title}</Text>
            {section.body.map((paragraph) => (
              <Text key={paragraph} style={styles.body}>{paragraph}</Text>
            ))}
          </Card>
        ))}
        {accept ? (
          <>
            {error ? <Text style={styles.error} accessibilityLiveRegion="polite" testID="err.terms">{error}</Text> : null}
            <Button label="I agree" onPress={() => { void agree(); }} loading={saving} testID="btn.terms.agree" style={styles.agree} />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 60, gap: 14 },
  lead: { color: colors.ink, ...typography.body, marginBottom: 4 },
  card: { gap: 8 },
  heading: { color: colors.ink, ...typography.section },
  body: { color: colors.muted, ...typography.body },
  error: { color: colors.danger, ...typography.meta, fontWeight: "600" },
  agree: { marginTop: 8 },
});
