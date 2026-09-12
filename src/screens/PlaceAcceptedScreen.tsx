// US-H3 · placement-accepted confirmation. Like RescueListedScreen/RescuePlaceSentScreen
// (US-H1/H2), the route carries no params — PlacementDecisionView's accept response is just
// { pet_id }, not threaded through — so this is a plain confirmation, not a link-through.
// The natural next stop is My pets (Task 8), now registered — this links straight there.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { CheckIcon } from "../components/AppIcons";
import { RootStackParamList } from "../navigation/types";
import { colors, spacing, squircle, typography } from "../theme";
import { Button } from "../components/ui";


type Props = NativeStackScreenProps<RootStackParamList, "placeAccepted">;

export function PlaceAcceptedScreen({ navigation }: Props) {
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}><CheckIcon color={colors.white} size={30} /></View>
          <Text style={styles.heroTitle}>Welcome home!</Text>
          <Text style={styles.heroBody}>
            The placement's confirmed and the pet is now yours. Take good care of them.
          </Text>
        </View>

        <Button label="See my pets" onPress={() => navigation.navigate("myPets")} style={styles.primary} />
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
