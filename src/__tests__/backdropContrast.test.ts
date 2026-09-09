/**
 * US-PF1 · text must stay legible over the MESH BACKDROP, not merely over white.
 *
 * ⚠️ WHY FLAT #F4F5F2 IS THE WRONG THING TO TEST. Screens on the V3 backdrop no longer sit on
 * the page colour — ScreenBackdrop paints a gradient with warm and teal regions, and a token
 * that clears 4.5:1 on white can fail over the teal band. The first version of that asset did
 * exactly this: blooms through the middle of the screen took muted text to 2.84:1 and teal
 * links to 2.73:1. It was retuned so the strong colour sits below y≈0.90, behind the floating
 * tab bar, and never under body copy.
 *
 * ⚠️ THE LIMIT OF THIS FILE, STATED PLAINLY. It cannot decode the JPEG, so it asserts against
 * WORST_CASE_BACKDROP — the darkest colour the content band reaches, measured from
 * design/mobile-v3/gen-backdrop.mjs's own blob parameters at the point that produced it. If
 * the backdrop is ever regenerated darker, this constant is stale and this test will keep
 * passing while the app gets worse. Anyone changing that asset must re-derive it; the
 * generator is seeded and reproducible, so re-deriving is a re-run, not a guess.
 */
import { colors } from "../theme/colors";

/** Darkest point of the backdrop's CONTENT band (above the tab-bar fade). See the note above. */
const WORST_CASE_BACKDROP = "#D1E1DE";
/** For comparison — the two surfaces text more often sits on. */
const CARD = colors.white;
const PAGE = colors.page;

function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const ch = [0, 2, 4]
    .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const BODY_TEXT = 4.5;

/** Tokens that carry real words, and therefore owe 4.5:1 wherever they land. */
const TEXT_TOKENS: Array<[string, string]> = [
  ["ink", colors.ink],
  ["muted", colors.muted],
  ["teal", colors.teal],
  ["tealDark", colors.tealDark],
  ["success", colors.success],
  ["warningStrong", colors.warningStrong]
];

/**
 * ⚠️ `danger` IS DELIBERATELY NOT IN THE LIST ABOVE, and this is the reason rather than an
 * omission. #B23B3B is 4.34:1 against WORST_CASE_BACKDROP — below the floor — while being
 * 5.86:1 on a card, 5.36:1 on the page colour and 5.18:1 on dangerBg. So the rule is not
 * "danger is fine"; it is that DANGER TEXT MUST SIT ON A SURFACE.
 *
 * There was exactly one place in the app where it did not: SigninScreen's form error, which
 * rendered straight onto the mesh. It now sits on a dangerBg tint. The assertion below is what
 * keeps that true — if danger ever clears the backdrop bar on its own, someone has lightened
 * the token instead of surfacing the text.
 */
describe("text over the mesh backdrop", () => {
  it("danger still needs a surface — it does not clear the backdrop alone", () => {
    expect(contrast(colors.danger, WORST_CASE_BACKDROP)).toBeLessThan(BODY_TEXT);
  });

  it.each([["card", CARD], ["dangerBg", colors.dangerBg], ["page", PAGE]])(
    "danger clears 4.5:1 on %s, which is where it is allowed to render",
    (_n, bg) => {
      expect(contrast(colors.danger, bg)).toBeGreaterThanOrEqual(BODY_TEXT);
    }
  );

  it.each(TEXT_TOKENS)("%s clears 4.5:1 on the backdrop's worst point", (_n, hex) => {
    expect(contrast(hex, WORST_CASE_BACKDROP)).toBeGreaterThanOrEqual(BODY_TEXT);
  });

  it.each(TEXT_TOKENS)("%s clears 4.5:1 on a card", (_n, hex) => {
    expect(contrast(hex, CARD)).toBeGreaterThanOrEqual(BODY_TEXT);
  });

  it.each(TEXT_TOKENS)("%s clears 4.5:1 on the flat page colour", (_n, hex) => {
    expect(contrast(hex, PAGE)).toBeGreaterThanOrEqual(BODY_TEXT);
  });

  /**
   * ⚠️ The token this sprint spent the most effort removing. 2.89:1 on white — it exists so the
   * remaining uses are findable, and it must never be treated as a text colour. If this ever
   * starts passing, someone has lightened it into looking acceptable rather than replacing it.
   */
  it("faintDeprecated still fails, and is therefore still not a text colour", () => {
    expect(contrast(colors.faintDeprecated, CARD)).toBeLessThan(BODY_TEXT);
  });
});
