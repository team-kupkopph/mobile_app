// Task 13 (AS6) · Change email, in two steps on one screen.
//   1. POST /me/email { new_email, password }  -> 202   (a code goes to the NEW address)
//   2. POST /me/email/verify { code }          -> 200 { access, refresh, email }
//
// The email is the account's recovery channel, so the server insists on the current password and a code
// from the new inbox, and it revokes EVERY other session on success. It hands back a fresh pair for THIS
// device, and that pair must be stored: without it the next request 401s and the person is signed out
// of the phone they just used (same reason as Change password).
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";

import { useApi } from "../api/useApi";
import { useAuth } from "../auth/AuthContext";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { Button, Card, Field, ScreenHeader } from "../components/ui";
import {
  ChangeEmailFieldErrors,
  changeEmailFieldErrors,
  changeEmailRequestErrorFrom,
  changeEmailVerifyErrorFrom,
  codeError,
} from "../changeEmail";
import { RootStackParamList } from "../navigation/types";
import { colors, maxFontScale, radii, spacing, typography } from "../theme";
import { authColors } from "./AuthFormKit";

type Props = NativeStackScreenProps<RootStackParamList, "changeEmail">;

export function ChangeEmailScreen({ navigation }: Props) {
  const api = useApi();
  const { setTokens } = useAuth();

  const [step, setStep] = useState<"enter" | "code">("enter");
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<ChangeEmailFieldErrors>({});
  const [codeMessage, setCodeMessage] = useState<string | undefined>(undefined);
  const [formError, setFormError] = useState<string | undefined>(undefined);
  const [noPassword, setNoPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  async function sendCode() {
    if (busy) return;
    const found = changeEmailFieldErrors({ newEmail, password });
    setErrors(found);
    setFormError(undefined);
    if (Object.keys(found).length > 0) return;

    setBusy(true);
    try {
      const res = await api.post("/me/email", { new_email: newEmail.trim(), password });
      if (res.ok) {
        setCode("");
        setCodeMessage(undefined);
        setStep("code");
        return;
      }
      const err = changeEmailRequestErrorFrom(res);
      if (err.noPassword) { setNoPassword(true); return; }
      if (err.field) setErrors({ [err.field]: err.message });
      else setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (busy) return;
    const bad = codeError(code);
    if (bad) { setCodeMessage(bad); return; }

    setBusy(true);
    setCodeMessage(undefined);
    try {
      const res = await api.post("/me/email/verify", { code });
      if (res.ok) {
        await setTokens({ access: res.data.access, refresh: res.data.refresh });
        Alert.alert("Email changed", "You've been signed out on your other devices.");
        navigation.goBack();
        return;
      }
      const err = changeEmailVerifyErrorFrom(res);
      if (err.restart) { setStep("enter"); setFormError(err.message); setCode(""); }
      else setCodeMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.screen} testID="screen.changeEmail">
      <ScreenBackdrop />
      <ScreenHeader title="Change email" onBack={() => navigation.goBack()} align="center" />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        {noPassword ? (
          <Card style={styles.card} testID="state.changeEmail.noPassword">
            <Text style={styles.cardTitle} accessibilityRole="header" maxFontSizeMultiplier={maxFontScale.title}>
              Set a password first
            </Text>
            <Text style={styles.cardBody}>
              This account signs in with Google or Apple. Use Forgot password to set a password, then come back to change your email.
            </Text>
            <Button label="Use Forgot password" onPress={() => navigation.navigate("forgotPassword")}
                    style={styles.cardButton} />
          </Card>
        ) : step === "enter" ? (
          <>
            <Text style={styles.lede}>
              We&apos;ll send a code to your new address. When you confirm it, every other device is signed out.
            </Text>

            <Field
              testID="field.changeEmail.newEmail"
              label="New email"
              value={newEmail}
              onChangeText={(v) => { setNewEmail(v); if (errors.newEmail) setErrors({ ...errors, newEmail: undefined }); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              error={errors.newEmail}
              returnKeyType="next"
            />
            <Field
              testID="field.changeEmail.password"
              label="Current password"
              value={password}
              onChangeText={(v) => { setPassword(v); if (errors.password) setErrors({ ...errors, password: undefined }); }}
              secure={!showPassword}
              onToggleSecure={() => setShowPassword((v) => !v)}
              autoComplete="current-password"
              error={errors.password}
              returnKeyType="go"
              onSubmitEditing={sendCode}
            />

            {!!formError && <Text style={styles.formError} accessibilityRole="alert">{formError}</Text>}

            <Button testID="btn.changeEmail.send" label="Send code" onPress={sendCode} loading={busy}
                    style={styles.submit} />
          </>
        ) : (
          <>
            <Text style={styles.lede}>
              We sent a 6-digit code to {newEmail.trim()}. It can take a minute to arrive.
            </Text>

            <Field
              testID="field.changeEmail.code"
              label="Code"
              value={code}
              onChangeText={(v) => { setCode(v.replace(/\D/g, "").slice(0, 6)); if (codeMessage) setCodeMessage(undefined); }}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              maxLength={6}
              error={codeMessage}
              returnKeyType="go"
              onSubmitEditing={confirm}
            />

            <Button testID="btn.changeEmail.confirm" label="Change email" onPress={confirm} loading={busy}
                    style={styles.submit} />
            <Button testID="btn.changeEmail.back" label="Use a different address" variant="secondary"
                    onPress={() => { setStep("enter"); setFormError(undefined); }} style={styles.secondary} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "transparent" },
  content: { padding: 20, paddingBottom: 48 },
  lede: { color: authColors.muted, ...typography.body, marginBottom: 12 },
  card: { marginTop: 8 },
  cardTitle: { color: authColors.ink, ...typography.title },
  cardBody: { color: authColors.muted, ...typography.body, marginTop: 6 },
  cardButton: { marginTop: 14 },
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
  submit: { alignSelf: "stretch", marginTop: spacing.lg },
  secondary: { alignSelf: "stretch", marginTop: spacing.sm },
});
