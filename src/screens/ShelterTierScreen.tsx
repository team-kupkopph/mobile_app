// US-B1 — shelter path, choose tier. Reference: screens/user/screen-shelter-tier.png
// Tier is carried client-side from here through signup → otp → shelterSetup (where it is written
// to shelter_profile). Never label tier 1 "Independent rescuer" (decision 3): it is "Community rescue".
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View
} from "react-native";

import { ShelterTier } from "../api/types";
import { useApi } from "../api/useApi";
import { useAuth } from "../auth/AuthContext";
import { isReturningSocialAccount } from "../auth/socialRouting";
import { RootStackParamList } from "../navigation/types";
import { AuthHeader, SHELTER_STEP_COUNT, authColors } from "./AuthFormKit";
import { elevation, maxFontScale, radii, spacing, typography } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "shelterTier">;

const options: Array<{ tier: ShelterTier; title: string; body: string; glyph: string }> = [
  {
    tier: "community_rescue",
    title: "Community rescue",
    body: "Home-based or informal rescue. Get Verified Rescue with a lighter set of documents.",
    glyph: "♥"
  },
  {
    tier: "registered_ngo",
    title: "Registered NGO",
    body: "A registered shelter or org (SEC/DTI). Verified Shelter — uncapped fees, escalation-eligible.",
    glyph: "▦"
  }
];

export function ShelterTierScreen({ navigation, route }: Props) {
  const api = useApi();
  const { setTokens } = useAuth();
  const social = route.params?.social;
  const [busy, setBusy] = useState(false);
  // R6-F10 · at a large font scale (AX3 and up) the icon, the text and the chevron cannot share a row: the text
  // column is too narrow for a title word ("Organization" broke as "Organi / zation"). The card stacks, so the
  // title gets the card's full width. Default size is untouched.
  const { fontScale } = useWindowDimensions();
  const large = fontScale > 1.5;

  async function onPick(tier: ShelterTier) {
    if (!social) {
      navigation.navigate("signup", { accountType: "shelter", tier });
      return;
    }
    // Social shelter: the provider already asserted the email, so there is no signup form and
    // no code. The account is created only now, because the tier chosen here lands on
    // shelter_profile in the very next step.
    if (busy) return;
    setBusy(true);
    try {
      const res = await api.post(`/auth/social/${social.provider}`, {
        id_token: social.idToken,
        account_type: "shelter"
      });
      if (res.ok) {
        await setTokens({ access: res.data.access, refresh: res.data.refresh });
        if (isReturningSocialAccount(res.data)) {
          // Test-plan F8: an existing account (the server ignored `account_type` and the tier
          // was never sent) — this was a sign-in. Home, not shelter setup for an account that
          // may well be personal.
          navigation.reset({ index: 0, routes: [{ name: "home" }] });
          return;
        }
        navigation.navigate("shelterSetup", { tier });
        return;
      }
      Alert.alert("Couldn't finish sign-in", res.data?.error?.message ?? "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.screen}>
      <AuthHeader title="Shelter type" activeStep={0} stepCount={SHELTER_STEP_COUNT} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title} maxFontSizeMultiplier={maxFontScale.title}>What kind of shelter?</Text>
        <Text style={styles.caption}>This sets which documents we'll ask for — you can start either way today.</Text>

        {options.map((opt, i) => (
          <TouchableOpacity
            key={opt.tier}
            activeOpacity={0.85}
            disabled={busy}
            onPress={() => onPick(opt.tier)}
            style={[styles.card, i > 0 && styles.secondCard, large && styles.cardLarge]}
          >
            <View style={styles.iconCircle}>
              <Text style={styles.glyph}>{opt.glyph}</Text>
            </View>
            <View style={[styles.copy, large && styles.copyLarge]}>
              <Text style={styles.cardTitle} maxFontSizeMultiplier={maxFontScale.title}>{opt.title}</Text>
              <Text style={styles.cardBody}>{opt.body}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: authColors.page },
  content: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  title: { color: authColors.ink, ...typography.hero, lineHeight: 30 },
  caption: { marginTop: 6, color: authColors.muted, ...typography.meta, lineHeight: 20 },
  card: {
    marginTop: 28,
    borderWidth: 1,
    borderColor: authColors.border,
    borderRadius: radii.card,
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 18,
    paddingVertical: 22,
    backgroundColor: "#FFFFFF",
    ...elevation.soft
  },
  secondCard: { marginTop: 18 },
  iconCircle: {
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 30,
    backgroundColor: authColors.paleTeal
  },
  glyph: { color: authColors.teal, fontSize: 26, fontWeight: "900" },
  copy: { flex: 1, marginLeft: 18 },
  cardLarge: { flexDirection: "column", alignItems: "flex-start" },
  copyLarge: { marginLeft: 0, marginTop: 14, alignSelf: "stretch", flexGrow: 0, flexBasis: "auto" },
  cardTitle: { color: authColors.ink, ...typography.section },
  cardBody: { marginTop: 6, color: authColors.muted, ...typography.meta, lineHeight: 17 },
  chevron: { color: authColors.muted, fontSize: 19, fontWeight: "700", marginLeft: 8 }
});
