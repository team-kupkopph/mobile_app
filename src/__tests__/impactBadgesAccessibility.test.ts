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
const detail = read("screens/BadgeComparisonScreen.tsx");
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

  it("a payload without the lists is a failure, not an empty grid", () => {
    expect(impact).toMatch(/Array\.isArray\(r\.data\??\.badges\)/);
  });

  it("keeps the AX5 behaviour: large text stacks the keep-going rows too", () => {
    expect(impact).toMatch(/styles\.keepRow, large && styles\.keepRowLarge/);
    expect(impact).toMatch(/keepRowLarge\s*:\s*\{[^}]*flexDirection\s*:\s*"column"/);
  });

  it("adds no raw colour: the file's hex budget in themeAdoption stays at one", () => {
    expect(count(impact, /#[0-9A-Fa-f]{6}\b/g)).toBeLessThanOrEqual(1);
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

  it("stacks at large text, and draws no glyph as text (the type ramp lets that count fall, never rise)", () => {
    expect(profileBadges).toMatch(/useLargeText\(\)/);
    const code = profileBadges.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\/.*$/gm, "");   // the explanation may name the glyph
    expect(code).not.toMatch(/[★›‹]/);
  });
});
