// US-B3 — SMS-verify the shelter's contact number. Reference: screens/user/screen-otp-sms.png
// POST /me/phone/verify { code } -> 200 { phone_verified_at } · 400/410/423 like the email OTP.
// POST /me/phone { phone } to resend. Mirrors OtpScreen's 6-box entry, but for the sms/phone purpose.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useRef, useState } from "react";
import {
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TextInput,
  TextInputKeyPressEventData,
  TouchableOpacity,
  View
} from "react-native";

import { useApi } from "../api/useApi";
import { RootStackParamList } from "../navigation/types";
import { AuthHeader, PrimaryButton, SHELTER_STEP_COUNT, authColors } from "./AuthFormKit";

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

type Props = NativeStackScreenProps<RootStackParamList, "shelterPhoneVerify">;

export function ShelterPhoneVerifyScreen({ navigation, route }: Props) {
  const api = useApi();
  const { tier, phone } = route.params;

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [error, setError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [resendNotice, setResendNotice] = useState<string | undefined>(undefined);
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const code = digits.join("");

  function updateDigit(text: string, index: number) {
    const nextDigit = text.replace(/\D/g, "").slice(-1);
    setDigits((current) => {
      const next = [...current];
      next[index] = nextDigit;
      return next;
    });
    if (error) setError(undefined);
    if (nextDigit && index < CODE_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  }

  function onKeyPress(event: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) {
    if (event.nativeEvent.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  useEffect(() => {
    if (code.length === CODE_LENGTH && !submittedRef.current) onVerify();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires only when the 6th digit lands
  }, [code]);

  async function onVerify() {
    if (code.length !== CODE_LENGTH || submitting) return;
    submittedRef.current = true;
    setSubmitting(true);
    setError(undefined);
    try {
      const res = await api.post("/me/phone/verify", { code });
      if (res.status === 400) {
        const attemptsLeft = res.data?.error?.details?.attempts_left;
        setError(`Incorrect code. ${attemptsLeft} tries left.`);
        setDigits(Array(CODE_LENGTH).fill(""));
        inputRefs.current[0]?.focus();
        return;
      }
      if (res.status === 410) {
        setError("That code expired. Send a new one.");
        return;
      }
      if (res.status === 423) {
        setError("Too many attempts. Send a new code.");
        return;
      }
      if (res.ok) {
        navigation.navigate("shelterVerify", { tier });
        return;
      }
      setError("Something went wrong. Please try again.");
    } finally {
      submittedRef.current = false;
      setSubmitting(false);
    }
  }

  async function onResend() {
    if (cooldown > 0) return;
    setResendNotice(undefined);
    await api.post("/me/phone", { phone });
    setResendNotice("We sent a new code.");
    setCooldown(RESEND_COOLDOWN_SECONDS);
    setDigits(Array(CODE_LENGTH).fill(""));
    inputRefs.current[0]?.focus();
  }

  return (
    <View style={styles.screen}>
      <AuthHeader title="Verify your number" activeStep={2} stepCount={SHELTER_STEP_COUNT} onBack={() => navigation.goBack()} />
      <View style={styles.content}>
        <Text style={styles.title}>Enter the code</Text>
        <Text style={styles.caption}>We texted a 6-digit code to</Text>
        <Text style={styles.phoneText}>{phone}</Text>

        <View style={styles.otpRow}>
          {digits.map((digit, index) => (
            <TextInput
              key={index}
              ref={(input) => {
                inputRefs.current[index] = input;
              }}
              value={digit}
              onChangeText={(text) => updateDigit(text, index)}
              onKeyPress={(event) => onKeyPress(event, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              style={[styles.otpBox, !!error && styles.otpBoxError]}
              textAlign="center"
            />
          ))}
        </View>

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <Text style={styles.resendHint}>Didn't get a code?</Text>
        <TouchableOpacity activeOpacity={0.75} onPress={onResend} disabled={cooldown > 0}>
          <Text style={[styles.resendAction, cooldown > 0 && styles.resendMuted]}>
            {cooldown > 0 ? `Resend in 0:${cooldown.toString().padStart(2, "0")}` : "Resend code"}
          </Text>
        </TouchableOpacity>
        {!!resendNotice && <Text style={styles.resendNotice}>{resendNotice}</Text>}

        <PrimaryButton label="Verify" onPress={onVerify} disabled={code.length !== CODE_LENGTH} loading={submitting} style={styles.verifyButton} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: authColors.page },
  content: { flex: 1, paddingHorizontal: 28 },
  title: { color: authColors.ink, fontSize: 24, fontWeight: "800", lineHeight: 30 },
  caption: { marginTop: 5, color: authColors.muted, fontSize: 14, lineHeight: 20 },
  phoneText: { marginTop: 3, color: authColors.ink, fontSize: 15, fontWeight: "800" },
  otpRow: { marginTop: 30, flexDirection: "row", justifyContent: "space-between" },
  otpBox: {
    width: 46,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: authColors.border,
    borderRadius: 12,
    padding: 0,
    backgroundColor: "#FFFFFF",
    color: authColors.ink,
    fontSize: 22,
    fontWeight: "800"
  },
  otpBoxError: { borderColor: authColors.danger },
  errorText: { marginTop: 14, color: authColors.danger, fontSize: 13, fontWeight: "700", textAlign: "center" },
  resendHint: { marginTop: 26, color: authColors.muted, fontSize: 12, textAlign: "center" },
  resendAction: { marginTop: 6, color: "#08716D", fontSize: 13, fontWeight: "800", textAlign: "center" },
  resendMuted: { color: "#B6B0A7" },
  resendNotice: { marginTop: 6, color: authColors.teal, fontSize: 12, fontWeight: "700", textAlign: "center" },
  verifyButton: { marginTop: 30 }
});
