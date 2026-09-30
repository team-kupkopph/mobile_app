// D1 (dev/sagip-build-review.md) · one person's consent to share their phone and email with
// the other people on a rescue. Off unless they turn it on; they can turn it off again. The
// hint names exactly what is shared and with whom — a consent that doesn't say what it covers
// isn't one (the volunteer contact consent's K2 lesson).
import { StyleSheet, Switch, Text, View } from "react-native";

import { colors, spacing, typography } from "../../theme";
import { Card } from "../ui";

type Props = {
  label: string;
  hint: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
  testID?: string;
};

export function ContactShareRow({ label, hint, value, onValueChange, disabled, testID }: Props) {
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <View style={styles.text}>
          <Text style={[styles.label, disabled && styles.dim]}>{label}</Text>
          <Text style={styles.hint}>{hint}</Text>
        </View>
        <Switch
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          trackColor={{ true: colors.teal }}
          accessibilityLabel={label}
          accessibilityHint={hint}
          testID={testID}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 16, padding: spacing.lg },
  row: { flexDirection: "row", alignItems: "center", gap: 14 },
  text: { flex: 1 },
  label: { color: colors.ink, ...typography.subtitle, fontWeight: "700" },
  dim: { color: colors.muted },
  hint: { marginTop: 4, color: colors.muted, ...typography.meta, lineHeight: 17 }
});
