// US-A5 — reference: screens/user/screen-signin.png
// POST /auth/login { email, password } -> 401 invalid | 403 unverified | 200 { access, refresh }
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Image, ImageSourcePropType, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { useAuth } from "../auth/AuthContext";
import { useSocialSignIn } from "../auth/useSocialSignIn";
import { RootStackParamList } from "../navigation/types";
import { SimpleHeader, authColors } from "./AuthFormKit";
import { Button, Field } from "../components/ui";
import { SocialSignIn } from "../components/ui/SocialSignIn";
import { colors, gradients, radii, spacing, typography } from "../theme";
import { TAP_SLOP } from "../touch";
import { ScreenBackdrop } from "../components/ScreenBackground";

const paw = require("../../assets/paw-white.png") as ImageSourcePropType;

type Props = NativeStackScreenProps<RootStackParamList, "signin">;

export function SigninScreen({ navigation }: Props) {
  const onSocial = useSocialSignIn(navigation);
  const api = useApi();
  const { setTokens } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [passwordError, setPasswordError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  /**
   * Design-system rule: NEVER disable a submit button because of validation.
   *
   * This screen used `disabled={!canSubmit}`, so with an empty field the only control on
   * the screen was greyed out and said nothing about why. A person who cannot see what is
   * missing has nothing to act on — they can only guess, or leave. An enabled button that
   * answers the question the moment they press it is strictly more usable, and it is the
   * one affordance a screen reader can also reach and announce.
   *
   * `submitting` is a different thing and still blocks: that is a request in flight, not a
   * validation error, and double-submitting a login is a real bug. `PrimaryButton` derives
   * `isDisabled` from `loading` on its own, so passing `loading={submitting}` is enough.
   */
  async function onSubmit() {
    if (submitting) return;
    const missingEmail = email.trim().length === 0 ? "Enter your email." : undefined;
    const missingPassword = password.length === 0 ? "Enter your password." : undefined;
    setEmailError(missingEmail);
    setPasswordError(missingPassword);
    if (missingEmail || missingPassword) return;
    setError(undefined);
    setSubmitting(true);
    try {
      const res = await api.post("/auth/login", { email: email.trim(), password });
      if (res.status === 401) {
        // Deliberately generic — never confirm whether the email itself is registered.
        setError("Email or password is incorrect.");
        return;
      }
      if (res.status === 429) {
        // ⚠️ A THROTTLE IS NOT "something went wrong". Found by an E2E run tripping the login
        // rate limit: the catch-all below told the person to try again, which is precisely
        // what the throttle exists to stop — so they retry, extend the lockout, and the app
        // never explains why. ExportDataScreen already gets this right for its 3/day limit.
        const wait = Number(res.data?.error?.details?.retry_after);
        const mins = Number.isFinite(wait) ? Math.max(1, Math.ceil(wait / 60)) : null;
        setError(mins
          ? `Too many sign-in attempts. Try again in about ${mins} minute${mins === 1 ? "" : "s"}.`
          : "Too many sign-in attempts. Please wait a few minutes and try again.");
        return;
      }
      if (res.status === 403) {
        navigation.navigate("otp", { email: email.trim(), mode: "unverified" });
        return;
      }
      if (res.ok) {
        await setTokens({ access: res.data.access, refresh: res.data.refresh });
        // Single-stack nav doesn't auto-switch on token change — explicitly land on home.
        navigation.reset({ index: 0, routes: [{ name: "home" }] });
        return;
      }
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.screen} testID="screen.signin">
      <ScreenBackdrop />
      <SimpleHeader onBack={() => navigation.goBack()} />

      <View style={styles.content}>
        <View style={styles.logoMark}>
          <LinearGradient colors={[colors.teal, colors.tealDark]} style={styles.logoGradient}>
            <Image source={paw} resizeMode="contain" style={styles.logoIcon} />
          </LinearGradient>
        </View>

        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.caption}>Log in to keep helping.</Text>

        <Field
          testID="field.signin.email"
          label="Email"
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            if (error) setError(undefined);
            if (emailError) setEmailError(undefined);
          }}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          error={emailError}
        />
        <Field
          testID="field.signin.password"
          label="Password"
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            if (error) setError(undefined);
            if (passwordError) setPasswordError(undefined);
          }}
          secure={!passwordVisible}
          onToggleSecure={() => setPasswordVisible((visible) => !visible)}
          autoComplete="password"
          error={passwordError}
          returnKeyType="go"
          onSubmitEditing={onSubmit}
        />

        {!!error && <Text style={styles.formError}>{error}</Text>}

        <TouchableOpacity hitSlop={TAP_SLOP}
          activeOpacity={0.75}
          onPress={() => navigation.navigate("forgotPassword")}
          style={styles.forgotWrap}
        >
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        <Button testID="btn.signin.submit" label="Log in" onPress={onSubmit} loading={submitting} style={styles.submitButton} />

        {/* The canvas draws the provider row HERE, on Log in (SignIn.dc.html) — the one place
            it is designed. Order and spacing are the artboard's: 26 under the CTA, 18 under
            the rule. Both providers go through the same handler as Welcome's. */}
        <SocialSignIn testIDPrefix="signin" onPress={onSocial} />

        <TouchableOpacity hitSlop={TAP_SLOP} activeOpacity={0.75} onPress={() => navigation.navigate("accountType")}>
          <Text style={styles.linkCentered}>New to Kupkop? Create account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "transparent"
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    alignItems: "center"
  },
  logoMark: {
    marginTop: 8
  },
  logoGradient: {
    width: 84,
    height: 84,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center"
  },
  logoIcon: {
    width: 42,
    height: 42
  },
  title: {
    marginTop: 22,
    color: authColors.ink,
    fontSize: 26,
    fontWeight: "800"
  },
  caption: {
    marginTop: 5,
    color: authColors.muted,
    ...typography.meta
  },
  formError: {
    alignSelf: "stretch",
    marginTop: 12,
    // ⚠️ ON A SURFACE, not on the raw backdrop. danger (#B23B3B) is 4.34:1 against the
    // backdrop's darkest content point — below the 4.5 floor — but 5.18:1 on dangerBg. This is
    // the app's one place where danger text sat on the mesh unsurfaced; the tint fixes it and
    // also makes the message read as a block rather than a stray red line.
    backgroundColor: colors.dangerBg,
    borderRadius: radii.chip,
    paddingHorizontal: 12,
    paddingVertical: 8,
    overflow: "hidden",
    color: authColors.danger,
    ...typography.meta,
    fontWeight: "700"
  },
  forgotWrap: {
    alignSelf: "flex-end",
    marginTop: 14
  },
  forgotText: {
    color: colors.teal,
    ...typography.meta,
    fontWeight: "800"
  },
  submitButton: {
    alignSelf: "stretch",
    marginTop: 22
  },
  linkCentered: {
    marginTop: 22,
    color: colors.teal,
    ...typography.meta,
    fontWeight: "800",
    textAlign: "center"
  }
});
