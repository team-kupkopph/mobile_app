// Corner radii. Five container values, plus one rule for squircles.
//
// `pnpm surface` counted 36 distinct borderRadius values in src/**/*.tsx — every integer from
// 1 to 30, then 32, 38, 42, 44, 48 and 54. That is not a scale, it is 36 independent guesses.
export const radii = {
  /** Chips, small status pills, tiny badges. */
  chip: 12,
  /** Icon tiles and avatars at the common 46–56 pt sizes. See `squircle()` for the rule. */
  tile: 18,
  /** Filled form fields. */
  field: 20,
  /** Content cards. */
  card: 24,
  /** Hero surfaces — the tallest, most prominent card on a screen. */
  hero: 26
} as const;

/**
 * ⚠️ A RADIUS THAT MAKES SOMETHING A CIRCLE OR A PILL IS NOT ON THIS SCALE, and must not be
 * snapped to it. It is exactly half the element's height and the two move together: Home's
 * report button is `height: 44` with `borderRadius: 22`, and snapping that 22 to `field: 20`
 * would visibly un-round the pill. Write the literal, next to the height.
 */
export const pill = (size: number) => size / 2;

/**
 * Squircle tiles scale their radius with their size — `0.32 × size`, which is the rule
 * `v2squircle()` already uses in the design source (screens/user/gen-screens.js). A 40 pt tile
 * and a 74 pt tile are not the same shape at the same radius, which is why `radii.tile` alone
 * is not enough.
 */
export const squircle = (size: number) => Math.round(size * 0.32);
