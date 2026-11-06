/**
 * Impact & badges review V3, V4, V10 and IB15's "Start ›": the last visual pieces, held as a source scan (the repo has no
 * renderer; the walk is the proof). V5 (a glyph per badge) is deliberately not here: see the review's status block.
 */
import { readFileSync } from "fs";
import { join } from "path";

const read = (rel: string) => readFileSync(join(__dirname, "..", rel), "utf-8");
const impact = read("screens/ImpactScreen.tsx");
const detail = read("screens/BadgeDetailScreen.tsx");
const profile = read("screens/ProfileScreen.tsx");
const sectionHeader = read("components/ui/SectionHeader.tsx");

describe("V3 · badge tiles press IN, they do not fade", () => {
  it("the Impact screen has no TouchableOpacity", () => {
    expect(impact).not.toMatch(/TouchableOpacity/);
    expect(impact).toMatch(/PressScale/);
  });
  it("every badge tile is still a button with its testID", () => {
    expect(impact.match(/<PressScale/g)?.length).toBe(3);                    // the near-win, an earned tile, a keep-going row
    expect(impact.match(/testID=\{`tile\.badge\.\$\{/g)?.length).toBe(3);
  });
});

describe("V4 · the shared Chip and SectionHeader", () => {
  it("Impact's 'Badges' title is a SectionHeader, and it stays a heading for a screen reader", () => {
    expect(impact).toMatch(/<SectionHeader title="Badges"/);
    expect(impact).not.toMatch(/styles\.sectionTitle/);
    expect(sectionHeader).toMatch(/accessibilityRole=\{onPress \? undefined : "header"\}/);
  });
  it("the earned badge's status is a success Chip, not a hand-built pill", () => {
    expect(detail).toMatch(/<Chip [^>]*tone="success"/);
    expect(detail).not.toMatch(/earnedPill|earnedText/);
    expect(detail).toMatch(/testID="text\.badge\.status"/);
  });
});

describe("IB15 · Keep going says what to do", () => {
  it("each row ends in 'Start ›', hidden from a screen reader (the row is already a labelled button)", () => {
    expect(impact).toMatch(/testID=\{`text\.impact\.start\.\$\{b\.badge_code\}`\}/);
    expect(impact).toMatch(/Start ›/);
    expect(impact).toMatch(/importantForAccessibility="no"/);
  });
  it("at large text it stacks under the copy with no left margin (walked at AX5: the 8 pt margin left it off the text edge)", () => {
    expect(impact).toMatch(/styles\.keepAction, large && styles\.keepActionLarge/);
    expect(impact).toMatch(/keepActionLarge: \{[^}]*marginLeft: 0/);
  });
});

describe("V10 · the Profile row says what My impact holds", () => {
  it("has a testID and the artboard's one-line hint", () => {
    expect(profile).toMatch(/testID="row\.profile\.impact"/);
    expect(profile).toMatch(/Rescues, pledges and adoptions/);
  });
});
