// US-V8 · D-S5-1 — the volunteer waiver placeholder. Linked from the waiver checkbox on
// KawangGawaDetailScreen. There is no finalised waiver text yet; this screen says so plainly
// rather than inventing legal language. The volunteer still sends `waiver_accepted: true` when
// they check the box on the detail screen — the backend stamps the consent version server-side.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { RootStackParamList } from "../navigation/types";
import { colors, elevation, radii, spacing, typography } from "../theme";
import { ScreenHeader } from "../components/ui";


const card = {
  backgroundColor: colors.white, ...elevation.soft
};

type Props = NativeStackScreenProps<RootStackParamList, "waiver">;

export function WaiverScreen({ navigation }: Props) {
  return (
    <View style={styles.screen} testID="screen.waiver">
      <ScreenHeader title="Liability waiver & guidelines" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.noticeCard}>
          {/* TODO(D-S5-1): replace this placeholder with legal's finalised waiver text before M3 beta. */}
          <Text style={styles.body}>
            The full liability waiver and volunteer guidelines are still being finalised.
          </Text>
          <Text style={styles.body}>
            They'll be available here before you need to start volunteering, and you'll get a
            chance to review them then.
          </Text>
          <Text style={styles.body}>
            This page is not the waiver itself — no binding agreement exists yet.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 20, paddingBottom: 60 },
  noticeCard: { borderRadius: radii.tile, padding: 20, gap: 14, ...card },
  body: { color: colors.muted, ...typography.body }
});
