import { useEffect, useRef, useState } from "react";
import { Animated, LayoutChangeEvent, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

import { colors, elevation, motion, typography } from "../../theme";
import { useReducedMotion } from "../../useReducedMotion";
import { PressScale } from "./PressScale";

type SegmentedControlProps = {
  /** Two or three. More than three belongs in a filter row or a picker, not here. */
  segments: string[];
  index: number;
  onChange: (i: number) => void;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

/** The canvas's geometry, from Components.dc.html's "Segmented control" panel. */
const TRACK_HEIGHT = 48;
const PAD = 5;
const THUMB_HEIGHT = TRACK_HEIGHT - PAD * 2;   // 38
const TRACK_RADIUS = 24;
const THUMB_RADIUS = 19;

/**
 * Two or three views, with a thumb that travels.
 *
 * ⚠️ THE CANVAS SAYS IT IN FIVE WORDS: "The thumb slides; it does not cut." So this is ONE
 * absolutely-positioned thumb moved by translateX, not a highlight that appears under whichever
 * segment happens to be selected. The version written in US-FD3 and left on
 * `sprint11/fd3-primitives` did cut — and was 54 pt tall against the canvas's 48 — which is why
 * it was re-derived here rather than cherry-picked.
 *
 * ⚠️ The track uses `colors.segmentTrack` (#EAEDE8) where the canvas paints #E9ECE7 — one unit
 * of red, one of blue. `colors.ts`'s absorption policy is that near-identical values collapse
 * into the token rather than adding a hex, and its header is explicit that the token is the
 * thing screens should point at. Noted rather than silently diverged.
 */
export function SegmentedControl({ segments, index, onChange, testID, style }: SegmentedControlProps) {
  const reduced = useReducedMotion();
  const [trackWidth, setTrackWidth] = useState(0);
  const slot = trackWidth ? (trackWidth - PAD * 2) / segments.length : 0;
  const x = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!slot) return;
    if (reduced) {
      x.setValue(index * slot);
      return;
    }
    Animated.timing(x, {
      toValue: index * slot,
      // `--dur-slow`: the canvas gives the travelling thumb the longer duration, like the tab pill.
      duration: motion.durationSlow,
      easing: motion.easing,
      useNativeDriver: true
    }).start();
  }, [index, slot, reduced, x]);

  return (
    <View
      style={[styles.track, style]}
      testID={testID}
      accessibilityRole="tablist"
      onLayout={(e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width)}
    >
      {/* index -1 = nothing chosen yet (e.g. a required choice with no default): no thumb. */}
      {slot && index >= 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.thumb, { width: slot, transform: [{ translateX: x }] }]}
        />
      ) : null}
      <View style={styles.row}>
        {segments.map((label, i) => {
          const active = i === index;
          return (
            <PressScale
              key={label}
              style={styles.segment}
              onPress={() => onChange(i)}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: active }}
              testID={`seg.${label.toLowerCase().replace(/\s+/g, "")}`}
            >
              {/* F-R3-8 · shrink, never truncate. At Dynamic Type XXXL a third of a 402 pt track
                  could not hold "Confirmed · 3" and it read "Confirmed…", losing the count. The
                  track cannot grow (48 pt, the touchTargets veto), so the label gives way — down
                  to 0.6 ×, about 12 pt at XXXL and still above the caption step (0.7 × was the
                  first try; by estimate it leaves a two-digit "Confirmed · 24" truncating in a
                  375 pt SE's 108 pt segment) — and stops scaling at 1.5 ×,
                  where one line still sits well inside the 38 pt thumb. UISegmentedControl makes
                  the same trade. */}
              <Text
                style={[styles.label, active && styles.labelActive]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
                maxFontSizeMultiplier={1.5}
              >
                {label}
              </Text>
            </PressScale>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: TRACK_HEIGHT,
    padding: PAD,
    borderRadius: TRACK_RADIUS,
    backgroundColor: colors.segmentTrack,
    justifyContent: "center"
  },
  thumb: {
    position: "absolute",
    top: PAD,
    left: PAD,
    height: THUMB_HEIGHT,
    borderRadius: THUMB_RADIUS,
    backgroundColor: colors.white,
    ...elevation.soft
  },
  row: {
    flexDirection: "row",
    height: "100%"
  },
  segment: {
    flex: 1,
    height: "100%",
    // A shrunk label still needs air: without it "Pending · 12" ran thumb edge to thumb edge.
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center"
  },
  label: {
    ...typography.body,
    // ⚠️ NO LINE HEIGHT, AND NOT BY OVERSIGHT. iOS's shrink-to-fit mis-measures a label with a
    // fixed lineHeight: with body's 21 kept, "Browse" and "My shifts" rendered at about four
    // points on device, far under minimumFontScale. Body's leading is for running copy; this
    // is one centred line in a fixed thumb, and the default leading is what it needs.
    lineHeight: undefined,
    fontWeight: "600",
    color: colors.muted
  },
  labelActive: {
    fontWeight: "800",
    color: colors.teal
  }
});
