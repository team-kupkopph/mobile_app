/**
 * The Adopt deck is the artboard's deck, in the artboard's declared behaviour, and never
 * claims more than GET /listings can back.
 *
 * ⚠️ WHICH BEHAVIOUR. Adopt.dc.html offers three gesture modes and its `data-props` default —
 * the state the designer left the artboard in — is "Save / Not for me": right saves to a
 * shortlist, left hides from the feed, Undo puts the card back, and the end card offers
 * "Show hidden again". The script's own fallback is "Save / Next"; the declared default wins,
 * for the same reason the Components panel wins over incidental CSS. Pinned below, because a
 * later reader will find the fallback first.
 *
 * ⚠️ WHAT THE LIST PAYLOAD CANNOT BACK. The list card carries no poster and no distance, so
 * the deck card has no shelter row and no "2 km" chip; the city takes that slot. The Details
 * overlay shows only booleans the listing records — never the artboard's "Good with children"
 * or "House trained", which have no field. Each is asserted as absent.
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";

import { elevation } from "../theme/elevation";

const SRC = join(__dirname, "..");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");
const deck = read("components/AdoptDeck.tsx");
const logic = read("adoptDeck.ts");
const screen = read("screens/AdoptScreen.tsx");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const code = strip(deck);
const logicCode = strip(logic);

function findCanvas(): string | null {
  let dir = __dirname;
  for (let i = 0; i < 8; i++) {
    const c = join(dir, "design", "mobile-v3", "Adopt.dc.html");
    if (existsSync(c)) return c;
    const up = dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return null;
}
const canvasPath = findCanvas();
const canvas = canvasPath ? readFileSync(canvasPath, "utf8") : "";
const describeParity = canvasPath ? describe : describe.skip;
if (!canvasPath) {
  // eslint-disable-next-line no-console
  console.warn("[deck] design/mobile-v3 not found — parity assertions skipped, not failed.");
}

describe("the Adopt deck", () => {
  it("is the Browse view, and the top card is still card.adopt.0", () => {
    expect(screen).toMatch(/<AdoptDeck/);
    expect(screen).not.toMatch(/testID=\{`card\.adopt\.\$\{i\}`\}/); // the old list's contract
    expect(deck).toMatch(/testID=\{`card\.adopt\.\$\{n\}`\}/);
    expect(deck).toMatch(/const isTop = n === 0;/);
    // 20-browse-and-inquire.yaml: tap card.adopt.0 -> screen.listingDetail.
    expect(deck).toMatch(/onPress=\{isTop \? \(\) => onOpen\(l\.listing_id\) : undefined\}/);
    expect(screen).toMatch(/onOpen=\{\(listingId\) => navigation\.navigate\("listingDetail", \{ listingId \}\)\}/);
  });

  it("uses RN's own Animated and PanResponder, not a gesture library", () => {
    expect(deck).toMatch(/PanResponder\.create/);
    // The JS driver is a measured decision, not an oversight — see the note above `dx`.
    expect(deck).not.toMatch(/useNativeDriver: true/);
    expect(deck).toMatch(/THE JS DRIVER, ON PURPOSE, AND MEASURED/);
    const pkg = JSON.parse(readFileSync(join(SRC, "..", "package.json"), "utf8"));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(deps["react-native-gesture-handler"]).toBeUndefined();
    expect(deps["react-native-reanimated"]).toBeUndefined();
  });

  it("shows nothing GET /listings cannot back", () => {
    expect(code).not.toMatch(/km\b/);                      // no distance
    expect(code).not.toMatch(/poster|initials|Verified/);  // no shelter row on the card
    expect(code).toMatch(/<Text style=\{styles\.cityChipText\}>\{l\.city\}<\/Text>/);
    expect(logicCode).not.toMatch(/Good with children|House trained/);
    expect(logic).toMatch(/Good with children/); // ...and the reason stays in the comment
    expect(logic).toMatch(/typeof pet\.vaccinated === "boolean"/);
  });

  it("keeps every swipe recoverable, as the artboard insists", () => {
    expect(logic).toMatch(/export function undo\(s: DeckState\)/);
    expect(logic).toMatch(/export function showHidden\(s: DeckState, ids: string\[\]\)/);
    expect(deck).toMatch(/testID="btn\.adopt\.undo"/);
    expect(deck).toMatch(/testID="btn\.adopt\.showHidden"/);
    // Every gesture has a button twin, so the deck works without swiping at all.
    expect(deck).toMatch(/testID="btn\.adopt\.hide"/);
    expect(deck).toMatch(/testID="btn\.adopt\.save"/);
  });

  it("persists under the cache prefix, so a session end wipes it", () => {
    expect(deck).toMatch(/readPref<string\[\]>\("adopt\.saved"\)/);
    expect(deck).toMatch(/writePref\("adopt\.hidden", next\.hidden\)/);
    expect(read("cache.ts")).toMatch(/PREFIX \+ "pref\." \+ name/);
    expect(read("cache.ts")).toMatch(/keys\.filter\(\(k\) => k\.startsWith\(PREFIX\)\)/);
    // ...and says so, rather than implying a server-side shortlist that does not exist.
    expect(code).toMatch(/remembered on this phone/);
  });

  it("honours reduced motion by skipping the fling, not the outcome", () => {
    expect(deck).toMatch(/if \(reduced\) \{ after\(\); return; \}/);
  });

  it("has the --sh-deck shadow as a token, converted like the other three", () => {
    const d = elevation.deck;
    expect(d.shadowOffset.height).toBe(22);   // carried across exactly
    expect(d.shadowOpacity).toBeLessThan(0.3); // scaled for the missing negative spread
    expect(d.elevation).toBeGreaterThan(elevation.float.elevation);
    expect(deck).toMatch(/\.\.\.elevation\.deck/);
  });
});

describeParity("the Adopt deck matches the artboard", () => {
  it("is in the artboard's declared default behaviour", () => {
    expect(canvas).toMatch(/"gesture":\{"editor":"enum","options":\["Save \/ Next","Save \/ Not for me","Browse only"\],"default":"Save \/ Not for me"/);
    expect(deck).toMatch(/SAVED/);
    expect(deck).toMatch(/NOT FOR ME/);
    expect(deck).not.toMatch(/>NEXT</);
  });

  it("uses the artboard's numbers for the gesture", () => {
    expect(canvas).toMatch(/const THRESHOLD = 78;/);
    expect(deck).toMatch(/const THRESHOLD = 78;/);
    expect(canvas).toMatch(/rotate\(" \+ \(dx \* 0\.045\) \+ "deg\)/);
    expect(deck).toMatch(/FLING \* 0\.045/);
    expect(canvas).toMatch(/dx: dir \* 520/);
    expect(deck).toMatch(/const FLING = 520;/);
    expect(canvas).toMatch(/\? 260 : 0/);
    expect(deck).toMatch(/const FLING_MS = 260;/);
    expect(canvas).toMatch(/\(dx - 12\) \/ 66/);
    expect(deck).toMatch(/const STAMP_FROM = 12;[\s\S]*const STAMP_OVER = 66;/);
  });

  it("stacks the cards behind the way the artboard does", () => {
    expect(canvas).toMatch(/translateY\(" \+ \(n \* 13\) \+ "px\) scale\(" \+ \(1 - n \* 0\.05\) \+ "\)/);
    expect(deck).toMatch(/translateY: n \* 13 \}, \{ scale: 1 - n \* 0\.05/);
    expect(canvas).toMatch(/opacity: n === 2 \? "0\.55" : "1"/);
    expect(deck).toMatch(/opacity: n === 2 \? 0\.55 : 1/);
  });

  it("draws the card, the photo and the controls at the artboard's sizes", () => {
    expect(canvas).toMatch(/height: 452px; border-radius: 26px/);
    expect(deck).toMatch(/const CARD_HEIGHT = 452;/);
    expect(deck).toMatch(/borderRadius: radii\.hero/); // 26
    expect(canvas).toMatch(/height: 268px; background: \{\{c\.tile\}\}/);
    expect(deck).toMatch(/const PHOTO_HEIGHT = 268;/);
    expect(canvas).toMatch(/width: 58px; height: 58px; border-radius: 29px/);
    expect(deck).toMatch(/round: \{ width: 58, height: 58, borderRadius: pill\(58\)/);
    expect(canvas).toMatch(/height: 50px; padding: 0 22px/);
    expect(deck).toMatch(/details: \{ height: 50, paddingHorizontal: 22, borderRadius: pill\(50\)/);
  });

  it("uses the artboard's copy", () => {
    const hint = "Swipe right to save, left to hide from your feed. Hidden pets stop appearing — in a city with 12 listings that empties fast.";
    expect(canvas).toContain(hint);
    // The deck's hint is the artboard's first sentence plus its own reassurance; the second
    // sentence explains the mode to a designer, not to an adopter.
    expect(deck).toContain("Swipe right to save, left to hide from your feed. Hidden pets stop appearing");
    for (const s of ["That is everyone nearby", "Show hidden again", "Undo", "Details"]) {
      expect(canvas).toContain(s);
      expect(deck).toContain(s);
    }
    expect(canvas).toContain("Hidden pets stop appearing here — bring them back any time.");
    expect(logic).toContain("Hidden pets stop appearing here — bring them back any time.");
  });
});
