// P2 · what an ex-claimer sees when the report they had a case on was removed by moderation
// (GET /reports/{id} → 410 report_removed). Said plainly, not as "not found" — it existed.
import { StyleSheet, Text, View } from "react-native";

import { colors, spacing, typography } from "../../theme";
import { Button, Card } from "../ui";

export function ReportRemovedCard({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.wrap}>
      <Card accent={colors.danger} testID="card.reportRemoved">
        <Text style={styles.title} accessibilityRole="header">This report was removed by moderation</Text>
        <Text style={styles.body}>There's nothing left to do on it.</Text>
        <View style={styles.action}>
          <Button label="Back" variant="secondary" onPress={onBack} testID="btn.reportRemoved.back" />
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.lg, paddingTop: 16 },
  title: { color: colors.ink, ...typography.section },
  body: { marginTop: 6, color: colors.muted, ...typography.subtitle },
  action: { marginTop: 16 }
});
