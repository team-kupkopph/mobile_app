import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from "react-native";

import { colors, spacing, typography } from "../../theme";
import { TAP_SLOP } from "../../touch";

type SectionHeaderProps = {
  title: string;
  /** Optional trailing action, e.g. "See all". */
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function SectionHeader({ title, actionLabel, onAction, style }: SectionHeaderProps) {
  return (
    <View style={[styles.row, style]}>
      <Text style={styles.title}>{title}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity
          onPress={onAction}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`${actionLabel}, ${title}`}
          // ⚠️ A bare <Text> in a touchable is only as tall as its line box — 17-21 pt against a
          // 44 pt floor. hitSlop grows the target without moving the layout, which is what a
          // designed row needs. (For a tight STACK of links, fix the spacing instead: slop is
          // invisible and overlapping slop makes the topmost sibling win every contested tap.)
          hitSlop={TAP_SLOP}
        >
          <Text style={styles.action}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
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
