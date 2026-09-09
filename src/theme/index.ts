// The theme. Import from here.
//
//   import { colors, radii, spacing, typography, elevation, gradients } from "../theme";
//
// ⚠️ 73 screens still declare their own `const colors = { ... }`. This module does not change
// them — adding the vocabulary and migrating the screens are deliberately separate stories,
// so that a diff which changes no pixels can be reviewed as such.
export { colors, type ColorToken } from "./colors";
export { radii, pill, squircle } from "./radii";
export { spacing, tabBarClearance } from "./spacing";
export { typography, type TypeToken } from "./typography";
export { elevation } from "./elevation";
export { gradients, heroDirection } from "./gradients";
