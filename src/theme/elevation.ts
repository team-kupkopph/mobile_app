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
  }
} as const satisfies Record<string, Elevation>;
