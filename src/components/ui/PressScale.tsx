import { ReactNode, useRef } from "react";
import { Animated, Pressable, PressableProps, StyleProp, ViewStyle } from "react-native";

import { motion } from "../../theme/motion";
import { useReducedMotion } from "../../useReducedMotion";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type PressScaleProps = Omit<PressableProps, "style" | "children"> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** How far to shrink. Defaults to the canvas's `.press` value; pass motion.chipScale etc. */
  scale?: number;
  /** `.cta:active` also dips 1px. Off by default — only the full-width CTA does this. */
  dip?: boolean;
};

/**
 * ⚠️ ONE ELEMENT, NOT A PRESSABLE WRAPPING AN ANIMATED VIEW — and the difference is a layout
 * bug, not a preference. The first version put `style` on an inner Animated.View inside a bare
 * Pressable, so a caller passing `flex: 1` (every tab item does) applied it to a CHILD of a
 * content-sized parent: the tab bar collapsed, all four tabs crammed to the left, and the
 * sliding pill was left stranded. Animating the Pressable itself keeps the single-element
 * shape TouchableOpacity had, so callers' layout styles land where they always did.
 */

/**
 * The press micro-interaction from the V3 canvas, as one component.
 *
 * ⚠️ `Pressable`, NOT `TouchableOpacity`. Touchable's `activeOpacity` fades the control out,
 * which is a different gesture language from the one the design specifies: the canvas presses
 * things IN (`transform: scale(.978)`), it does not make them disappear. Fading also fights
 * the glass — a translucent panel losing opacity over a mesh backdrop reads as a rendering
 * fault rather than as feedback.
 *
 * ⚠️ `useNativeDriver: true`, so the animation runs on the UI thread and a busy JS thread
 * cannot make a press feel late. That is only possible because this animates `transform` and
 * nothing else; adding a colour or shadow to this animation would silently drop it back onto
 * the JS thread for every consumer.
 *
 * When Reduce Motion is on, the press does not animate at all — the value simply stays at
 * rest. The control still works; it just does not move.
 */
export function PressScale({ children, style, scale = motion.pressScale, dip, ...rest }: PressScaleProps) {
  const reduced = useReducedMotion();
  const value = useRef(new Animated.Value(0)).current;

  const to = (toValue: number) => {
    if (reduced) return;
    Animated.timing(value, {
      toValue,
      duration: motion.duration,
      easing: motion.easing,
      useNativeDriver: true
    }).start();
  };

  // Driven from one 0→1 value so the scale and the dip cannot fall out of step.
  const transform: ViewStyle["transform"] = [
    { scale: value.interpolate({ inputRange: [0, 1], outputRange: [1, scale] }) },
    ...(dip
      ? [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [0, motion.ctaTranslateY] }) }]
      : [])
  ] as unknown as ViewStyle["transform"];

  return (
    <AnimatedPressable style={[style, { transform }]} onPressIn={() => to(1)} onPressOut={() => to(0)} {...rest}>
      {children}
    </AnimatedPressable>
  );
}
