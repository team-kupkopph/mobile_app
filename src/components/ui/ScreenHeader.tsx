import { ReactNode } from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, elevation, spacing } from "../../theme";
import { TAP_SLOP } from "../../touch";
import { PressScale } from "./PressScale";

/** The minimum touch target, from the design system's own non-negotiable list. */
export const BACK_BUTTON_SIZE = 44;
/** Gap between the back button and the title. Exported only because the centring maths needs it. */
const HEADER_GAP = 16;

/**
 * The one back button.
 *
 * ⚠️ 44 pt, NOT 42. The auth kit's copy was `width: 42, height: 42` — under the minimum, and
 * saved only by a bespoke `hitSlop` of 14 that made the *touch* target legal while the *visual*
 * one stayed too small. Every hand-rolled copy in the screens was already 44; the shared one
 * was the outlier. It also used a hand-written slop object rather than TAP_SLOP, which is the
 * token that carries the reasoning about when slop is the wrong instrument (see touch.ts).
 *
 * The glyph is "‹" (U+2039), a General Punctuation character resolved through the normal text
 * font, so it honours `color`. That is worth stating because the neighbouring case did not: the
 * shelter tab bar's "✉" (U+2709) resolves through the emoji font, which ignores `color`, and
 * rendered #898A8A when the code asked for #5F5E5A (US-CH1). This one is measured, not assumed —
 * see the verification note on the US-CH2 pull request.
 */
export function BackButton({ onPress, style }: { onPress: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    // `.press` from the canvas — the default scale for a card or icon button. Not
    // activeOpacity: the canvas presses controls IN, it does not fade them out.
    <PressScale
      testID="btn.back"
      onPress={onPress}
      style={[styles.back, style]}
      hitSlop={TAP_SLOP}
      accessibilityRole="button"
      accessibilityLabel="Go back"
    >
      <Text style={styles.backGlyph}>‹</Text>
    </PressScale>
  );
}

type ScreenHeaderProps = {
  title?: string;
  /** Omit to render no back button — a dead-end screen such as passwordChanged. */
  onBack?: () => void;
  /** A trailing control: a "+ Share" button, a "Report" link. Kept as a slot so screens with
   *  one do not have to fall back to hand-rolling the whole header again. */
  right?: ReactNode;
  /** Settings-style centred title. Default is the left-aligned title most screens use. */
  align?: "left" | "center";
  children?: ReactNode;
};

/**
 * The one screen header.
 *
 * ⚠️ IT PADS BY `insets.top`, AND THAT IS THE ENTIRE POINT OF THE STORY. Before this, 45 of the
 * app's 59 hand-rolled headers opened with `paddingTop: 58` and four with `64` — a magic number
 * tuned to one device's notch. NONE of the 59 called useSafeAreaInsets and none used a
 * SafeAreaView. It happens to look right on a Dynamic Island iPhone, where the top inset is
 * ~59 pt; on a device with a 20 pt inset it wastes 38 pt, and on any future device with a
 * deeper one it puts the back button under the hardware.
 *
 * This is not hypothetical for this codebase. The V2 pass shipped a Home whose greeting sat
 * under the Dynamic Island for a full release, because its padding was correct only while the
 * status bar happened to be hidden — and this sprint found the same shape again in three
 * screens' failure branches (issue #38).
 *
 * ⚠️ No fake status bar is drawn, and none is left to draw. The real one renders over the
 * layout; the inset is exactly the room it needs. `__tests__/screenHeader.test.ts` asserts that
 * no screen reintroduces a drawn one.
 */
export function ScreenHeader({ title, onBack, right, align = "left", children }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <View style={styles.row}>
        {onBack ? <BackButton onPress={onBack} /> : null}
        {title ? (
          <Text
            numberOfLines={1}
            accessibilityRole="header"
            style={[
              styles.title,
              align === "center" && styles.titleCentered,
              // Keeps a centred title optically centred. ⚠️ The offset is the button PLUS the
              // gap, not the button alone: with `marginRight: 44` the title measured 8 pt right
              // of centre on device, because the 16 pt gap sits on the left side only.
              align === "center" && !!onBack && { marginRight: BACK_BUTTON_SIZE + HEADER_GAP }
            ]}
          >
            {title}
          </Text>
        ) : null}
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 26,
    paddingBottom: 6
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: HEADER_GAP
  },
  back: {
    width: BACK_BUTTON_SIZE,
    height: BACK_BUTTON_SIZE,
    borderRadius: BACK_BUTTON_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    ...elevation.soft
  },
  backGlyph: {
    color: colors.ink,
    fontSize: 30,
    fontWeight: "800",
    // The glyph's own bearing sits it low in its line box; this re-centres it in the circle.
    marginTop: -4
  },
  title: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "800",
    flexShrink: 1
  },
  titleCentered: {
    flex: 1,
    textAlign: "center"
  },
  right: {
    marginLeft: "auto",
    paddingLeft: spacing.sm
  }
});
