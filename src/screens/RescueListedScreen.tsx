// US-H1 · list-from-rescue confirmation. No listingId rides along here (RescueListScreen's
// POST /cases/{caseId}/list response is just { listing_id }, and the route carries no
// params — see RootStackParamList) so this is a plain confirmation, not a link-through.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { CheckIcon } from "../components/AppIcons";
import { RootStackParamList } from "../navigation/types";
import { colors, spacing, squircle, typography } from "../theme";
import { Button } from "../components/ui";


type Props = NativeStackScreenProps<RootStackParamList, "rescueListed">;

export function RescueListedScreen({ navigation }: Props) {
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}><CheckIcon color={colors.white} size={30} /></View>
          <Text style={styles.heroTitle}>Listed for adoption</Text>
          <Text style={styles.heroBody}>The animal now shows up in Adopt once your account clears verification.</Text>
        </View>

        <Button
          label="Back to my rescues"
          onPress={() => navigation.navigate("myRescues")}
          style={styles.primary}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 90, paddingBottom: 60 },
  hero: { alignItems: "center" },
  heroIcon: { width: 76, height: 76, borderRadius: squircle(76), alignItems: "center", justifyContent: "center", backgroundColor: colors.teal },
  heroTitle: { marginTop: 18, color: colors.ink, ...typography.hero },
  heroBody: { marginTop: 8, color: colors.muted, ...typography.subtitle, textAlign: "center" },
  primary: { marginTop: 40 }
});
