/**
 * V8 / V7 / IB15 / IB11 · what the Impact, Badge and Profile surfaces say to a screen reader, and what they show.
 *
 * "My impact" had no accessibility label, role or state on either screen, so earned versus not earned was carried by colour
 * alone and a VoiceOver user could not tell which badges they held. A source scan in the style of homeAx5.test.ts: the repo
 * has no renderer, and the device walk is the proof. The wording itself is pure and held in badgeSections.test.ts.
 */
import { readFileSync } from "fs";
import { join } from "path";

const read = (rel: string) => readFileSync(join(__dirname, "..", rel), "utf-8");
const impact = read("screens/ImpactScreen.tsx");
const detail = read("screens/BadgeDetailScreen.tsx");
const profile = read("screens/ProfileScreen.tsx");
const profileBadges = read("components/ProfileBadges.tsx");
const count = (src: string, re: RegExp) => (src.match(re) ?? []).length;

describe("Impact screen", () => {
  it("builds its groups from the shared helpers, not its own rule", () => {
    expect(impact).toMatch(/badgeSections\(/);
    expect(impact).toMatch(/badgeA11yLabel\(/);
    expect(impact).not.toMatch(/b\.earned \? styles\.badgeTile/);   // earned was the only difference between two tiles
  });

  it("every badge tile is a button that says whether it is held", () => {
    expect(impact).toMatch(/accessibilityRole="button"[^>]*accessibilityLabel=\{badgeA11yLabel\(/s);
    expect(impact).toMatch(/testID=\{`tile\.badge\.\$\{/);
  });

  it("the section titles are headers", () => {
    expect(count(impact, /accessibilityRole="header"/g)).toBeGreaterThanOrEqual(4);   // Badges, Almost there, Earned, Keep going
  });

  it("each stat tile reads as one thing: the number with its label", () => {
    expect(impact).toMatch(/accessible\b[^>]*accessibilityLabel=\{`\$\{t\.value\} \$\{t\.label\}`\}/s);
    expect(impact).toMatch(/testID=\{`tile\.impact\.\$\{/);
  });

  it("the bar is a progress bar with its value, not an unlabelled rectangle", () => {
    expect(impact).toMatch(/accessibilityRole="progressbar"/);
    expect(impact).toMatch(/accessibilityValue=\{\{\s*min: 0, max: [^}]*now: /s);
  });

  it("the decorative star is hidden from readers, so a tile is not read as 'star'", () => {
    expect(impact).toMatch(/importantForAccessibility="no-hide-descendants"/);
    expect(impact).toMatch(/accessibilityElementsHidden/);
  });

  it("draws the bar from progressFraction, which is clamped, never from raw current over target", () => {
    expect(impact).toMatch(/progressFraction\(/);
    expect(impact).not.toMatch(/current \/ [a-z.]*target/);
  });

  it("a payload that is not the contract is a failure, not an empty grid (IB26)", () => {
    expect(impact).toMatch(/parseImpact\(r\.data\)/);
    expect(impact).not.toMatch(/setBadges\(r\.data/);        // never from the raw `any`
  });

  it("keeps the AX5 behaviour: large text stacks the keep-going rows too", () => {
    expect(impact).toMatch(/styles\.keepRow, large && styles\.keepRowLarge/);
    expect(impact).toMatch(/keepRowLarge\s*:\s*\{[^}]*flexDirection\s*:\s*"column"/);
  });

  it("adds no raw colour: the file's hex budget in themeAdoption stays at one", () => {
    expect(count(impact, /#[0-9A-Fa-f]{6}\b/g)).toBeLessThanOrEqual(1);
  });
});

describe("Refocus (IB6): looking at My impact again", () => {
  // The explanations name the old calls ("was `else setBadges([])`"), so the "never calls" checks read code only.
  const code = impact.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\/.*$/gm, "");

  it("refreshes through the shared focus policy, not on every focus", () => {
    expect(impact).toMatch(/useRefreshOnFocus\(load\)/);
    expect(code).not.toMatch(/useFocusEffect\(load\)/);
  });

  it("only the newest answer lands: a slow older one cannot overwrite it", () => {
    expect(impact).toMatch(/createLatestOnly/);
    expect(impact).toMatch(/latest\.begin\(\)/);
  });

  it("starting a load never blanks what is held: that goes through beginImpactLoad", () => {
    expect(impact).toMatch(/setView\(beginImpactLoad\)/);
    expect(code).not.toMatch(/setRes\(null\)/);
    expect(code).not.toMatch(/setBadges\(|setImpact\(/);          // the data is one `view`, changed only by the two functions
  });

  it("an answer is folded in by applyImpactReply, which keeps the last good data on a failure", () => {
    expect(impact).toMatch(/applyImpactReply\(prev, r\)/);
  });

  it("a refresh that failed says so above the data it kept (the shared stale banner)", () => {
    expect(impact).toMatch(/impactIsStale\(view\)\s*\?\s*<StaleBanner offline=\{isOffline\(view\.res\)\}/);
    expect(impact.indexOf("<StaleBanner")).toBeGreaterThan(-1);
    expect(impact.indexOf("<StaleBanner")).toBeLessThan(impact.indexOf("tile.impact."));   // above the tiles it qualifies
  });

  it("the load reports whether it worked, so a failed one is retried at the next focus", () => {
    expect(impact).toMatch(/return\s+api\.get\("\/me\/impact"\)/);
    expect(impact).toMatch(/return r\.ok && parseImpact\(r\.data\) !== null/);
  });
});

describe("V3 and the lock (Impact review step 10; IQ8: keep the lock)", () => {
  const medalOf = (src: string) => /function Medal[\s\S]*?\n\}\n/.exec(src)?.[0] ?? "";

  it("an unearned medal carries the shared lock, so 'not earned' is a shape and not only a colour", () => {
    const medal = medalOf(impact);
    expect(medal).not.toBe("");                                   // the scan found the component: never assert on nothing
    expect(medal).toMatch(/<LockIcon\b/);
    expect(medal).toMatch(/earned \? null/);
    expect(impact).toMatch(/import \{[^}]*\bLockIcon\b[^}]*\} from "\.\.\/components\/AppIcons"/);
  });

  it("the lock is inside what is hidden from readers: the words say 'not earned yet', the lock only repeats it", () => {
    expect(medalOf(impact)).toMatch(/importantForAccessibility="no-hide-descendants"/);
  });

  it("the badge detail's medal carries the lock too, when the badge is not earned", () => {
    expect(detail).toMatch(/<LockIcon\b/);
    expect(detail).toMatch(/badge\.earned \? null/);
  });

  it("both screens sit on the backdrop and draw their surfaces with Card", () => {
    for (const src of [impact, detail]) {
      expect(src).toMatch(/<ScreenBackdrop \/>/);
      expect(src).toMatch(/<Card\b/);
      expect(src).not.toMatch(/\.\.\.elevation\./);
    }
  });

  it("the Profile card is a Card too, with no raw shadow", () => {
    expect(profileBadges).toMatch(/<Card\b/);
    expect(profileBadges).not.toMatch(/\.\.\.elevation\./);
  });

  it("keeps the touch target the whole tile: the Card has no padding of its own, the touchable inside has it", () => {
    expect(impact).toMatch(/badgeTile\s*:\s*\{[^}]*padding\s*:\s*0/);
    expect(impact).toMatch(/keepCard\s*:\s*\{[^}]*padding\s*:\s*0/);
  });
});

describe("Badge detail", () => {
  it("uses the shared date helper, not a local one whose try/catch never fires", () => {
    expect(detail).toMatch(/earnedDate/);
    expect(detail).not.toMatch(/function earnedDate/);
  });

  it("the name is a header and the medal is decoration", () => {
    expect(detail).toMatch(/accessibilityRole="header"/);
    expect(detail).toMatch(/importantForAccessibility="no-hide-descendants"/);
  });

  it("says plainly whether it is held, in words and not only colour", () => {
    expect(detail).toMatch(/Not earned yet/);
    expect(detail).toMatch(/testID="text\.badge\.status"/);
  });

  it("shows how far along an unearned badge is", () => {
    expect(detail).toMatch(/progressLabel\(/);
  });
});

describe("Profile", () => {
  it("shows the badges earned, from /me/impact, and only as a second fetch that can fail alone (US-R2)", () => {
    expect(profile).toMatch(/api\.get\("\/me\/impact"\)/);
    expect(profile).toMatch(/parseImpact\(r\.data\)/);
    expect(profile).toMatch(/<ProfileBadges\b/);
  });

  it("renders nothing for a person with none or a failed fetch: no hollow strip", () => {
    expect(profileBadges).toMatch(/if \(!held\.length\) return null/);
  });

  it("shows earned badges only, with no counts", () => {
    expect(profileBadges).toMatch(/\.filter\(\(b\) => b\.earned\)|badges\.filter\(\(b\) => b\.earned\)/);
    expect(profileBadges).not.toMatch(/shifts_completed|rescues_helped|pets_rehomed|pledges_delivered/);
  });

  it("is one button that opens My impact and names what it holds", () => {
    expect(profileBadges).toMatch(/accessibilityRole="button"/);
    expect(profileBadges).toMatch(/accessibilityLabel=\{`Badges: /);
    expect(profileBadges).toMatch(/testID="row\.profile\.badges"/);
  });

  it("stacks the header at large text: walked at AX5, the 'My impact' link ran off the right edge beside the title", () => {
    expect(profileBadges).toMatch(/styles\.head, large && styles\.headLarge/);
    expect(profileBadges).toMatch(/headLarge\s*:\s*\{[^}]*flexDirection\s*:\s*"column"/);
  });

  it("stacks at large text, and draws no glyph as text (the type ramp lets that count fall, never rise)", () => {
    expect(profileBadges).toMatch(/useLargeText\(\)/);
    const code = profileBadges.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\/.*$/gm, "");   // the explanation may name the glyph
    expect(code).not.toMatch(/[★›‹]/);
  });
});
