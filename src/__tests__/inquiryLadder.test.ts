/**
 * The adopter's inquiry ladder is the artboard's ladder, on real data, and never more than
 * the data can say.
 *
 * ⚠️ WHAT THE ARTBOARD SHOWS THAT THE DATA CANNOT SUPPORT — asserted as ABSENT, on purpose.
 * Inquiry.dc.html carries three things with no source behind them: a date on each done step
 * (`/me/inquiries` serialises no timestamps), "Replies in about a day" (no such metric
 * exists), and a "Message PAWS Manila" CTA (there is no messaging feature and the poster
 * object carries no contact). Each was left out rather than approximated. This file pins
 * that, because the pressure to "just show something" there is real and recurring.
 *
 * What it DOES show is grounded: the badge reads "Verified Shelter" / "Verified Member" because
 * public listings come only from a verified poster (listings/visibility.py, public_poster_q) —
 * an adopter cannot have inquired on anything else — and it names the type, as the design
 * system requires of every verified badge.
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";

const SRC = join(__dirname, "..");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");
const screen = read("screens/InquiryScreen.tsx");
const list = read("components/InquiryList.tsx");
/**
 * The screen's header comment quotes the artboard's copy in order to explain why it is NOT
 * rendered — so the honesty assertions must run against the code with comments removed, or
 * the explanation would fail the rule it explains.
 */
const code = screen.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

function findCanvas(): string | null {
  let dir = __dirname;
  for (let i = 0; i < 8; i++) {
    const c = join(dir, "design", "mobile-v3", "Inquiry.dc.html");
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
  console.warn("[inquiry] design/mobile-v3 not found — parity assertions skipped, not failed.");
}

describe("the inquiry ladder", () => {
  it("is a registered route, and is where an inquiry row lands", () => {
    expect(read("navigation/types.ts")).toMatch(/inquiry: \{ inquiryId: string \}/);
    expect(read("navigation/RootNavigator.tsx")).toMatch(/<Stack\.Screen name="inquiry" component=\{InquiryScreen\}/);
    expect(list).toMatch(/navigation\.navigate\("inquiry", \{ inquiryId: iq\.inquiry_id \}\)/);
    // A pending placement still goes to accept/decline, not the ladder.
    expect(list).toMatch(/if \(pendingPlacement\) navigation\.navigate\("placeRequest"/);
  });

  it("resolves the inquiry the way the app already does, and the listing only as decoration", () => {
    expect(screen).toMatch(/api\.get\("\/me\/inquiries"\)/);
    expect(screen).toMatch(/api\.get\(`\/listings\/\$\{found\.listing\.listing_id\}`\)/);
    // The ladder renders from the inquiry alone; `poster` and `photo` are nullable.
    expect(screen).toMatch(/const poster = listing\?\.poster \?\? null/);
    expect(screen).toMatch(/const photo = listing\?\.photos\?\.\[0\]/);
  });

  it("shows nothing the data cannot back", () => {
    expect(code).not.toMatch(/Replies in/);
    expect(code).not.toMatch(/Message \$\{|Message PAWS|label=\{`Message/);
    // The date on a done step comes from the stage's own `updated_at` (backend #18) through
    // stageMeta, which says "Done" when a server sent none — never the inquiry's created_at,
    // never today.
    expect(code).toMatch(/stageMeta\(st, stage\?\.updated_at\)/);
    expect(code).not.toMatch(/created_at|new Date\(\)/);
    // ...and the header comment still explains all three, so the reasoning travels with the code.
    expect(screen).toMatch(/Replies in about a day/);
    expect(screen).toMatch(/Message PAWS Manila/);
  });

  it("names the type on the verified badge, and derives it from a real predicate", () => {
    expect(screen).toMatch(/poster\.is_shelter \? "Verified Shelter" : "Verified Member"/);
    expect(screen).toMatch(/public_poster_q/); // the reason, recorded next to the claim
    expect(screen).not.toMatch(/label="Verified"/);
  });

  it("opens the current step by default and toggles on tap", () => {
    expect(screen).toMatch(/s\.state === "in_progress"\)/);
    expect(screen).toMatch(/setOpen\(\(prev\) => prev \?\? current\?\.stage_key \?\? null\)/);
    expect(screen).toMatch(/onToggle=\{\(key\) => setOpen\(\(prev\) => \(prev === key \? null : key\)\)\}/);
    expect(screen).toMatch(/accessibilityState=\{\{ expanded: open === key \}\}/);
  });

  it("keeps the listing reachable now that the row no longer goes there", () => {
    expect(screen).toMatch(/navigation\.navigate\("listingDetail", \{ listingId: inquiry\.listing\.listing_id \}\)/);
    expect(screen).toMatch(/testID="card\.inquiry\.pet"/);
  });

  it("puts hairline radii on pill(), not on the container scale", () => {
    // A 7 pt bar and a 3 pt line are fully rounded, which is a rule, not a step.
    expect(screen).toMatch(/track: \{[^}]*borderRadius: pill\(7\)/);
    expect(screen).toMatch(/line: \{[^}]*borderRadius: pill\(3\)/);
    expect(screen).toMatch(/dot: \{[^}]*borderRadius: pill\(DOT\)/);
  });
});

describeParity("the inquiry ladder matches the artboard", () => {
  it("draws the dot, the rail and the tile at the artboard's sizes", () => {
    expect(canvas).toMatch(/width: 30px; height: 30px; border-radius: 15px/);
    expect(screen).toMatch(/const DOT = 30;/);
    expect(canvas).toMatch(/top: 30px; bottom: -22px; width: 3px/);
    expect(screen).toMatch(/line: \{ position: "absolute", top: DOT, bottom: -22, width: 3/);
    expect(canvas).toMatch(/width: 62px; height: 62px; border-radius: 20px/);
    expect(screen).toMatch(/const TILE = 62;/);
    expect(screen).toMatch(/borderRadius: squircle\(TILE\)/); // 20
  });

  it("marks the current step with the artboard's ring and core", () => {
    expect(canvas).toMatch(/2\.5px solid #1C6B6B/);
    expect(canvas).toMatch(/width: 10px; height: 10px; border-radius: 5px; background: #1C6B6B/);
    expect(screen).toMatch(/dotCurrent: \{ backgroundColor: colors\.white, borderWidth: 2\.5, borderColor: colors\.teal \}/);
    expect(screen).toMatch(/dotCore: \{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors\.teal \}/);
  });

  it("weights the step title the way the artboard does", () => {
    expect(canvas).toMatch(/weight: current \? "800" : done \? "700" : "600"/);
    expect(screen).toMatch(/fontWeight: current \? "800" : done \? "700" : "600"/);
  });

  it("uses the artboard's copy for the section, the hint and the step chip", () => {
    for (const s of ["Your six steps", "Shelter contact", "Tap any step to see what it involves.", "Your inquiry"]) {
      expect(canvas).toContain(s);
      expect(screen).toContain(s);
    }
    expect(canvas).toMatch(/Step 4 of 6/);
    expect(screen).toMatch(/`Step \$\{step\} of \$\{of\}`/);
  });

  it("uses the artboard's step titles", () => {
    const adoption = read("adoption.ts");
    for (const title of ["Inquiry sent", "Application & background check", "Home check", "Interview", "Vet clearance", "Finalization"]) {
      expect(canvas.replace(/&amp;/g, "&")).toContain(title);
      expect(adoption).toContain(`"${title}"`);
    }
  });
});
