// US-Q1 · upload (or replace) the shelter's donation QR. Draft-first like listings
// (decision 2's pattern) — this works before the org is approved; POST /shelter/
// donation-qr doesn't check verification. The public donate surface (US-Q2) is the
// separate, always-both-keys gate (org approved AND this QR reviewer-verified).
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { AccessibilityInfo, ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { donationQrSaveError, NAME_MAX } from "../donationQrErrors";
import { pickAndUpload } from "../media/pickAndUpload";
import { uploadErrorMessage } from "../upload";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { RootStackParamList } from "../navigation/types";
import { colors, radii, spacing, typography } from "../theme";
import { Button, Field, ScreenHeader, SegmentedControl } from "../components/ui";

const PROVIDERS = ["gcash", "maya"] as const;
const PROVIDER_LABEL: Record<(typeof PROVIDERS)[number], string> = { gcash: "GCash", maya: "Maya" };

type Props = NativeStackScreenProps<RootStackParamList, "donationQr">;

export function DonationQrScreen({ navigation }: Props) {
  const api = useApi();
  const [provider, setProvider] = useState<(typeof PROVIDERS)[number]>("gcash");
  const [accountName, setAccountName] = useState("");
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setErrorState] = useState<string | undefined>(undefined);
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  // AT36 · say it to VoiceOver as well as drawing it (RN's live region is Android-only).
  const setError = (message: string | undefined) => {
    setErrorState(message);
    if (message) AccessibilityInfo.announceForAccessibility(message);
  };

  async function addQrImage() {
    if (uploading) return;
    setUploading(true);
    setError(undefined);
    const res = await pickAndUpload(api, "donation_qr");
    setUploading(false);
    if (res?.ok) setQrUrl(res.fileUrl);
    // AT6 · a failed upload used to leave the box unchanged and say nothing (null = cancelled or declined: still silent, by design).
    else if (res && !res.ok) setError(uploadErrorMessage(res.reason));
  }

  async function submit() {
    if (submitting) return;
    setNameError(undefined);
    if (!accountName.trim()) { setNameError("Enter the name on the receiving account."); return; }
    if (!qrUrl) { setError("Add the QR image."); return; }
    setSubmitting(true);
    setError(undefined);

    const res = await api.post("/shelter/donation-qr", {
      provider, account_name: accountName.trim(), file_url: qrUrl
    });

    setSubmitting(false);
    if (res.ok) {
      navigation.goBack();
      return;
    }
    const failure = donationQrSaveError(res);
    if (failure.field === "name") setNameError(failure.message);
    else setError(failure.message);
  }

  return (
    <View style={styles.screen}>
      <ScreenBackdrop />
      <ScreenHeader title="Donation QR" onBack={() => navigation.goBack()} />

      <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.draftNote}>
          Reviewed before donations go live. Replacing the QR image sends it back for review.
        </Text>

        <Text style={styles.label}>Payment app</Text>
        <SegmentedControl
          segments={PROVIDERS.map((p) => PROVIDER_LABEL[p])}
          index={PROVIDERS.indexOf(provider)}
          onChange={(i) => setProvider(PROVIDERS[i])}
        />

        <Field
          label="Name on the account"
          value={accountName}
          onChangeText={(t) => { setAccountName(t); if (nameError) setNameError(undefined); }}
          placeholder="Marikina Animal Welfare Group"
          maxLength={NAME_MAX}
          error={nameError}
        />

        <Text style={styles.label}>QR image</Text>
        <TouchableOpacity style={styles.photoBtn} onPress={addQrImage} activeOpacity={0.85}>
          {uploading ? <ActivityIndicator color={colors.teal} />
            : <Text style={styles.photoText}>{qrUrl ? "✓ QR added" : "Add the QR image"}</Text>}
        </TouchableOpacity>

        {error ? <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">{error}</Text> : null}

        <Button label="Save" onPress={submit} loading={submitting} style={styles.submit} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 60 },
  draftNote: { marginTop: 4, marginBottom: 6, color: colors.teal, ...typography.meta, fontWeight: "600", lineHeight: 19 },
  label: { marginTop: 20, marginBottom: 10, color: colors.ink, ...typography.strong, fontWeight: "700" },
  photoBtn: { minHeight: 90, paddingVertical: 12, paddingHorizontal: 12, borderRadius: radii.field, borderWidth: 2, borderColor: colors.border, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  photoText: { color: colors.teal, ...typography.subtitle, fontWeight: "700" },
  error: { marginTop: 18, color: colors.danger, ...typography.strong, fontWeight: "700" },
  submit: { marginTop: 26 }
});
