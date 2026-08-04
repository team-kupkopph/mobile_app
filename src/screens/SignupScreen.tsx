// US-A1 step 2 — reference: screens/user/screen-signup.png
// POST /auth/signup { account_type, display_name, email, password } -> 201 { account_id, email, next }
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { RootStackParamList } from "../navigation/types";
import { AuthHeader, FormField, PrimaryButton, authColors } from "./AuthFormKit";

type Props = NativeStackScreenProps<RootStackParamList, "signup">;

export function SignupScreen({ navigation, route }: Props) {
  const api = useApi();
  const { accountType } = route.params;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [formError, setFormError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = name.trim().length > 0 && email.trim().length > 0 && password.length > 0 && !submitting;

  async function onSubmit() {
    if (!canSubmit) return;
    setEmailError(undefined);
    setFormError(undefined);
    setSubmitting(true);
    try {
      const res = await api.post("/auth/signup", {
        account_type: accountType,
        display_name: name.trim(),
        email: email.trim(),
        password
      });
      if (res.status === 409) {
        setEmailError("That email is already registered.");
        return;
      }
      if (res.ok) {
        navigation.navigate("otp", { email: email.trim(), mode: "signup" });
        return;
      }
      setFormError(res.data?.error?.message ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.screen}>
      <AuthHeader title="Create account" activeStep={1} onBack={() => navigation.goBack()} />

      <View style={styles.content}>
        <Text style={styles.title}>Let's get you set up</Text>
        <Text style={styles.caption}>A few details and you're in.</Text>

        <FormField label="Full name" value={name} onChangeText={setName} autoCapitalize="words" autoComplete="name" />
        <FormField
          label="Email"
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            if (emailError) setEmailError(undefined);
          }}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          error={emailError}
        />
        <FormField
          label="Password"
          value={password}
          onChangeText={setPassword}
          secure={!passwordVisible}
          onToggleSecure={() => setPasswordVisible((visible) => !visible)}
          autoComplete="password-new"
        />

        <Text style={styles.helper}>We'll email you a 6-digit code to verify it.</Text>

        {!!formError && <Text style={styles.formError}>{formError}</Text>}

        <PrimaryButton label="Send code" onPress={onSubmit} disabled={!canSubmit} loading={submitting} style={styles.submitButton} />

        {/* "signin" isn't registered until M6 — inert for now rather than wired to something misleading. */}
        <TouchableOpacity activeOpacity={0.75} disabled>
          <Text style={styles.linkCentered}>Already have an account? Log in</Text>
        </TouchableOpacity>

        <Text style={styles.terms}>By creating an account you agree to our Terms & Privacy Policy.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: authColors.page
  },
  content: {
    flex: 1,
    paddingHorizontal: 28
  },
  title: {
    color: authColors.ink,
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 30
  },
  caption: {
    marginTop: 5,
    color: authColors.muted,
    fontSize: 14,
    lineHeight: 20
  },
  helper: {
    marginTop: 16,
    color: authColors.muted,
    fontSize: 12,
    lineHeight: 17
  },
  formError: {
    marginTop: 14,
    color: authColors.danger,
    fontSize: 13,
    fontWeight: "700"
  },
  submitButton: {
    marginTop: 26
  },
  linkCentered: {
    marginTop: 20,
    color: "#08716D",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center"
  },
  terms: {
    marginTop: 18,
    color: "#9A988F",
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center"
  }
});
