// US-H2 · direct-place an animal from a SAFE rescue case with a specific person or shelter —
// no public listing, just a named hand-off. This screen only collects the "who" (recipient's
// email); city/fee are reviewed and finalized on RescuePlaceConfirmScreen right before the
// POST /cases/{caseId}/place call, alongside the recipient. Mirrors RescueListScreen (US-H1)
// for the surrounding chrome.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { RootStackParamList } from "../navigation/types";
import { colors, elevation, spacing, typography } from "../theme";
import { ScreenHeader } from "../components/ui";


const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Props = NativeStackScreenProps<RootStackParamList, "rescuePlace">;

export function RescuePlaceScreen({ navigation, route }: Props) {
  const { caseId } = route.params;
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);

  function next() {
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setError("Enter a valid email address.");
      return;
    }
    setError(undefined);
    navigation.navigate("rescuePlaceConfirm", { caseId, recipientEmail: trimmed });
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Place with someone" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.draftNote}>
          Hand this animal off directly to someone you already know — a verified member or
          shelter — instead of listing it publicly for adoption.
        </Text>

        <Text style={styles.label}>Recipient's email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="name@example.com"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />
        <Text style={styles.fine}>
          They need an existing Kupkop account and must already be a verified member or shelter.
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.submit} onPress={next} activeOpacity={0.9}>
          <Text style={styles.submitText}>Next</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const card = {
  backgroundColor: colors.white, ...elevation.soft
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 60 },
  draftNote: { marginTop: 4, marginBottom: 6, color: colors.muted, ...typography.meta, lineHeight: 20 },
  label: { marginTop: 20, marginBottom: 10, color: colors.ink, ...typography.strong, fontWeight: "700" },
  input: { height: 52, borderRadius: 16, paddingHorizontal: 16, color: colors.ink, ...typography.subtitle, ...card },
  fine: { marginTop: 8, color: colors.muted, ...typography.meta, lineHeight: 18 },
  error: { marginTop: 18, color: colors.danger, ...typography.strong, fontWeight: "700" },
  submit: { marginTop: 26, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", backgroundColor: colors.teal },
  submitText: { color: colors.white, fontSize: 20, fontWeight: "700" }
});
