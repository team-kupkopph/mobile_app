// D1 (dev/sagip-build-review.md) · one person's consent to share their phone and email with
// the other people on a rescue. Off unless they turn it on; they can turn it off again. The
// hint names exactly what is shared and with whom — a consent that doesn't say what it covers
// isn't one (the volunteer contact consent's K2 lesson).
import { StyleSheet, Switch, Text, View } from "react-native";

import { useLargeText } from "../../useLargeText";
import { colors, maxFontScale, spacing, typography } from "../../theme";
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
  // At Dynamic Type AX3 and up the label cannot share a line with its Switch (one long word broke mid-word), so the Switch drops below the text.
  const large = useLargeText();
  return (
    <Card style={styles.card}>
      <View style={[styles.row, large && styles.rowLarge]}>
        <View style={large ? styles.textLarge : styles.text}>
          <Text style={[styles.label, disabled && styles.dim]} maxFontSizeMultiplier={maxFontScale.title}>{label}</Text>
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
  // large: stacked. The base `flex: 1` survives in a style array and would collapse the text in a column (`flex: 0` is what works, #189).
  rowLarge: { flexDirection: "column", alignItems: "flex-start" },
  textLarge: { flex: 0, alignSelf: "stretch", flexGrow: 0, flexBasis: "auto" },
  label: { color: colors.ink, ...typography.subtitle, fontWeight: "700" },
  dim: { color: colors.muted },
  hint: { marginTop: 4, color: colors.muted, ...typography.meta, lineHeight: 17 }
});
