// Spacing scale — a 4 pt grid, with the two half-steps the design actually uses.
//
// ⚠️ THE APP IS NOT ON A GRID TODAY. The most common padding/margin/gap values measured in
// src/**/*.tsx are 16, 12, 26, 14, 18, 6, 8, 10, 20, 22, 4, 58 and 28 — so 26, 14, 18, 6, 10,
// 22 and 58 are all off any 4 pt grid, and 26 (155 uses) is the single most common gutter.
//
// The V3 screen gutter is `lg` (20). Migrating the 26s is Tracks AU/SG/AD, not this story.
export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  /** The V3 screen gutter. */
  lg: 20,
  xl: 24,
  xxl: 32,
  huge: 40
} as const;

/**
 * Clearance under a scrolling screen so content is not trapped behind the floating tab bar.
 * ⚠️ Deliberately NOT on the scale: it is the sum of the bar's height, its inset and a
 * breathing gap, so it tracks OwnerTabs' geometry rather than the spacing rhythm. If the bar
 * changes height, this changes with it.
 */
export const tabBarClearance = 128;
