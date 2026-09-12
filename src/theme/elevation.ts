// Depth. Three steps.
//
// The design canvas layers TWO shadows per surface — a 1 pt contact shadow under a wide
// ambient one — which is what stops a card reading as a flat rectangle. React Native gives a
// View exactly ONE shadow on iOS and a single `elevation` on Android, so the pair cannot be
// reproduced without wrapping every card in a second View. That trade is not worth it: the
// ambient layer carries nearly all of the effect, so each step below is the ambient half and
// the contact half is dropped rather than faked.
import { ViewStyle } from "react-native";

import { colors } from "./colors";

type Elevation = Pick<
  ViewStyle,
  "shadowColor" | "shadowOffset" | "shadowOpacity" | "shadowRadius" | "elevation"
>;

export const elevation = {
  /** Inputs, chips, pills, small raised controls. */
  soft: {
    shadowColor: colors.shadowCast,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 7,
    elevation: 2
  },
  /** Content cards. */
  card: {
    shadowColor: colors.shadowCast,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6
  },
  /** Floating chrome — the tab bar, sheets, anything content scrolls under. */
  float: {
    shadowColor: colors.shadowCast,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
    elevation: 10
  },
  /**
   * The Adopt deck's top card — the one shadow the canvas declares outside its Elevation
   * panel: `--sh-deck: 0 2px 6px rgba(31,58,95,.07), 0 22px 44px -14px rgba(31,58,95,.30)`,
   * in Adopt.dc.html only. Same conversion as the three above: the ambient half, offset
   * carried across exactly, blur and opacity scaled for CSS's negative spread. Deeper than
   * `float` because the card is the thing being handled, not chrome the content slides under.
   */
  deck: {
    shadowColor: colors.shadowCast,
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.19,
    shadowRadius: 28,
    elevation: 14
  },
  /**
   * The brand tile — the logo's squircle on Sign in and Welcome. SignIn.dc.html draws it with
   * its own pair, cast in forest rather than the navy the surfaces use:
   * `0 3px 8px rgba(17,36,31,.16), 0 18px 34px -10px rgba(17,36,31,.46)`. Same conversion as
   * `deck`: the ambient half, offset carried across, blur and opacity scaled for the negative
   * spread. Welcome's tile had hand-rolled `#0B1F2A / (0,10) / .18 / 16` — the right instinct
   * (darker, deeper than a card) with the wrong numbers.
   */
  brand: {
    shadowColor: colors.forest,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.29,
    shadowRadius: 22,
    elevation: 12
  },
  /**
   * The primary call to action. `.cta` on SignIn, Inquiry and the Components panel casts in
   * the button's own teal: `0 2px 5px rgba(20,80,79,.24), 0 12px 26px -8px rgba(20,80,79,.5)`.
   * Same conversion as the rest: the ambient half, offset carried across, blur and opacity
   * scaled for the negative spread. `Button` drew no shadow at all before this, which is why
   * the gradient pill read flatter on device than on the artboards.
   */
  cta: {
    shadowColor: colors.tealDark,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8
  }
} as const satisfies Record<string, Elevation>;
