// US-H1 · list an adoption from a SAFE rescue case. POST /cases/{caseId}/list — species is
// inherited server-side from the report, so this form only asks for city, fee, and an
// optional name. Fee capping mirrors ListingFormScreen (same fee_cap_for on the backend).
// C15 · it creates a PRIVATE DRAFT carrying the report's photos, then continues into the
// listing form, where the rescuer adds the story and publishes. Nothing is public before that.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useApi } from "../api/useApi";
import { useAuth } from "../auth/AuthContext";
import { RootStackParamList } from "../navigation/types";
import { handoffConflictAction } from "../sagip";
import { colors, spacing, typography } from "../theme";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { Button, Field, ScreenHeader } from "../components/ui";

type Props = NativeStackScreenProps<RootStackParamList, "rescueList">;

export function RescueListScreen({ navigation, route }: Props) {
  const api = useApi();
  const { city: homeCity } = useAuth();
  const { caseId } = route.params;

  const [name, setName] = useState("");
  const [city, setCity] = useState(homeCity ?? "");
  const [fee, setFee] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    setError(undefined);

    const res = await api.post(`/cases/${caseId}/list`, {
      name: name.trim() || undefined,
      city: city.trim() || undefined,
      adoption_fee: fee || "0"
    });

    setSubmitting(false);
    if (res.ok) {
      navigation.replace("listingForm", { listingId: res.data.listing_id });
      return;
    }
    // C14 · an unfinished draft already exists for this animal: reopen it rather than refuse.
    const action = handoffConflictAction(res.data?.error);
    if (action?.kind === "openDraft") {
      navigation.replace("listingForm", { listingId: action.listingId });
      return;
    }
    const code = res.data?.error?.code;
    setError(
      action ? action.text
      : code === "fee_over_cap" ? `The adoption fee can't exceed ₱${res.data.error.details?.cap ?? 500}.`
      : code === "case_not_safe" ? "This case isn't marked safe yet — update its status first."
      : res.data?.error?.message ?? "Couldn't create the listing. Try again."
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenBackdrop />
      <ScreenHeader title="List for adoption" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.draftNote}>
          This saves a private draft with the report's photos — only you can see it. Next you add their story and publish it.
        </Text>

        <Field label="Name (optional)" value={name} onChangeText={setName} placeholder="Bantay" />

        <Field label="City" value={city} onChangeText={setCity} placeholder="Marikina" />

        <Field
          label="Adoption fee (₱)"
          value={fee}
          onChangeText={setFee}
          keyboardType="decimal-pad"
          placeholder="0"
        />
        <Text style={styles.fine}>
          Tier-1 rescues and individual Verified Members are capped at ₱500. Registered NGOs aren't capped.
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button label="List for adoption" onPress={submit} loading={submitting} style={styles.submit} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 60 },
  draftNote: { marginTop: 4, marginBottom: 6, color: colors.muted, ...typography.meta, lineHeight: 20 },
  fine: { marginTop: 8, color: colors.muted, ...typography.meta, lineHeight: 18 },
  error: { marginTop: 18, color: colors.danger, ...typography.strong, fontWeight: "700" },
  submit: { marginTop: 26 }
});
