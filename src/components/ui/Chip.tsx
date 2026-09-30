import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

import { colors, pill, typography } from "../../theme";

/**
 * The shared status vocabulary. One mapping, used by mobile and the admin console alike, so a
 * status means the same thing wherever it appears.
 *
 * ⚠️ Every entry is a background tint plus a foreground in the SAME hue family — never colour
 * as text alone on the page ground. Reuse a tone below for a new status rather than inventing
 * a colour per feature; that invention is how the palette reached 77 hexes.
 */
export const chipTones = {
  /** Approved · Active · Resolved · Verified · Adopted · Confirmed · Available */
  success: { bg: colors.successBg, fg: colors.success },
  /** Pending · Open · Urgent · Action needed */
  warning: { bg: colors.warningBg, fg: colors.warningStrong },
  /** Needs info · New · In progress */
  info: { bg: colors.infoBg, fg: colors.tealDark },
  /** Rejected · Suspended · Declined */
  danger: { bg: colors.dangerBg, fg: colors.danger },
  /** Dismissed · Unverified · anything genuinely neutral */
  neutral: { bg: colors.greyPill, fg: colors.muted }
} as const;

export type ChipTone = keyof typeof chipTones;

type ChipProps = {
  label: string;
  tone?: ChipTone;
  /** The leading dot. Off for a chip that already carries an icon. */
  dot?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Chip({ label, tone = "neutral", dot = true, style }: ChipProps) {
  const { bg, fg } = chipTones[tone];
  return (
    <View style={[styles.chip, { backgroundColor: bg }, style]}>
      {dot ? <View style={[styles.dot, { backgroundColor: fg }]} /> : null}
      <Text style={[styles.label, { color: fg }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

/**
 * ⚠️ A PILL, NOT `radii.chip` (F-R2-14). The canvas's own Status chips panel draws this element
 * at `height: 30px; border-radius: 15px`, and every padded chip on the artboards is exactly
 * half its height (26/13, 28/14, 32/16). The panel's `12px · chip` radius row contradicts the
 * chip it draws beside it; 12 on a 30 pt chip left a 6 pt straight run on each end. `radii.chip`
 * stays for the non-pill small containers that use it (OTP boxes, notes).
 */
const HEIGHT = 30;

const styles = StyleSheet.create({
  chip: {
    height: HEIGHT,
    paddingHorizontal: 12,
    borderRadius: pill(HEIGHT),
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start"
  },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 7 },
  label: { ...typography.meta, fontWeight: "800" }
});
