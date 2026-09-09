// DEPRECATED SHIM — kept so the five screens converted in f020b72 keep compiling unchanged.
//
// ⚠️ Do not import from here in new code; import from "../theme" instead. This file exists
// only because US-FD2 adds the theme WITHOUT converting any screen: a story that changes no
// pixels should not also churn five screens' imports. Tracks AU/SG/AD move those imports over
// and delete this file.
export { elevation } from "./elevation";
export { gradients, heroDirection } from "./gradients";

import { colors } from "./colors";

/** @deprecated Use `colors` from "../theme". */
export const v3Colors = {
  forest: colors.forest,
  tealMid: colors.tealMid,
  tealBright: colors.tealBright,
  glass: colors.glass,
  glassBorder: colors.glassBorder,
  glassOnDark: colors.glassOnDark,
  glassOnDarkBorder: colors.glassOnDarkBorder
} as const;
