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
 * ⚠️ WHY THE REMAINDER IS NOT "THE REST". `Button` has no `disabled` prop on purpose (see its
 * header: a submit disabled by validation is a product rule this app already fixed once). Five
 * of the seven sites below carry a `disabled` that is NOT a validation gate — a map that has
 * not settled, an inquiry already sent, a placement already decided, a geofence. Whether those
 * become a `Button` state or stay hand-rolled is a decision for the primitive, not a codemod.
 * Two are 46 pt row actions in a list, not CTAs.
 *
 * (Resolved.) ShelterVerify was an eighth: `disabled={!baseComplete}` — ID, billing, photos,
 * social, consent — with a handler that returned silently when un-ready. That is a validation
 * gate, the pattern `f93f74a` removed from eight screens and missed on this one. It now says
 * which document is missing and is a `Button`; the list below shrank by one, which is how this
 * file is meant to change.
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
const sites: Site[] = [];
for (const file of files) {
  const src = strip(readFileSync(join(SCREENS, file), "utf8"));
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
    sites.push({ file, style, height: Number(h[1]) });
  }
}

const HAND_ROLLED = sites.map((s) => `${s.file.replace(/\.tsx$/, "")}:${s.style}`).sort();

describe("full-width CTAs are the Button primitive", () => {
  it("found buttons at all", () => {
    // Guard the guard: the scan must see both the converted and the unconverted, or a regex
    // drift would report "all converted" forever.
    const consumers = files.filter((f) => /<Button[\s/>]/.test(strip(readFileSync(join(SCREENS, f), "utf8"))));
    expect(consumers.length).toBeGreaterThan(30);
    expect(HAND_ROLLED.length).toBeGreaterThan(0);
  });

  it("has not grown a new hand-rolled CTA, and records each one that resolves", () => {
    // Both directions: a new one fails the list, and converting one fails it too, so the
    // name has to be removed here — the list can only ever be edited to get shorter.
    expect(HAND_ROLLED).toEqual([
      "AdjustPinScreen:save",                       // disabled until the map settles
      "KawangGawaCheckinScreen:actionButton",       // disabled outside the geofence / window
      "ListingDetailScreen:inquireBtn",             // disabled once the inquiry is sent
      "PlaceRequestScreen:acceptBtn",               // disabled once decided
      "PlaceRequestScreen:declineBtn",              // disabled once decided
      "ShelterVolunteerAttendanceScreen:attendedBtn", // 46 pt row action, not a CTA
      "ShelterVolunteerRequestsScreen:approveBtn"     // 46 pt row action, not a CTA
    ]);
  });
});
