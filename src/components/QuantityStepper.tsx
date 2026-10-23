// A whole-number stepper: – 5 +. Shared by the need form ("How many needed?") and the shelter's received-confirm
// dialog ("How many actually arrived?"), which both want the same control, bounded the same way.
//
// The glyphs do not scale (a glyph in a fixed 52 pt circle) and the number is capped, so at the largest Dynamic Type
// sizes it stays inside its pill (R6-F5, R6-F11). The track is a pill of its height, as SegmentedControl's is: 8 + 52 + 8.
import { StyleProp, StyleSheet, Text, TouchableOpacity, ViewStyle } from "react-native";

import { MAX_QTY } from "../community";
import { colors, maxFontScale, pill } from "../theme";
import { TAP_SLOP } from "../touch";
import { Card } from "./ui";

type Props = {
  value: number;
  onChange: (n: number) => void;
  /** Spoken names for the two buttons, e.g. "Decrease quantity needed". */
  decreaseLabel: string;
  increaseLabel: string;
  min?: number;
  max?: number;
  style?: StyleProp<ViewStyle>;
};

export function QuantityStepper({ value, onChange, decreaseLabel, increaseLabel, min = 1, max = MAX_QTY, style }: Props) {
  return (
    <Card style={[styles.stepper, style]}>
      <TouchableOpacity style={styles.stepBtn} onPress={() => onChange(Math.max(min, value - 1))} hitSlop={TAP_SLOP}
        accessibilityRole="button" accessibilityLabel={decreaseLabel}
        accessibilityValue={{ now: value }}><Text style={styles.stepGlyph} allowFontScaling={false}>–</Text></TouchableOpacity>
      <Text style={styles.qty} maxFontSizeMultiplier={maxFontScale.code}>{value}</Text>
      <TouchableOpacity style={styles.stepBtn} onPress={() => onChange(Math.min(max, value + 1))} hitSlop={TAP_SLOP}
        accessibilityRole="button" accessibilityLabel={increaseLabel}
        accessibilityValue={{ now: value }}><Text style={styles.stepGlyph} allowFontScaling={false}>+</Text></TouchableOpacity>
    </Card>
  );
}

const styles = StyleSheet.create({
  stepper: { flexDirection: "row", alignItems: "center", gap: 24, alignSelf: "flex-start", minHeight: 68, padding: 8, borderRadius: pill(68) },
  stepBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.soft, alignItems: "center", justifyContent: "center" },
  stepGlyph: { color: colors.teal, fontSize: 30, fontWeight: "800", marginTop: -2 },
  qty: { color: colors.ink, fontSize: 30, fontWeight: "800", minWidth: 40, textAlign: "center" }
});
