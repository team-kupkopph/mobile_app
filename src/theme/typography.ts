// The type ramp. Eight steps.
//
// ⚠️ SEVEN OF THE EIGHT lineHeights WERE THIS FILE'S OWN, NOT THE DESIGN'S — and they are gone.
// The approved canvas (design/mobile-v3/Components.dc.html, "Type ramp") labels its steps
// "27 / 800 / -0.6", "25 / 800 / -0.5" and so on: size, weight, letter-spacing. Exactly ONE
// step names a line height — body, "15 / 400 / 21" — and that one stays.
//
// The other seven were invented here. Keeping them would have made "adopt the ramp" mean
// "adopt this file's line spacing", which the design never asked for: 719 of the app's 839
// text styles set no lineHeight at all, so spreading a token would have opened up line
// spacing across every screen on a value nobody designed. The design source wins over the
// token — the same rule colors.ts applied to #E7F0EF when the app outvoted it 37 to 10.
//
// ⚠️ THIS IS A DESIGNED RAMP, NOT A MEASURED ONE, and that is the point. `pnpm surface`-style
// counting finds 29 distinct fontSize values in src/**/*.tsx (9 through 54, including 12.5,
// 13.5, 14.5, 15.5 and 16.5). Cataloguing those as tokens would preserve the drift under
// nicer names — which is exactly what the retired shared-style-system branch did, naming one
// style per size/weight combination it happened to find.
//
// So these eight are a target. Screens move onto them in Tracks AU / SG / AD; this file
// converts nothing on its own.
//
// Migration mapping from what is there today:
//   30, 28, 27      -> display (27)
//   26, 25, 24      -> hero (25)
//   23, 22, 21      -> title (21)
//   20, 19, 18      -> section (19)
//   17, 16.5, 16    -> subtitle (17)
//   15.5, 15, 14.5  -> body (15)
//   14, 13.5, 13, 12.5, 12 -> meta (13)
//   11, 10, 9       -> label (11)
import { TextStyle } from "react-native";

type Style = Pick<TextStyle, "fontSize" | "fontWeight" | "letterSpacing" | "lineHeight">;

export const typography = {
  /** Screen titles. */
  display: { fontSize: 27, fontWeight: "800", letterSpacing: -0.6 },
  /** The one prominent line on a hero surface. */
  hero: { fontSize: 25, fontWeight: "800", letterSpacing: -0.5 },
  /** A subject's name — a pet, a shelter, a person. */
  title: { fontSize: 21, fontWeight: "800", letterSpacing: -0.4 },
  /** Section headings within a screen. */
  section: { fontSize: 19, fontWeight: "800", letterSpacing: -0.3 },
  /** Card titles, button labels, field values. */
  subtitle: { fontSize: 17, fontWeight: "700", letterSpacing: -0.2 },
  /** Body copy. */
  body: { fontSize: 15, fontWeight: "400", lineHeight: 21 },
  /** Metadata, helper text, chip labels. */
  meta: { fontSize: 13, fontWeight: "400" },
  /** Field labels and tab labels. Uppercase where used as a field label. */
  label: { fontSize: 11, fontWeight: "800", letterSpacing: 0.8 }
} as const satisfies Record<string, Style>;

export type TypeToken = keyof typeof typography;
