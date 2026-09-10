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
  activeTab: ["#EAF3F2", "#DCEAE8"] as const,

  /**
   * Avatar tiles — the four the canvas gives organisations, each with the ink that sits on it.
   * design/mobile-v3/Adopt.dc.html carries them per shelter as `tile` + `ink` pairs.
   *
   * ⚠️ FOUR, AND CHOSEN DETERMINISTICALLY. A tile is identity, not decoration: the same shelter
   * must get the same tile on every screen it appears on, or the colour stops meaning anything
   * and becomes noise. Avatar picks by hashing the name, never at random and never by list
   * index — an index would re-colour every org whenever a list is sorted differently.
   */
  avatarTiles: [
    { tile: ["#EDF5F4", "#CFE3E1"] as const, ink: colors.teal },
    { tile: ["#FBF1E1", "#EFDCBC"] as const, ink: colors.warning },
    { tile: ["#EEF2EA", "#DCE5D4"] as const, ink: colors.success },
    { tile: ["#EAF0F4", "#D3E0E8"] as const, ink: colors.tealDark }
  ] as const
} as const;

/** Diagonal start/end for `hero`, approximating the canvas's 146deg. */
export const heroDirection = { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } } as const;
