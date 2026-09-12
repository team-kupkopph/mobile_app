// Spacing scale — the six steps the canvas's "Radius & spacing" panel declares: 4, 8, 12, 16,
// 20, 28. `spacingParity.test.ts` reads that list and holds this one equal to it.
//
// ⚠️ NEITHER THE APP NOR THE ARTBOARDS ARE ON THIS GRID BEYOND THE GUTTER, and this file does
// not pretend otherwise. The artboards' own margins and gaps are 14, 12, 6, 9, 13, 18, 26, 30 —
// a scale nobody drew to — and the app's are 16, 12, 26, 14, 18, 6, 8, 10. The one step both
// sides agree on and use everywhere is the screen gutter, `lg` (20): 93 sites here, every
// artboard's `padding: 0 20px`. The other steps exist so a NEW gap can be chosen from the
// panel rather than invented; migrating the old ones would be a snap to a grid the design
// itself does not follow, and is not a track. (This file once carried 24, 32 and 40 as well;
// the panel never declared them and one component used one of them once.)
export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  /** The V3 screen gutter. */
  lg: 20,
  xl: 28
} as const;

/**
 * Clearance under a scrolling screen so content is not trapped behind the floating tab bar.
 * ⚠️ Deliberately NOT on the scale: it is the sum of the bar's height, its inset and a
 * breathing gap, so it tracks OwnerTabs' geometry rather than the spacing rhythm. If the bar
 * changes height, this changes with it.
 */
export const tabBarClearance = 128;
