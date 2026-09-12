import { ActivityIndicator, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { PressScale } from "./PressScale";
import { LinearGradient } from "expo-linear-gradient";

import { colors, elevation, gradients, motion, pill, typography } from "../../theme";

export type ButtonVariant = "primary" | "secondary" | "glass" | "destructive";

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  /**
   * In-flight only. Shows a spinner and blocks a second press.
   *
   * ⚠️ THERE IS DELIBERATELY NO `disabled` PROP, and adding one would undo a product rule this
   * app has already fixed once (mobile `f93f74a`, "submit buttons stop being disabled by
   * validation — 8 screens"). A disabled submit gives the user nothing to press and no reason
   * why; the rule is that the button stays tappable and the error explains itself, under the
   * field that caused it.
   *
   * `loading` is not that. "A request is in flight" is a real, temporary state the user caused;
   * "your input is invalid" is a message, and a message belongs next to the input.
   */
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  /** "Waiting for your location" — what a screen says instead of disabling the button. */
  accessibilityHint?: string;
  /**
   * ⚠️ Not optional in practice. e2eSelectors.test.ts asserts these exist and the Maestro
   * flows tap them; a primitive that cannot carry one silently breaks the suite the moment a
   * screen adopts it.
   */
  testID?: string;
};

const HEIGHT = 54;

export function Button({ label, onPress, variant = "primary", loading, style, accessibilityLabel, accessibilityHint, testID }: ButtonProps) {
  const labelStyle =
    variant === "destructive" ? styles.destructiveLabel
    : variant === "primary" ? styles.primaryLabel
    : styles.plainLabel;

  const body = loading
    ? <ActivityIndicator color={variant === "primary" ? colors.white : colors.tealDark} />
    : <Text style={labelStyle} numberOfLines={1}>{label}</Text>;

  return (
    // `.cta:active` from the canvas: a full-width button dips 1px and shrinks only slightly,
    // rather than taking the deeper `.press` scale a small control needs.
    <PressScale
      scale={motion.ctaScale}
      dip
      onPress={loading ? () => {} : onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ busy: !!loading }}
      testID={testID}
      style={[styles.wrap, style]}
    >
      {variant === "primary" ? (
        <LinearGradient colors={gradients.button} style={styles.fill}>
          {/* A 1px top highlight — what stops a gradient button reading as a flat slab. */}
          <View style={styles.topHighlight} />
          {body}
        </LinearGradient>
      ) : (
        <View style={[styles.fill, variantSurface[variant]]}>{body}</View>
      )}
    </PressScale>
  );
}

const styles = StyleSheet.create({
  wrap: {
    // pill(), not radii — this is half the height and the two move together.
    borderRadius: pill(HEIGHT),
    overflow: "hidden"
  },
  fill: {
    height: HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: pill(HEIGHT)
  },
  topHighlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.34)"
  },
  primaryLabel: { ...typography.subtitle, fontWeight: "800", color: colors.white },
  plainLabel: { ...typography.subtitle, fontWeight: "800", color: colors.ink },
  destructiveLabel: { ...typography.subtitle, fontWeight: "800", color: colors.danger },
  secondary: { backgroundColor: colors.white, ...elevation.soft },
  glass: {
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...elevation.soft
  },
  destructive: { backgroundColor: colors.dangerBg, ...elevation.soft }
});

const variantSurface = {
  secondary: styles.secondary,
  glass: styles.glass,
  destructive: styles.destructive
} as const;
