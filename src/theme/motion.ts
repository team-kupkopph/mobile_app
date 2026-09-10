import { Easing } from "react-native";

/**
 * Motion, from the approved V3 canvas — design/mobile-v3/Components.dc.html, the "Motion"
 * panel. Every value here is that panel's, not a guess:
 *
 *   --dur       .34s   press: card, button, chip
 *   --dur-slow  .42s   sliding thumb, tab pill
 *   --ease      cubic-bezier(.2, .8, .2, 1)   "easing, everywhere"
 *   .press:active   transform: scale(.978)
 *   .cta:active     transform: translateY(1px) scale(.99)
 *   .chip:active    transform: scale(.94)
 *
 * ⚠️ THE APP HAD NO MOTION AT ALL BEFORE THIS. Not "some motion that drifted" — no duration,
 * no easing, no theme file, and no `Animated` anywhere in src/. Every touchable used
 * `activeOpacity`, which is a fade, not the transform the canvas specifies. The brief this
 * sprint answers asked for "sleek micro-interactions"; that half was never built, and the
 * design audit against the canvas is what surfaced it.
 *
 * ⚠️ NOTHING HERE MOVES WHEN THE SYSTEM ASKS IT NOT TO. The canvas honours
 * `prefers-reduced-motion`; iOS exposes the same preference as Reduce Motion, and
 * `useReducedMotion()` is how every consumer here reads it. That is an accessibility floor,
 * not a nicety — vestibular disorders are the reason the media query exists.
 */
export const motion = {
  /** `--dur` — press feedback on a card, button or chip. */
  duration: 340,
  /** `--dur-slow` — the sliding thumb and the tab pill, which travel further. */
  durationSlow: 420,
  /** `--ease` — the canvas's one easing curve, used for everything. */
  easing: Easing.bezier(0.2, 0.8, 0.2, 1),

  /** `.press:active` — the default press, for cards and icon buttons. */
  pressScale: 0.978,
  /** `.cta:active` — a full-width call to action dips rather than shrinking much. */
  ctaScale: 0.99,
  ctaTranslateY: 1,
  /** `.chip:active` — a chip is small, so it needs a bigger proportion to read. */
  chipScale: 0.94
} as const;
