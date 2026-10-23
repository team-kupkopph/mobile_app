// US-Q1 · upload (or replace) the shelter's donation QR. Draft-first like listings
// (decision 2's pattern) — this works before the org is approved; POST /shelter/
// donation-qr doesn't check verification. The public donate surface (US-Q2) is the
// separate, always-both-keys gate (org approved AND this QR reviewer-verified).
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { AccessibilityInfo, ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { donationQrSaveError, NAME_MAX } from "../donationQrErrors";
import { pickAndUpload } from "../media/pickAndUpload";
import { uploadErrorMessage } from "../upload";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { RootStackParamList } from "../navigation/types";
import { colors, radii, spacing, squircle, typography } from "../theme";
import { Button, Card, Field, ScreenHeader, SegmentedControl } from "../components/ui";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { OwnQr, rowsFor } from "../ownQr";
import { TAP_SLOP } from "../touch";

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
  // DW2 · the shelter's OWN QRs (AT3): the form opens knowing what is live, what is pending and why a replacement was refused.
  const [own, setOwn] = useState<OwnQr[] | null>(null);
  const [ownRes, setOwnRes] = useState<{ ok: boolean; status: number } | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | undefined>(undefined);
  // AT36 · say it to VoiceOver as well as drawing it (RN's live region is Android-only).
  const setError = (message: string | undefined) => {
    setErrorState(message);
    if (message) AccessibilityInfo.announceForAccessibility(message);
  };

  const loadOwn = useCallback(() => {
    api.get("/shelter/donation-qr").then((r) => {
      setOwnRes({ ok: r.ok, status: r.status });
      if (r.ok) setOwn(r.data.donation_qrs ?? []);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus only
  }, []);
  useFocusEffect(loadOwn);

  const { live, pending, refused } = rowsFor(own, provider);
  // Replacing a LIVE code needs the account password (owner decision Q3; backend: 403 reauth_required).
  const needsPassword = !!live;

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
    setPasswordError(undefined);
    if (!accountName.trim()) { setNameError("Enter the name on the receiving account."); return; }
    if (!qrUrl) { setError("Add the QR image."); return; }
    if (needsPassword && !password) { setPasswordError("Enter your account password to replace a live QR."); return; }
    setSubmitting(true);
    setError(undefined);

    const res = await api.post("/shelter/donation-qr", {
      provider, account_name: accountName.trim(), file_url: qrUrl,
      ...(needsPassword ? { current_password: password } : {})
    });

    setSubmitting(false);
    if (res.ok) {
      // AT8 · a receipt, in words that match what the backend now does (DW2): a replacement never takes the live code down.
      Alert.alert(
        "Sent for review",
        needsPassword
          ? "Your current QR stays live until it's verified. We'll let you know when it's reviewed."
          : "Donors will see this QR once it's verified. We'll let you know when it's reviewed.",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
      return;
    }
    const failure = donationQrSaveError(res);
    if (failure.field === "name") setNameError(failure.message);
    else if (failure.field === "password") setPasswordError(failure.message);
    else setError(failure.message);
  }

  function takeOffline(row: OwnQr) {
    const isLive = row.status === "live";
    Alert.alert(
      isLive ? "Take this QR offline now?" : "Cancel this replacement?",
      isLive ? "Donors won't see this QR until you add a new one and it's reviewed." : "Your current QR stays live.",
      [{ text: "Keep it", style: "cancel" },
       { text: isLive ? "Take it offline" : "Cancel replacement", style: "destructive", onPress: async () => {
          const r = await api.post(`/shelter/donation-qr/${row.donation_qr_id}/offline`, {});
          if (r.ok) loadOwn(); else setError("Couldn't update that. Try again.");
        } }]
    );
  }

  // Without the shelter's own QRs the form cannot know whether a password is needed, so a failed load says so (with a retry) instead of guessing.
  const ownState = loadState(ownRes);
  if (own === null && ownState.kind !== "loading" && ownState.kind !== "ready" && ownState.kind !== "empty") {
    return (
      <View style={styles.screen}>
        <ScreenBackdrop />
        <ScreenHeader title="Donation QR" onBack={() => navigation.goBack()} />
        <LoadStateView state={ownState} onRetry={loadOwn} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenBackdrop />
      <ScreenHeader title="Donation QR" onBack={() => navigation.goBack()} />

      <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.draftNote}>
          Reviewed before donations go live. A replacement is reviewed while your current QR stays live.
        </Text>

        <Text style={styles.label}>Payment app</Text>
        <SegmentedControl
          segments={PROVIDERS.map((p) => PROVIDER_LABEL[p])}
          index={PROVIDERS.indexOf(provider)}
          onChange={(i) => setProvider(PROVIDERS[i])}
        />

        {/* AT3 · what is on file for this payment app: the live code, a pending replacement, and why the last one was refused. */}
        {live ? (
          <Card style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Image source={{ uri: live.qr_image_url }} style={styles.statusThumb} resizeMode="contain" />
              <View style={styles.statusCopy}>
                <Text style={styles.statusTitle}>Live now</Text>
                <Text style={styles.statusBody}>Donors see this code. {live.account_name}</Text>
              </View>
            </View>
            <TouchableOpacity hitSlop={TAP_SLOP} onPress={() => takeOffline(live)} accessibilityRole="button">
              <Text style={styles.dangerLink}>Take my QR offline now</Text>
            </TouchableOpacity>
          </Card>
        ) : null}
        {pending ? (
          <Card style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Image source={{ uri: pending.qr_image_url }} style={styles.statusThumb} resizeMode="contain" />
              <View style={styles.statusCopy}>
                <Text style={styles.statusTitle}>Replacement pending verification</Text>
                <Text style={styles.statusBody}>
                  {pending.overdue ? "Still being reviewed. " : ""}{live ? "Your current QR stays live meanwhile." : "Not visible to donors yet."}
                </Text>
              </View>
            </View>
            <TouchableOpacity hitSlop={TAP_SLOP} onPress={() => takeOffline(pending)} accessibilityRole="button">
              <Text style={styles.dangerLink}>{live ? "Cancel the replacement" : "Withdraw this QR"}</Text>
            </TouchableOpacity>
          </Card>
        ) : null}
        {!pending && refused ? (
          <Text style={styles.refusedNote}>
            Your last {live ? "replacement" : "QR"} wasn't approved{refused.decision_note ? `: ${refused.decision_note}` : "."} Upload a different image to try again.
          </Text>
        ) : null}

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
            : qrUrl ? (
              <>
                <Image source={{ uri: qrUrl }} style={styles.preview} resizeMode="contain" />
                <Text style={styles.photoText}>✓ QR added · tap to change</Text>
              </>
            ) : <Text style={styles.photoText}>Add the QR image</Text>}
        </TouchableOpacity>

        {needsPassword ? (
          <Field
            label="Your account password"
            value={password}
            onChangeText={(t) => { setPassword(t); if (passwordError) setPasswordError(undefined); }}
            secure={!showPassword}
            onToggleSecure={() => setShowPassword((v) => !v)}
            autoCapitalize="none"
            autoCorrect={false}
            error={passwordError}
          />
        ) : null}

        {error ? <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">{error}</Text> : null}

        <Button label={needsPassword ? "Send replacement for review" : "Save"} onPress={submit} loading={submitting} style={styles.submit} />
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
  submit: { marginTop: 26 },
  preview: { width: 120, height: 120, marginBottom: 8, borderRadius: squircle(120), backgroundColor: colors.white },
  statusCard: { marginTop: 16, padding: spacing.lg },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  statusThumb: { width: 64, height: 64, borderRadius: squircle(64), backgroundColor: colors.border },
  statusCopy: { flex: 1 },
  statusTitle: { color: colors.ink, ...typography.strong, fontWeight: "800" },
  statusBody: { marginTop: 4, color: colors.muted, ...typography.meta, lineHeight: 19 },
  dangerLink: { marginTop: 12, color: colors.danger, ...typography.strong, fontWeight: "700" },
  refusedNote: { marginTop: 16, color: colors.danger, ...typography.meta, lineHeight: 19 }
});
