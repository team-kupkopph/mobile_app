// Gradient stops, ready for expo-linear-gradient's `colors` prop.
// Two real gradients — the same two the design source defines as v2btn and v2hero — plus the
// tab pill and the destructive button.
import { colors } from "./colors";

export const gradients = {
  /** Primary buttons. Vertical. */
  button: [colors.tealBright, colors.tealDark] as const,
  /** Hero surfaces. Diagonal. Three stops — see colors.tealMid for why. */
  hero: [colors.teal, colors.tealMid, colors.forest] as const,
  /** Destructive buttons. */
  danger: ["#C94A44", "#9E322D"] as const,
  /** The tinted pill behind an active tab. */
  activeTab: ["#EAF3F2", "#DCEAE8"] as const
} as const;

/** Diagonal start/end for `hero`, approximating the canvas's 146deg. */
export const heroDirection = { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } } as const;
