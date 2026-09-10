import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

import { colors, spacing, typography } from "../../theme";
import { TAP_SLOP } from "../../touch";
import { PressScale } from "./PressScale";

type SectionHeaderProps = {
  title: string;
  /** Optional trailing action, e.g. "See all". */
  actionLabel?: string;
  onAction?: () => void;
  /**
   * Make the WHOLE ROW the control instead of just the label.
   *
   * ⚠️ This exists because converting Home's rows without it would have been a regression.
   * Two of its three section rows are tappable end to end; rebuilding them as title + link
   * would have shrunk a full-width target down to the width of the words "See all". A
   * primitive that forces its consumers to get smaller is not worth adopting.
   */
  onPress?: () => void;
  /**
   * Lands on whichever element is actually the control — the row when `onPress` is given,
   * the label when `onAction` is.
   *
   * ⚠️ ONE PROP, NOT TWO, and e2eSelectors.test.ts is why. The first version had a separate
   * `actionTestID`, and the guard went red on `btn.home.adopt`: it scans for `testID="…"` and
   * `testID: "…"`, so an id passed under a bespoke name is invisible to it. A selector the
   * guard cannot see is a selector nobody can prove still exists.
   */
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

export function SectionHeader({ title, actionLabel, onAction, onPress, testID, style }: SectionHeaderProps) {
  const Row = onPress ? PressScale : View;
  const rowProps = onPress
    ? { onPress, testID, accessibilityRole: "button" as const, accessibilityLabel: `${title}${actionLabel ? ", " + actionLabel : ""}` }
    // ⚠️ NO testID ON THE ROW HERE. When the LABEL is the control, the id must sit on the
    // label alone: putting it on both meant two elements answered to `btn.home.adopt`, and
    // Maestro tapped the first — the plain View, which has no handler. The tap reported
    // COMPLETED and nothing happened, so flow 20 failed one step later on `screen.adopt`.
    // e2eSelectors.test.ts could not catch this: the selector DID exist, just not on the
    // thing that does something. Only the flow could.
    : {};
  return (
    <Row style={[styles.row, style]} {...rowProps}>
      <Text style={styles.title}>{title}</Text>
      {actionLabel && onAction && !onPress ? (
        <PressScale
          testID={testID}
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={`${actionLabel}, ${title}`}
          // ⚠️ A bare <Text> in a touchable is only as tall as its line box — 17-21 pt against a
          // 44 pt floor. hitSlop grows the target without moving the layout, which is what a
          // designed row needs. (For a tight STACK of links, fix the spacing instead: slop is
          // invisible and overlapping slop makes the topmost sibling win every contested tap.)
          hitSlop={TAP_SLOP}
        >
          <Text style={styles.action}>{actionLabel}</Text>
        </PressScale>
      ) : actionLabel ? (
        <Text style={styles.action}>{actionLabel}</Text>
      ) : null}
    </Row>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginTop: spacing.xl,
    marginBottom: spacing.sm
  },
  title: { ...typography.section, color: colors.ink },
  action: { ...typography.meta, fontWeight: "700", color: colors.teal }
});
