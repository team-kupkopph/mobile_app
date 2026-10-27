// AS1 · "Restore your account?" — a deleted account still inside its 30 days, offered a way back.
// (Not "Welcome back": Log in is headed that, and the next screen read as a repeat of it.)
// POST /auth/restore { restore_token } -> 200 { access, refresh } | 400 token invalid | 429
//
// Reached from Log in, or from Google/Apple, when the backend answers `409 account_deleted`.
// That answer only ever follows a correct password or a verified provider identity, so showing
// this screen tells the person nothing about an account they do not own.
//
// The token is single-use and lasts ten minutes. If it has gone stale, pressing Restore again
// cannot work, so the secondary action becomes "Log in again" rather than leaving a button that
// fails the same way every time.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useApi } from "../api/useApi";
import { useAuth } from "../auth/AuthContext";
import { Button, Card } from "../components/ui";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { RootStackParamList } from "../navigation/types";
import { daysLeft, purgeDateLabel, restoreErrorMessage } from "../restore";
import { colors, maxFontScale, radii, spacing, typography } from "../theme";
import { SimpleHeader, authColors } from "./AuthFormKit";

type Props = NativeStackScreenProps<RootStackParamList, "restoreAccount">;

/** "That's 30 days from now." — or today / tomorrow, which read better than "0 days". */
function whenLine(purgeOn: string): string {
  const left = daysLeft(purgeOn);
  if (left === null) return "";
  if (left === 0) return " That's today.";
  if (left === 1) return " That's tomorrow.";
  return ` That's ${left} days from now.`;
}

export function RestoreAccountScreen({ navigation, route }: Props) {
  const { restoreToken, purgeOn } = route.params;
  const api = useApi();
  const { setTokens } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  // A 400 means the token is spent or stale: only a fresh sign-in can mint another.
  const [expired, setExpired] = useState(false);

  const dateLabel = purgeDateLabel(purgeOn);

  async function onRestore() {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    try {
      const res = await api.post("/auth/restore", { restore_token: restoreToken });
      if (res.ok) {
        await setTokens({ access: res.data.access, refresh: res.data.refresh });
        // Single-stack nav doesn't switch on a token change — land on home explicitly.
        navigation.reset({ index: 0, routes: [{ name: "home" }] });
        return;
      }
      setExpired(res.status === 400);
      setError(restoreErrorMessage(res));
    } finally {
      setBusy(false);
    }
  }

  function onDismiss() {
    navigation.reset({ index: 0, routes: [{ name: expired ? "signin" : "welcome" }] });
  }

  return (
    <View style={styles.screen} testID="screen.restoreAccount">
      <ScreenBackdrop />
      <SimpleHeader onBack={onDismiss} />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={maxFontScale.title}>
          Restore your account?
        </Text>
        <Text style={styles.lede}>
          {dateLabel
            ? `Your account is scheduled to be erased on ${dateLabel}.${whenLine(purgeOn)}`
            : "Your account is scheduled to be erased."}{" "}
          Restore it to keep it.
        </Text>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>What comes back</Text>
          <Text style={styles.cardBody}>
            Your profile, pets, listings and history are all still here.
          </Text>
          <Text style={styles.cardTitle}>What doesn&apos;t</Text>
          <Text style={styles.cardBody}>
            Pledges, and a shelter&apos;s wishlist and donation QR, ended when you deleted your
            account. They stay ended — you can set them up again.
          </Text>
        </Card>

        {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}

        <Button
          testID="btn.restore.submit"
          label="Restore my account"
          onPress={onRestore}
          loading={busy}
          style={styles.primary}
        />
        <Button
          testID="btn.restore.dismiss"
          label={expired ? "Log in again" : "Not now"}
          onPress={onDismiss}
          variant="secondary"
          style={styles.secondary}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "transparent" },
  content: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  title: { marginTop: 22, color: authColors.ink, ...typography.hero },
  lede: { marginTop: 8, color: authColors.muted, ...typography.body },
  card: { marginTop: 22 },
  cardTitle: { color: authColors.ink, ...typography.meta, fontWeight: "800", marginTop: 4 },
  cardBody: { color: authColors.muted, ...typography.body, marginTop: 4, marginBottom: 10 },
  error: {
    alignSelf: "stretch",
    marginTop: 16,
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
  primary: { alignSelf: "stretch", marginTop: 22 },
  secondary: { alignSelf: "stretch", marginTop: 10 },
});
