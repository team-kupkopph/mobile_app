// US-V8 · terminal confirmation after a volunteer requests a shift.
// Reference: screens/user/screen-kawanggawa-requested.png. No route params (kawanggawaRequested:
// undefined) — KawangGawaDetailScreen navigates here right after POST /shifts/{id}/signups
// succeeds, so this screen doesn't know which shift it was; it just points onward to the
// schedule (where the new "requested" row shows up) or back to the hub to browse more.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { ClockIcon } from "../components/AppIcons";
import { RootStackParamList } from "../navigation/types";
import { TAP_SLOP } from "../touch";
import { colors, spacing, typography } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "kawanggawaRequested">;

export function KawangGawaRequestedScreen({ navigation }: Props) {
  return (
    <View style={styles.screen} testID="screen.kawanggawaRequested">
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <ClockIcon color={colors.teal} size={44} />
        </View>

        <Text style={styles.heading}>Request sent!</Text>
        <Text style={styles.subheading}>
          The shelter will review your request and confirm the shift shortly.
        </Text>

        <Text style={styles.hint}>
          Once confirmed, it moves from "Awaiting approval" to your upcoming shifts.
        </Text>

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.primaryButton}
          onPress={() => navigation.navigate("kawanggawaSchedule")}
        >
          <Text style={styles.primaryText}>View my schedule</Text>
        </TouchableOpacity>

        <TouchableOpacity hitSlop={TAP_SLOP}
          activeOpacity={0.7}
          style={styles.secondaryButton}
          onPress={() => navigation.navigate("kawanggawa")}
        >
          <Text style={styles.secondaryText}>Browse more opportunities</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: 100, alignItems: "center" },
  iconCircle: {
    width: 108, height: 108, borderRadius: 54, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.soft
  },
  heading: { marginTop: 24, color: colors.ink, fontSize: 28, fontWeight: "800" },
  subheading: { marginTop: 10, color: colors.muted, ...typography.body, textAlign: "center" },
  hint: { marginTop: 26, color: colors.muted, fontSize: 13, textAlign: "center", lineHeight: 19 },
  primaryButton: {
    width: "100%", height: 56, marginTop: 34, borderRadius: 28, alignItems: "center",
    justifyContent: "center", backgroundColor: colors.teal
  },
  primaryText: { color: colors.white, ...typography.subtitle, fontWeight: "800" },
  secondaryButton: { marginTop: 18, paddingVertical: 10 },
  secondaryText: { color: colors.teal, fontSize: 15, fontWeight: "700" }
});
