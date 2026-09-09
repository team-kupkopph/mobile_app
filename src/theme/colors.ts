// The palette. One definition per colour the product actually means.
//
// CONSOLIDATED FROM MEASUREMENT, NOT INVENTED. `pnpm surface` counted 77 distinct hex
// literals across 1,117 occurrences in src/**/*.tsx. Most of those 77 are not choices — they
// are drift: a screen needed "the teal" and got a slightly different one. Each token below
// names the design-source constant it comes from (screens/user/gen-screens.js), and where a
// token absorbs near-identical values it says which, so the collapse is reviewable rather
// than silent.
//
// ⚠️ THE DESIGN SOURCE WINS EVEN WHEN IT IS OUTVOTED. `soft` is the clearest case: the
// design source defines SOFT = #E7F0EF, but the app uses #E7F0EE 37 times against #E7F0EF's
// 10. Picking the more common value would have quietly made the drift canonical. Frequency
// is evidence of spread, not of intent.
//
// ⚠️ NO SCREEN IS CONVERTED BY THIS FILE. It adds vocabulary and changes nothing on screen;
// migrating the 73 screens that still declare their own `const colors` is Tracks AU/SG/AD.

export const colors = {
  // ---- Brand -------------------------------------------------------------------------
  /** TEAL. The brand colour. Absorbs #08716D (13), #1C7876 (4), #126B69 (3). */
  teal: "#1C6B6B",
  /** TEALDK. Pressed states, dark-on-light labels, gradient end. Absorbs #12524C (3). */
  tealDark: "#14504F",
  /**
   * Hero gradient mid-stop. Without it a teal→forest fade reads as a flat overlay.
   * ⚠️ The one token here that is NOT in screens/user/gen-screens.js: it was added by the V3
   * canvas (labelled `midteal` on its component sheet) because V2 had no three-stop gradient
   * to need it. Traceable, but to the newer of the two design sources.
   */
  tealMid: "#164F4C",
  /** Light end of the button gradient. */
  tealBright: "#238383",
  /** ACCENT. Used in the generated backdrops; no screen uses it directly yet. */
  tealAccent: "#2E8B8B",
  /** FOREST. Deepest brand tone, far end of the hero gradient. */
  forest: "#11241F",

  // ---- Ink and text ------------------------------------------------------------------
  /** V2INK. Primary text and headings. */
  ink: "#12213A",
  /** MUTED. Secondary text. 6.49:1 on white — the workhorse for anything that must be read. */
  muted: "#5F5E5A",
  /**
   * ⚠️ 2.89:1 on white. NOT USABLE FOR TEXT — it fails WCAG 1.4.3's 4.5:1 by a wide margin,
   * and it is currently used for real content on 35 sites, not decoration. It is a token so
   * that the 35 uses are findable and so US-FD4 can fail on new ones; it is not an
   * endorsement. Use `muted` for text. Retire this once the last use is gone.
   */
  faintDeprecated: "#9A988F",

  // ---- Surfaces ----------------------------------------------------------------------
  /** WHITE. Cards, filled inputs. */
  white: "#FFFFFF",
  /** BG / V2BG. The page ground. */
  page: "#F4F5F2",
  /** CREAM. Bottom action-card fill on hero screens. */
  cream: "#F5F6F3",
  /** LINE. Dividers and V1 hairlines. Absorbs #E0DFD9 (2), #D8D6CD (1). */
  border: "#E3E1D9",
  /** SOFT. Tinted icon tiles and chips. ⚠️ Absorbs #E7F0EE (37) — see the note at the top. */
  soft: "#E7F0EF",
  /** GREYPILL. Neutral/disabled pill. Absorbs #EDEDE8 (1), #EDECE7 (1). */
  greyPill: "#ECEAE3",
  /** The sunken track a segmented control's thumb slides in. From v2seg() in the design source. */
  segmentTrack: "#EAEDE8",

  // ---- Status: success ---------------------------------------------------------------
  /** OK. Absorbs #2E5B1E (6), #356A24 (3), #3F6B26 (1), #3F5A2E (1). */
  success: "#27500A",
  /** OKBG. Absorbs #DCEED0 (3), #E1F2D3 (3), #E3EFD8 (1). */
  successBg: "#EAF3DE",

  // ---- Status: warning ---------------------------------------------------------------
  /** WARN. Absorbs #7A5310 (5), #8A6D3B (2). */
  warning: "#8A5A12",
  /** WARN2. The darker warning ink, for text on `warningBg`. */
  warningStrong: "#633806",
  /** WARNBG. Absorbs #FBE9CF, #F3E1BE, #F3DFB0, #EFE3C9, #E7D3AE (1 each). */
  warningBg: "#FAEEDA",

  // ---- Status: danger ----------------------------------------------------------------
  /** DANGER. Absorbs #B3261E (1), #8A3A33 (1). */
  danger: "#B23B3B",
  /** DANGERBG. Absorbs #FBEAEA (6), #FBECEC (5), #FBE4E1 (1). */
  dangerBg: "#FBEEEC",
  /** DANGERLN. The outline on an errored field. */
  dangerLine: "#E7C7C2",

  // ---- Status: info ------------------------------------------------------------------
  /** Tint behind "Needs info" / "New". Its foreground is `tealDark` (7.7:1). */
  infoBg: "#E2EEF0",

  // ---- Chrome ------------------------------------------------------------------------
  /**
   * NAVY. The colour every shadow is cast in — 95 occurrences, all `shadowColor`.
   * ⚠️ Not a text colour, despite looking like one. See elevation.ts.
   */
  shadowCast: "#1F3A5F",

  /**
   * Translucent chrome. React Native has no backdrop-filter and expo-blur is not a
   * dependency, so floating chrome is a translucent panel over the mesh backdrop rather than
   * a true frosted blur. See components/GlassSurface.tsx.
   */
  glass: "rgba(255,255,255,0.72)",
  glassBorder: "rgba(255,255,255,0.85)",
  glassOnDark: "rgba(255,255,255,0.16)",
  glassOnDarkBorder: "rgba(255,255,255,0.28)",

  /**
   * ⚠️ Inactive tab-bar icons. NOT the pale grey it looks like it should be: at #C9CEC7 this
   * was 1.60:1 on white, against WCAG 1.4.11's 3:1 for non-text content that conveys meaning
   * — and a tab icon is the only thing telling one tab from another at a glance. That value
   * was fixed once, then reintroduced by a palette consolidation exactly like this one, and
   * the guard that should have caught it had stopped testing anything. tabBarContrast.test.ts
   * now asserts on this token directly.
   */
  tabInactive: "#5F5E5A"
} as const;

export type ColorToken = keyof typeof colors;
