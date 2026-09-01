// US-H2 · direct-placement confirmation. Like RescueListedScreen (US-H1), no id rides along
// here — POST /cases/{caseId}/place's response isn't threaded through, and the route carries
// no params (see RootStackParamList) — so this is a plain confirmation, not a link-through.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { CheckIcon } from "../components/AppIcons";
import { RootStackParamList } from "../navigation/types";

const colors = {
  ink: "#12213A", teal: "#1C6B6B", page: "#F4F5F2", muted: "#5F5E5A", white: "#FFFFFF"
};

type Props = NativeStackScreenProps<RootStackParamList, "rescuePlaceSent">;

export function RescuePlaceSentScreen({ navigation }: Props) {
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}><CheckIcon color={colors.white} size={30} /></View>
          <Text style={styles.heroTitle}>Placement sent</Text>
          <Text style={styles.heroBody}>
            The recipient's been notified. They'll take it from here once they accept.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.primary}
          activeOpacity={0.9}
          onPress={() => navigation.navigate("myRescues")}
        >
          <Text style={styles.primaryText}>Back to my rescues</Text>
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
