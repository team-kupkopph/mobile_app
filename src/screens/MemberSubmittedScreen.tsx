// US-A4 step 3 — reference: screens/user/screen-member-verify-submitted.png.
// Terminal success screen for the submission flow. "Back to home" resets the stack (not goBack/
// navigate) so HomeScreen remounts and its useFocusEffect refetches /me — that's what flips on
// the amber "Verified Member · Under review" banner built in M4.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { ClockIcon } from "../components/AppIcons";
import { RootStackParamList } from "../navigation/types";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { useLargeText } from "../useLargeText";
import { colors, maxFontScale, radii, spacing, typography } from "../theme";
import { Button, Card } from "../components/ui";

type Props = NativeStackScreenProps<RootStackParamList, "memberSubmitted">;

export function MemberSubmittedScreen({ navigation }: Props) {
  // At Dynamic Type AX3 and up the notice's icon cannot share a line with its text, so it stacks.
  const large = useLargeText();
  function backToHome() {
    navigation.reset({ index: 0, routes: [{ name: "home" }] });
  }

  return (
    <View style={styles.screen}>
      <ScreenBackdrop />
      {/* At AX5 the card outgrows the screen; a short one still sits where it did. */}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* The "done" layout: one hero Card carrying the check glyph, title, body and CTA. */}
        <Card tone="hero" style={styles.doneCard}>
          <View style={styles.checkCircle}>
            <View style={styles.checkMarkStem} />
            <View style={styles.checkMarkKick} />
          </View>

          <Text style={styles.heading} maxFontSizeMultiplier={maxFontScale.title}>Request submitted</Text>
          <Text style={styles.subheading}>We've got your ID and social link.</Text>

          <View style={[styles.noticeBar, large && styles.noticeBarLarge]}>
            <View style={styles.noticeIcon}>
              <ClockIcon color={colors.teal} size={26} />
            </View>
            <View style={large ? styles.noticeCopyLarge : styles.noticeCopy}>
              <Text style={styles.noticeTitle}>This takes a few days</Text>
              <Text style={styles.noticeBody}>A person reviews every request — usually 2-3 business days. We'll notify you.</Text>
            </View>
          </View>

          <Text style={styles.hint}>You can use everything else while you wait.</Text>

          <Button label="Back to home" onPress={backToHome} style={styles.doneButton} />
        </Card>
      </ScrollView>
    </View>
  );
}


const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.page
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: 90,
    paddingBottom: 60,
    alignItems: "center"
  },
  doneCard: {
    width: "100%",
    alignItems: "center"
  },
  checkCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.successBg
  },
  checkMarkStem: {
    position: "absolute",
    width: 5,
    height: 20,
    borderRadius: 3,
    backgroundColor: colors.success,
    transform: [{ rotate: "45deg" }, { translateX: 8 }, { translateY: -2 }]
  },
  checkMarkKick: {
    position: "absolute",
    width: 5,
    height: 34,
    borderRadius: 3,
    backgroundColor: colors.success,
    transform: [{ rotate: "-45deg" }, { translateX: -2 }, { translateY: -8 }]
  },
  heading: {
    marginTop: 22,
    color: colors.ink,
    ...typography.hero
  },
  subheading: {
    marginTop: 6,
    color: colors.muted,
    ...typography.meta
  },
  noticeBar: {
    width: "100%",
    marginTop: 34,
    borderRadius: radii.notice,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 14,
    backgroundColor: colors.soft
  },
  noticeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white
  },
  noticeCopy: {
    flex: 1
  },
  // large: stacked. The base `flex: 1` survives in a style array and would collapse the text in a column (`flex: 0` is what works, #189).
  noticeBarLarge: { flexDirection: "column", alignItems: "flex-start" },
  noticeCopyLarge: { flex: 0, alignSelf: "stretch", flexGrow: 0, flexBasis: "auto" },
  noticeTitle: {
    color: colors.tealDark,
    ...typography.meta,
    fontWeight: "800"
  },
  noticeBody: {
    marginTop: 4,
    color: colors.muted,
    ...typography.meta,
    lineHeight: 17
  },
  hint: {
    marginTop: 22,
    color: colors.muted,
    ...typography.meta,
    textAlign: "center"
  },
  doneButton: { width: "100%", marginTop: 26 }
});
