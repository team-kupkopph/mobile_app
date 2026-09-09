// The type ramp. Eight steps.
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
  display: { fontSize: 27, fontWeight: "800", letterSpacing: -0.6, lineHeight: 32 },
  /** The one prominent line on a hero surface. */
  hero: { fontSize: 25, fontWeight: "800", letterSpacing: -0.5, lineHeight: 30 },
  /** A subject's name — a pet, a shelter, a person. */
  title: { fontSize: 21, fontWeight: "800", letterSpacing: -0.4, lineHeight: 26 },
  /** Section headings within a screen. */
  section: { fontSize: 19, fontWeight: "800", letterSpacing: -0.3, lineHeight: 24 },
  /** Card titles, button labels, field values. */
  subtitle: { fontSize: 17, fontWeight: "700", letterSpacing: -0.2, lineHeight: 22 },
  /** Body copy. */
  body: { fontSize: 15, fontWeight: "400", lineHeight: 21 },
  /** Metadata, helper text, chip labels. */
  meta: { fontSize: 13, fontWeight: "400", lineHeight: 18 },
  /** Field labels and tab labels. Uppercase where used as a field label. */
  label: { fontSize: 11, fontWeight: "800", letterSpacing: 0.8, lineHeight: 14 }
} as const satisfies Record<string, Style>;

export type TypeToken = keyof typeof typography;
