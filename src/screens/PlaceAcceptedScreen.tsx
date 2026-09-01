// US-H3 · placement-accepted confirmation. Like RescueListedScreen/RescuePlaceSentScreen
// (US-H1/H2), the route carries no params — PlacementDecisionView's accept response is just
// { pet_id }, not threaded through — so this is a plain confirmation, not a link-through.
// The natural next stop is My pets, but that route doesn't exist yet (it lands in Task 8 —
// see RootStackParamList's Track H notes); rather than add a route this task doesn't own and
// point it at a screen that isn't registered yet, this links back to Home like the sibling
// H1/H2 confirmations link back to My rescues.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { CheckIcon } from "../components/AppIcons";
import { RootStackParamList } from "../navigation/types";

const colors = {
  ink: "#12213A", teal: "#1C6B6B", page: "#F4F5F2", muted: "#5F5E5A", white: "#FFFFFF"
};

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

        <TouchableOpacity
          style={styles.primary}
          activeOpacity={0.9}
          onPress={() => navigation.navigate("home", undefined)}
        >
          <Text style={styles.primaryText}>Back to home</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: 26, paddingTop: 90, paddingBottom: 60 },
  hero: { alignItems: "center" },
  heroIcon: { width: 76, height: 76, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: colors.teal },
  heroTitle: { marginTop: 18, color: colors.ink, fontSize: 30, fontWeight: "800" },
  heroBody: { marginTop: 8, color: colors.muted, fontSize: 17, textAlign: "center" },
  primary: { marginTop: 40, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", backgroundColor: colors.teal },
  primaryText: { color: colors.white, fontSize: 22, fontWeight: "700" }
});
