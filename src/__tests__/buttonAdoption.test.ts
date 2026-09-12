/**
 * Full-width calls to action are `<Button>`, not a TouchableOpacity that happens to be a pill.
 *
 * ⚠️ WHAT THIS FOUND. Before this, two files rendered `<Button>` and 48 screens drew their
 * own primary CTA: a TouchableOpacity 54–60 pt tall, flat `colors.teal`, radius half its
 * height, an 18–22 / 700 white label, an `ActivityIndicator` ternary, and — on 24 of them —
 * `disabled={busy}` or an idle tint. The canvas's `.cta` is a 54 pt GRADIENT pill with the
 * panel's 17 / 800 label, and `Button` already drew it; almost nothing consumed it. 47 of the
 * 48 are converted, plus the NGO verification submit the census missed (it fills with
 * `authColors.teal`). The remainder is enumerated BY NAME so the list can only shorten.
 *
 * ⚠️ ZERO, AND A FLAT RULE FROM HERE — AND THE SEVEN THAT WERE HELD BACK WERE EACH DECIDED,
 * NOT GIVEN A `disabled` PROP. `Button` still has none, on purpose (see its header). What the
 * seven actually needed, read one at a time:
 *   · AdjustPin's "Save this spot" was disabled until the map settled. Saving before it does
 *     keeps the pin where it started — a valid answer — so the gate was cosmetic. Removed.
 *   · ListingDetail's "Inquire to adopt" became a greyed "Inquiry sent" after sending. It is
 *     now a note with that copy (e2e 20 asserts it) and a live "See my inquiries".
 *   · PlaceRequest's Accept and Decline were greyed once the placement was decided, under a
 *     note saying which way. A decided placement has no decision: they are not rendered.
 *   · KawangGawaCheckin's "Check out" was greyed once checked out, under "Shift complete".
 *     Same answer: not rendered once there is nothing to do.
 *   · Attendance's and Requests' row actions were 46 pt hand-rolled pills because the
 *     primitive was 54 and full-width. The panel declares a small button ("Label, small
 *     button", drawn at 38 / 19), so `Button` has `size="small"` and the rows use it.
 * The scan below is proved to still recognise a hand-rolled CTA by feeding it the shape.
 */
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const SCREENS = join(__dirname, "..", "screens");
const files = readdirSync(SCREENS).filter((f) => f.endsWith(".tsx"));
const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

/**
 * A CTA-shaped style: at least 46 pt tall, centred, filled with a brand or danger colour (or
 * the `card` surface a secondary uses), and rendered by a TouchableOpacity. Icon tiles, hero
 * glyphs and the ShelterVolunteer back circles are filled and centred too; they are excluded
 * by name and by the element that renders them.
 */
type Site = { file: string; style: string; height: number };
function scan(file: string, src: string): Site[] {
  const out: Site[] = [];
  const re = /\n  (\w+): \{((?:[^{}]|\{[^{}]*\})*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const [, style, body] = m;
    if (!/justifyContent/.test(body)) continue;
    const h = /\bheight: (\d+)/.exec(body);
    if (!h || Number(h[1]) < 46) continue;
    if (!/backgroundColor: (colors\.(teal|tealDark|danger|dangerBg|white)|authColors\.teal)\b|\.\.\.card\b/.test(body)) continue;
    if (/icon|avatar|tile|dot|badge|chip|circle|pill|row|back$/i.test(style)) continue;
    if (!new RegExp("<TouchableOpacity\\b[^>]*styles\\." + style + "\\b").test(src)) continue;
    out.push({ file, style, height: Number(h[1]) });
  }
  return out;
}
const sites: Site[] = files.flatMap((file) => scan(file, strip(readFileSync(join(SCREENS, file), "utf8"))));

const HAND_ROLLED = sites.map((s) => `${s.file.replace(/\.tsx$/, "")}:${s.style}`).sort();

describe("full-width CTAs are the Button primitive", () => {
  it("found buttons at all", () => {
    // Guard the guard: the scan must see both the converted and the unconverted, or a regex
    // drift would report "all converted" forever.
    const consumers = files.filter((f) => /<Button[\s/>]/.test(strip(readFileSync(join(SCREENS, f), "utf8"))));
    expect(consumers.length).toBeGreaterThan(30);
  });

  it("sees a hand-rolled CTA when one exists", () => {
    const shape = 'const styles = StyleSheet.create({\n  submit: { height: 56, justifyContent: "center", backgroundColor: colors.teal }\n});\n<TouchableOpacity style={styles.submit} />';
    expect(scan("Probe.tsx", shape)).toEqual([{ file: "Probe.tsx", style: "submit", height: 56 }]);
  });

  it("has no hand-rolled CTA left, and stays that way", () => {
    expect(HAND_ROLLED).toEqual([]);
  });
});
