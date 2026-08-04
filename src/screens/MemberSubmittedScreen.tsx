// US-A4 step 3 — reference: screens/user/screen-member-verify-submitted.png.
// Terminal success screen for the submission flow. "Back to home" resets the stack (not goBack/
// navigate) so HomeScreen remounts and its useFocusEffect refetches /me — that's what flips on
// the amber "Verified Member · Under review" banner built in M4.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { ClockIcon } from "../components/AppIcons";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "memberSubmitted">;

export function MemberSubmittedScreen({ navigation }: Props) {
  function backToHome() {
    navigation.reset({ index: 0, routes: [{ name: "home" }] });
  }

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.checkCircle}>
          <View style={styles.checkMarkStem} />
          <View style={styles.checkMarkKick} />
        </View>

        <Text style={styles.heading}>Request submitted</Text>
        <Text style={styles.subheading}>We've got your ID and social link.</Text>

        <View style={styles.noticeBar}>
          <View style={styles.noticeIcon}>
            <ClockIcon color={colors.teal} size={26} />
          </View>
          <View style={styles.noticeCopy}>
            <Text style={styles.noticeTitle}>This takes a few days</Text>
            <Text style={styles.noticeBody}>A person reviews every request — usually 2-3 business days. We'll notify you.</Text>
          </View>
        </View>

        <Text style={styles.hint}>You can use everything else while you wait.</Text>

        <TouchableOpacity activeOpacity={0.85} style={styles.doneButton} onPress={backToHome}>
          <Text style={styles.doneText}>Back to home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const colors = {
  ink: "#12213A",
  teal: "#1C6B6B",
  tealDark: "#14504F",
  page: "#F4F5F2",
  muted: "#5F5E5A",
  paleTeal: "#E7F0EE"
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.page
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 90,
    alignItems: "center"
  },
  checkCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DCEED0"
  },
  checkMarkStem: {
    position: "absolute",
    width: 5,
    height: 20,
    borderRadius: 3,
    backgroundColor: "#2E5B1E",
    transform: [{ rotate: "45deg" }, { translateX: 8 }, { translateY: -2 }]
  },
  checkMarkKick: {
    position: "absolute",
    width: 5,
    height: 34,
    borderRadius: 3,
    backgroundColor: "#2E5B1E",
    transform: [{ rotate: "-45deg" }, { translateX: -2 }, { translateY: -8 }]
  },
  heading: {
    marginTop: 22,
    color: colors.ink,
    fontSize: 26,
    fontWeight: "800"
  },
  subheading: {
    marginTop: 6,
    color: colors.muted,
    fontSize: 14
  },
  noticeBar: {
    width: "100%",
    marginTop: 34,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 14,
    backgroundColor: colors.paleTeal
  },
  noticeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF"
  },
  noticeCopy: {
    flex: 1
  },
  noticeTitle: {
    color: colors.tealDark,
    fontSize: 14,
    fontWeight: "800"
  },
  noticeBody: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17
  },
  hint: {
    marginTop: 22,
    color: "#9A988F",
    fontSize: 12,
    textAlign: "center"
  },
  doneButton: {
    width: "100%",
    height: 54,
    marginTop: 26,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.teal
  },
  doneText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800"
  }
});
