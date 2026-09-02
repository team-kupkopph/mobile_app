// US-A1/A5 — reference: screens/user/screen-otp-locked.png
// Reached via OtpScreen's 423 (code_locked) branch after 5 failed verify attempts. No API call on
// entry — only on "Send a new code" (POST /auth/email/resend), which hands back to OtpScreen for
// a fresh 6-digit code.
// Note: this screen takes only { email } (matches RootStackParamList) — the actual dead digits
// the user typed aren't threaded through, so the 6 boxes below are decorative placeholders, not
// a replay of their input. We always resume in "signup" mode: OtpScreen's unverified-resume path
// re-enters at signin after verifying anyway, so a fresh code from here is equivalent either way.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useApi } from "../api/useApi";
import { RootStackParamList } from "../navigation/types";
import { PrimaryButton, SimpleHeader, authColors } from "./AuthFormKit";

const CODE_LENGTH = 6;

type Props = NativeStackScreenProps<RootStackParamList, "otpLocked">;

export function OtpLockedScreen({ navigation, route }: Props) {
  const api = useApi();
  const { email } = route.params;
  const [sending, setSending] = useState(false);

  async function onSendNewCode() {
    if (sending) return;
    setSending(true);
    try {
      await api.post("/auth/email/resend", { email });
      navigation.replace("otp", { email, mode: "signup" });
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={styles.screen}>
      <SimpleHeader title="Verify your email" onBack={() => navigation.goBack()} />

      <View style={styles.content}>
        <Text style={styles.title}>Enter the code</Text>
        <Text style={styles.caption}>We emailed a 6-digit code to</Text>
        <Text style={styles.emailText}>{email}</Text>

        <View style={styles.otpRow}>
          {Array.from({ length: CODE_LENGTH }).map((_, index) => (
            <View key={index} style={styles.otpBox}>
              <Text style={styles.otpDigit}>•</Text>
            </View>
          ))}
        </View>

        <View style={styles.noticeBar}>
          <Text style={styles.noticeIcon}>!</Text>
          <View style={styles.noticeCopy}>
            <Text style={styles.noticeTitle}>Too many tries — this code is dead</Text>
            <Text style={styles.noticeBody}>
              You used all 5 attempts. Nothing is wrong with your account — you just need a fresh code.
            </Text>
          </View>
        </View>

        <PrimaryButton label="Send a new code" onPress={onSendNewCode} loading={sending} style={styles.sendButton} />

        <Text style={styles.capHint}>You can request 5 codes an hour.</Text>
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
  emailText: {
    marginTop: 3,
    color: authColors.ink,
    fontSize: 15,
    fontWeight: "800"
  },
  otpRow: {
    marginTop: 30,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  otpBox: {
    width: 46,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: authColors.border,
    borderRadius: 12,
    backgroundColor: "#EDECE7"
  },
  otpDigit: {
    color: "#B6B0A7",
    fontSize: 22,
    fontWeight: "800"
  },
  noticeBar: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FBE4E1"
  },
  noticeIcon: {
    width: 22,
    height: 22,
    marginRight: 12,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: authColors.danger,
    color: authColors.danger,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 19
  },
  noticeCopy: {
    flex: 1
  },
  noticeTitle: {
    color: authColors.danger,
    fontSize: 14,
    fontWeight: "800"
  },
  noticeBody: {
    marginTop: 4,
    color: "#8A3A33",
    fontSize: 12,
    lineHeight: 17
  },
  sendButton: {
    marginTop: 26
  },
  capHint: {
    marginTop: 16,
    color: "#9A988F",
    fontSize: 12,
    textAlign: "center"
  }
});
