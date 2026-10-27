import { colors } from "./colors";
import { radii } from "./radii";

/**
 * Danger text on its own surface. `colors.danger` is deliberately below 4.5:1 on the mesh backdrop
 * (backdropContrast.test.ts) — danger text must sit on a surface — and this is that surface for a line that would
 * otherwise render straight onto the backdrop: the `dangerBg` tint, 5.18:1. Spread it into a `Text` style that also
 * sets `color: colors.danger`; `overflow: "hidden"` is what lets iOS round a Text's own background. (R3-F2)
 */
export const dangerOnSurface = {
  backgroundColor: colors.dangerBg,
  borderRadius: radii.chip,
  paddingHorizontal: 10,
  paddingVertical: 6,
  overflow: "hidden" as const,
};
