// Owner-side verify-phone — the generic first-use flow (decision 14: phone is a nullable
// attribute, OTP-verified at first use). Its first real trigger is an adoption inquiry
// (US-A4), which is why it lands this sprint. Distinct from ShelterPhoneVerifyScreen,
// which is shelter-onboarding-specific (4-dot stepper, routes into shelterVerify).
// Two steps in one screen: enter number (POST /me/phone) -> enter the 6-digit code
// (POST /me/phone/verify). On success it just goes back — the caller (e.g. the listing
// detail) is still mounted and re-fetches on focus, so the user re-taps the gated action.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, NativeSyntheticEvent, StyleSheet, Text, TextInput,
  TextInputKeyPressEventData, TouchableOpacity, View
} from "react-native";

import { useApi } from "../api/useApi";
import { RootStackParamList } from "../navigation/types";
import { FormField, PrimaryButton, SimpleHeader, authColors } from "./AuthFormKit";

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

type Props = NativeStackScreenProps<RootStackParamList, "verifyPhone">;

export function VerifyPhoneScreen({ navigation }: Props) {
  const api = useApi();
  const [step, setStep] = useState<"enter" | "code">("enter");
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [enterError, setEnterError] = useState<string | undefined>(undefined);

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [codeError, setCodeError] = useState<string | undefined>(undefined);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [resendNotice, setResendNotice] = useState<string | undefined>(undefined);
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const code = digits.join("");

  async function sendCode() {
    const trimmed = phone.trim();
    if (!trimmed) { setEnterError("Enter your mobile number."); return; }
    if (sending) return;
    setSending(true);
    setEnterError(undefined);
    const res = await api.post("/me/phone", { phone: trimmed });
    setSending(false);
    if (res.ok || res.status === 202) {
      setStep("code");
      setCooldown(RESEND_COOLDOWN_SECONDS);
      return;
    }
    if (res.data?.error?.code === "phone_taken") {
      setEnterError("That number can't be used. Try another.");
      return;
    }
    setEnterError(res.data?.error?.message ?? "Couldn't send the code. Try again.");
  }

  function updateDigit(text: string, index: number) {
    const nextDigit = text.replace(/\D/g, "").slice(-1);
    setDigits((current) => {
      const next = [...current];
      next[index] = nextDigit;
      return next;
    });
    if (codeError) setCodeError(undefined);
    if (nextDigit && index < CODE_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  }

  function onKeyPress(event: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) {
    if (event.nativeEvent.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  useEffect(() => {
    if (code.length === CODE_LENGTH && !submittedRef.current) verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires only when the 6th digit lands
  }, [code]);

  async function verify() {
    if (code.length !== CODE_LENGTH || verifying) return;
    submittedRef.current = true;
    setVerifying(true);
    setCodeError(undefined);
    try {
      const res = await api.post("/me/phone/verify", { code });
      if (res.status === 400) {
        const attemptsLeft = res.data?.error?.details?.attempts_left;
        setCodeError(attemptsLeft != null ? `Incorrect code. ${attemptsLeft} tries left.` : "Incorrect code.");
        setDigits(Array(CODE_LENGTH).fill(""));
        inputRefs.current[0]?.focus();
        return;
      }
      if (res.status === 410) { setCodeError("That code expired. Send a new one."); return; }
      if (res.status === 423) { setCodeError("Too many attempts. Send a new code."); return; }
      if (res.ok) {
        Alert.alert("Phone verified", "You're all set — you can inquire now.");
        navigation.goBack();
        return;
      }
      setCodeError("Something went wrong. Please try again.");
    } finally {
      submittedRef.current = false;
      setVerifying(false);
    }
  }

  async function resend() {
    if (cooldown > 0) return;
    setResendNotice(undefined);
    await api.post("/me/phone", { phone: phone.trim() });
    setResendNotice("We sent a new code.");
    setCooldown(RESEND_COOLDOWN_SECONDS);
    setDigits(Array(CODE_LENGTH).fill(""));
    inputRefs.current[0]?.focus();
  }

  return (
    <View style={styles.screen}>
      <SimpleHeader
        title="Verify your number"
        onBack={() => (step === "code" ? setStep("enter") : navigation.goBack())}
      />
      <View style={styles.content}>
        {step === "enter" ? (
          <>
            <Text style={styles.title}>Add your mobile number</Text>
            <Text style={styles.caption}>
              We'll text a code to confirm it. It's how a shelter or poster reaches you about an
              adoption — your number stays private until you inquire.
            </Text>
            <View style={{ marginTop: 24 }}>
              <FormField
                label="Mobile number"
                value={phone}
                onChangeText={(v) => { setPhone(v); if (enterError) setEnterError(undefined); }}
                keyboardType="phone-pad"
                autoComplete="tel"
                error={enterError}
              />
            </View>
            <PrimaryButton
              label="Send code"
              onPress={sendCode}
              disabled={!phone.trim()}
              loading={sending}
              style={styles.actionButton}
            />
          </>
        ) : (
          <>
            <Text style={styles.title}>Enter the code</Text>
            <Text style={styles.caption}>We texted a 6-digit code to</Text>
            <Text style={styles.phoneText}>{phone}</Text>

            <View style={styles.otpRow}>
              {digits.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(input) => { inputRefs.current[index] = input; }}
                  value={digit}
                  onChangeText={(text) => updateDigit(text, index)}
                  onKeyPress={(event) => onKeyPress(event, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  style={[styles.otpBox, !!codeError && styles.otpBoxError]}
                  textAlign="center"
                />
              ))}
            </View>

            {!!codeError && <Text style={styles.errorText}>{codeError}</Text>}

            <Text style={styles.resendHint}>Didn't get a code?</Text>
            <TouchableOpacity activeOpacity={0.75} onPress={resend} disabled={cooldown > 0}>
              <Text style={[styles.resendAction, cooldown > 0 && styles.resendMuted]}>
                {cooldown > 0 ? `Resend in 0:${cooldown.toString().padStart(2, "0")}` : "Resend code"}
              </Text>
            </TouchableOpacity>
            {!!resendNotice && <Text style={styles.resendNotice}>{resendNotice}</Text>}

            <PrimaryButton
              label="Verify"
              onPress={verify}
              disabled={code.length !== CODE_LENGTH}
              loading={verifying}
              style={styles.actionButton}
            />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: authColors.page },
  content: { flex: 1, paddingHorizontal: 28 },
  title: { color: authColors.ink, fontSize: 24, fontWeight: "800", lineHeight: 30 },
  caption: { marginTop: 8, color: authColors.muted, fontSize: 14, lineHeight: 20 },
  phoneText: { marginTop: 3, color: authColors.ink, fontSize: 15, fontWeight: "800" },
  otpRow: { marginTop: 30, flexDirection: "row", justifyContent: "space-between" },
  otpBox: {
    width: 46, height: 56, alignItems: "center", justifyContent: "center", borderWidth: 1,
    borderColor: authColors.border, borderRadius: 12, padding: 0, backgroundColor: "#FFFFFF",
    color: authColors.ink, fontSize: 22, fontWeight: "800"
  },
  otpBoxError: { borderColor: authColors.danger },
  errorText: { marginTop: 14, color: authColors.danger, fontSize: 13, fontWeight: "700", textAlign: "center" },
  resendHint: { marginTop: 26, color: authColors.muted, fontSize: 12, textAlign: "center" },
  resendAction: { marginTop: 6, color: "#08716D", fontSize: 13, fontWeight: "800", textAlign: "center" },
  resendMuted: { color: "#B6B0A7" },
  resendNotice: { marginTop: 6, color: authColors.teal, fontSize: 12, fontWeight: "700", textAlign: "center" },
  actionButton: { marginTop: 30 }
});
