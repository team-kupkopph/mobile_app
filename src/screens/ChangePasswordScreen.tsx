// Task 10 (AS6) · Change password. POST /me/password { current_password, new_password }
//   -> 200 { access, refresh } | 400 invalid_password / password_unchanged | 409 no_password | 429
//
// The server revokes EVERY other session (a password change is what you do when you fear someone
// else has the account) but hands back a fresh pair for THIS device. That pair must be stored:
// without it the next request 401s and the person is signed out of the phone they just used.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";

import { useApi } from "../api/useApi";
import { useAuth } from "../auth/AuthContext";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { Button, Card, Field, ScreenHeader } from "../components/ui";
import {
  ChangePasswordFieldErrors,
  changePasswordErrorFrom,
  changePasswordFieldErrors,
} from "../changePassword";
import { RootStackParamList } from "../navigation/types";
import { colors, maxFontScale, radii, spacing, typography } from "../theme";
import { authColors } from "./AuthFormKit";

type Props = NativeStackScreenProps<RootStackParamList, "changePassword">;

export function ChangePasswordScreen({ navigation }: Props) {
  const api = useApi();
  const { setTokens } = useAuth();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [errors, setErrors] = useState<ChangePasswordFieldErrors>({});
  const [formError, setFormError] = useState<string | undefined>(undefined);
  const [noPassword, setNoPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    if (busy) return;
    const found = changePasswordFieldErrors({ current, next, confirm });
    setErrors(found);
    setFormError(undefined);
    if (Object.keys(found).length > 0) return;

    setBusy(true);
    try {
      const res = await api.post("/me/password", { current_password: current, new_password: next });
      if (res.ok) {
        await setTokens({ access: res.data.access, refresh: res.data.refresh });
        Alert.alert("Password changed", "You've been signed out on your other devices.");
        navigation.goBack();
        return;
      }
      const err = changePasswordErrorFrom(res);
      if (err.noPassword) { setNoPassword(true); return; }
      if (err.field) setErrors({ [err.field]: err.message });
      else setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.screen} testID="screen.changePassword">
      <ScreenBackdrop />
      <ScreenHeader title="Change password" onBack={() => navigation.goBack()} align="center" />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        {noPassword ? (
          <Card style={styles.card} testID="state.changePassword.noPassword">
            <Text style={styles.cardTitle} accessibilityRole="header" maxFontSizeMultiplier={maxFontScale.title}>
              No password to change
            </Text>
            <Text style={styles.cardBody}>
              This account signs in with Google or Apple. Use Forgot password to set a password.
            </Text>
            <Button label="Use Forgot password" onPress={() => navigation.navigate("forgotPassword")}
                    style={styles.cardButton} />
          </Card>
        ) : (
          <>
            <Text style={styles.lede}>
              You&apos;ll stay signed in here. Every other device will be signed out.
            </Text>

            <Field
              testID="field.changePassword.current"
              label="Current password"
              value={current}
              onChangeText={(v) => { setCurrent(v); if (errors.current) setErrors({ ...errors, current: undefined }); }}
              secure={!showCurrent}
              onToggleSecure={() => setShowCurrent((v) => !v)}
              autoComplete="current-password"
              error={errors.current}
              returnKeyType="next"
            />
            <Field
              testID="field.changePassword.new"
              label="New password"
              value={next}
              onChangeText={(v) => { setNext(v); if (errors.next) setErrors({ ...errors, next: undefined }); }}
              secure={!showNext}
              onToggleSecure={() => setShowNext((v) => !v)}
              autoComplete="new-password"
              error={errors.next}
              returnKeyType="next"
            />
            <Field
              testID="field.changePassword.confirm"
              label="Confirm new password"
              value={confirm}
              onChangeText={(v) => { setConfirm(v); if (errors.confirm) setErrors({ ...errors, confirm: undefined }); }}
              secure={!showNext}
              autoComplete="new-password"
              error={errors.confirm}
              returnKeyType="go"
              onSubmitEditing={onSubmit}
            />

            {!!formError && <Text style={styles.formError} accessibilityRole="alert">{formError}</Text>}

            <Button testID="btn.changePassword.submit" label="Change password" onPress={onSubmit}
                    loading={busy} style={styles.submit} />
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
});
