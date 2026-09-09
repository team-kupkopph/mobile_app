import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from "react-native";

import { colors, elevation, pill, typography } from "../../theme";

type SegmentedControlProps = {
  /** Two or three. More than three belongs in a filter row or a picker, not here. */
  segments: string[];
  index: number;
  onChange: (i: number) => void;
  style?: StyleProp<ViewStyle>;
};

// ⚠️ 54, not the canvas's 48. At 48 with 5 pt of padding each segment is 38 pt tall —
// below the 44 pt floor, and touchTargets.test.ts caught it. The canvas got this wrong; the
// floor wins. 44 + 2x5 = 54.
const SEGMENT = 44;
const PAD = 5;
const HEIGHT = SEGMENT + PAD * 2;

export function SegmentedControl({ segments, index, onChange, style }: SegmentedControlProps) {
  return (
    <View style={[styles.track, style]} accessibilityRole="tablist">
      {segments.map((label, i) => {
        const active = i === index;
        return (
          <TouchableOpacity
            key={label}
            activeOpacity={0.8}
            onPress={() => onChange(i)}
            accessibilityRole="tab"
            accessibilityLabel={label}
            // Half of what a control means to a screen reader is WHICH one is selected.
            accessibilityState={{ selected: active }}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: HEIGHT,
    padding: PAD,
    borderRadius: pill(HEIGHT),
    backgroundColor: colors.segmentTrack,
    flexDirection: "row"
  },
  segment: {
    // flex:1 rather than a measured thumb width: the segments divide whatever width the track
    // is given, so this works at any screen size without arithmetic that can drift.
    flex: 1,
    // Declared, not inherited — the guard requires an explicit target, and a height that comes
    // out of a parent's padding is exactly the kind that silently shrinks later.
    height: SEGMENT,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: pill(SEGMENT)
  },
  segmentActive: { backgroundColor: colors.white, ...elevation.soft },
  label: { ...typography.body, fontWeight: "600", color: colors.muted },
  labelActive: { fontWeight: "800", color: colors.teal }
});
