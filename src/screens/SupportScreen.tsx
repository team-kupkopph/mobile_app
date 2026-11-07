// Review step 7b · "Contact support" with a real way to do it. It used to be a line of plain text promising support later.
// Both stores want contact information a person can easily find and use (Apple 1.2 and 1.5). Reports, blocks and every
// other safety control point here when something is not covered.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, Linking, StyleSheet, Text, View } from "react-native";

import { Button, ScreenHeader } from "../components/ui";
import { RootStackParamList } from "../navigation/types";
import { SUPPORT_EMAIL, supportMailto } from "../support";
import { colors, spacing, typography } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "support">;

export function SupportScreen({ navigation }: Props) {
  async function email() {
    try {
      await Linking.openURL(supportMailto());
    } catch {
      // A phone with no mail app set up: say the address so it can be copied into whatever they do use.
      Alert.alert("No mail app found", `You can write to us at ${SUPPORT_EMAIL}.`);
    }
  }

  return (
    <View style={styles.screen} testID="screen.support">
      <ScreenHeader title="Contact support" onBack={() => navigation.goBack()} />
      <View style={styles.body}>
        <Text style={styles.lead}>Something wrong, or need a hand?</Text>
        <Text style={styles.text}>
          Write to us and a person will read it. If you are reporting someone or something, use the Report link on that
          screen instead: it reaches our review team directly.
        </Text>
        <Button label={`Email ${SUPPORT_EMAIL}`} onPress={() => { void email(); }} testID="btn.support.email"
          accessibilityHint="Opens your mail app" />
        <Text style={styles.address} selectable testID="text.support.address">{SUPPORT_EMAIL}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  body: { paddingHorizontal: spacing.lg, paddingTop: 24, gap: 16 },
  lead: { color: colors.ink, ...typography.title },
  text: { color: colors.muted, ...typography.body },
  address: { color: colors.muted, ...typography.meta, textAlign: "center" },
});
