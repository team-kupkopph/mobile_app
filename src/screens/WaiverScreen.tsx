// US-V8 · D-S5-1 — the volunteer waiver placeholder. Linked from the waiver checkbox on
// KawangGawaDetailScreen. There is no finalised waiver text yet; this screen says so plainly
// rather than inventing legal language. The volunteer still sends `waiver_accepted: true` when
// they check the box on the detail screen — the backend stamps the consent version server-side.
//
// Body copy lives in `src/launchGates.ts` (M4 launch gate 1) so a single source of truth
// tracks whether the placeholder is still active; see library/dev/launch-gates.md.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { WAIVER_BODY } from "../launchGates";
import { RootStackParamList } from "../navigation/types";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { colors, spacing, typography } from "../theme";
import { Card, ScreenHeader } from "../components/ui";

type Props = NativeStackScreenProps<RootStackParamList, "waiver">;

export function WaiverScreen({ navigation }: Props) {
  return (
    <View style={styles.screen} testID="screen.waiver">
      <ScreenBackdrop />
      <ScreenHeader title="Liability waiver & guidelines" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.noticeCard}>
          {WAIVER_BODY.map((paragraph, i) => (
            <Text key={i} style={styles.body}>{paragraph}</Text>
          ))}
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "transparent" },
  content: { paddingHorizontal: spacing.lg, paddingTop: 20, paddingBottom: 60 },
  noticeCard: { gap: 14 },
  body: { color: colors.muted, ...typography.body }
});
