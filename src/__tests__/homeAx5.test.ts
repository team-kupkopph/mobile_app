/**
 * Guest Home at AX5 (Run 6 parts 8-11; seen on `main` at `e252cca`): the greeting broke as "Welc / ome!", the "Log in" pill
 * was clipped, the "You're browsing as a guest" card was crushed to a sliver ("You're / bro / wsi / ng…") with "Sign up ›"
 * pushed off the edge, the "Report now" button was clipped, the section headers pushed "See all ›" off the screen, and the
 * listing / story / stray rows sat at a fixed `height: 68` so their text overlapped and their "Available" badge was clipped.
 *
 * Most of that lives in components both Homes share (`HomeSections`, `SectionHeader`), so the fix does too. The same
 * fixes as everywhere else in the AX5 work: rows and chips take `minHeight` + padding instead of `height` (R6-F3/F4/F6); a
 * row of icon | text | action stacks at `fontScale > 1.5` and cancels the surviving `flex: 1` (R6-F10/F12/F14); titles are
 * capped (R6-F10). Default-size layout is unchanged: every large style applies only above 1.5.
 *
 * A source scan in the style of profileTabBarAx5.test.ts; the device walk is the proof.
 */
import { readFileSync } from "fs";
import { join } from "path";

const src = (...p: string[]) => readFileSync(join(__dirname, "..", ...p), "utf-8");
const sections = src("components", "home", "HomeSections.tsx");
const sectionHeader = src("components", "ui", "SectionHeader.tsx");
const guest = src("screens", "HomeGuestScreen.tsx");
const hook = src("useLargeText.ts");
const body = (s: string, name: string) => {
  const m = new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*\\{([^{}]*)\\}`).exec(s);
  return m ? m[1] : null;
};
const fixedHeight = /(^|[^a-zA-Z])height\s*:/;
const fixedWidth = /(^|[^a-zA-Z])width\s*:/;

describe("useLargeText", () => {
  it("is true above the app's large-text threshold", () => {
    expect(hook).toMatch(/useWindowDimensions/);
    expect(hook).toMatch(/fontScale\s*>\s*1\.5/);
  });
});

describe("the shared Home rows and chips grow with their text", () => {
  it("the scan found the styles (a guard that matches nothing proves nothing)", () => {
    for (const n of ["row", "reportButton", "availableBadge", "urgentBadge", "specialBadge", "stableBadge", "copy", "greeting"]) {
      expect(body(sections, n)).not.toBeNull();
    }
  });
  it("row uses minHeight 68 with vertical padding, not a fixed height", () => {
    const b = body(sections, "row") as string;
    expect(b).toMatch(/minHeight\s*:\s*68/);
    expect(b).toMatch(/paddingVertical\s*:/);
    expect(b).not.toMatch(fixedHeight);
  });
  it.each(["availableBadge", "urgentBadge", "specialBadge", "stableBadge"])("%s uses minHeight + padding and no fixed height or width", (n) => {
    const b = body(sections, n) as string;
    expect(b).toMatch(/minHeight\s*:\s*28/);
    expect(b).toMatch(/paddingVertical\s*:/);
    expect(b).toMatch(/paddingHorizontal\s*:/);
    expect(b).not.toMatch(fixedHeight);
    expect(b).not.toMatch(fixedWidth);
  });
  it("the Report now button uses minHeight 44 + padding, with no fixed width or height", () => {
    const b = body(sections, "reportButton") as string;
    expect(b).toMatch(/minHeight\s*:\s*44/);
    expect(b).toMatch(/minWidth\s*:\s*136/);
    expect(b).toMatch(/paddingVertical\s*:/);
    expect(b).not.toMatch(fixedHeight);
    expect(b).not.toMatch(fixedWidth);
  });
});

describe("the shared Home rows stack at a large font scale", () => {
  const rowUses = [...sections.matchAll(/style=\{\[styles\.row[^\]]*\]\}|style=\{styles\.row\}/g)].map((m) => m[0]);
  it("found the four row components (+ ShelterHelpRow, US-W4 Ways to help)", () => {
    expect(rowUses.length).toBe(4);
  });
  it("each row component reads useLargeText and applies rowLarge", () => {
    for (const u of rowUses) expect(u).toMatch(/large && styles\.rowLarge/);
    expect((sections.match(/const large = useLargeText\(\)/g) ?? []).length).toBeGreaterThanOrEqual(5);
  });
  it("rowLarge is a column, and the text gets the full width with the base flex cancelled", () => {
    const r = body(sections, "rowLarge") as string;
    expect(r).toMatch(/flexDirection\s*:\s*"column"/);
    expect(r).toMatch(/alignItems\s*:\s*"flex-start"/);
    expect(sections).toMatch(/styles\.copy,\s*large && styles\.copyLarge/);
    const c = body(sections, "copyLarge") as string;
    expect(c).toMatch(/marginLeft\s*:\s*0/);
    expect(c).toMatch(/alignSelf\s*:\s*"stretch"/);
    expect(c).not.toMatch(/\bflex\s*:\s*1/);
    expect(c).toMatch(/flexGrow\s*:\s*0/);
    expect(c).toMatch(/flexBasis\s*:\s*"auto"/);
  });
  it("the badge sits under the text when large", () => {
    expect(body(sections, "badgeLarge") as string).toMatch(/marginTop\s*:/);
    expect((sections.match(/large && styles\.badgeLarge/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
  it("a story's one-line caption may wrap when large", () => {
    expect(sections).toMatch(/numberOfLines=\{large \? 3 : 1\}/);
  });
});

describe("the Home header", () => {
  it("the greeting is capped like every other title", () => {
    const tag = /<Text\b[^>]*style=\{styles\.greeting\}[^>]*>/s.exec(sections);
    expect(tag).not.toBeNull();
    expect((tag as RegExpExecArray)[0]).toMatch(/maxFontSizeMultiplier=\{maxFontScale\.title\}/);
    expect(sections).toMatch(/import\s*\{[^}]*\bmaxFontScale\b[^}]*\}\s*from\s*"\.\.\/\.\.\/theme"/s);
  });
  it("the header row stacks when large, so the Log in pill / bell sits under the greeting", () => {
    expect(sections).toMatch(/styles\.headerRow,\s*large && styles\.headerRowLarge/);
    expect(body(sections, "headerRowLarge") as string).toMatch(/flexDirection\s*:\s*"column"/);
    expect(sections).toMatch(/styles\.headerCopy,\s*large && styles\.headerCopyLarge/);
    const c = body(sections, "headerCopyLarge") as string;
    expect(c).toMatch(/flexGrow\s*:\s*0/);
    expect(c).toMatch(/flexBasis\s*:\s*"auto"/);
    expect(c).toMatch(/marginRight\s*:\s*0/);
  });
  it("the city row wraps", () => {
    expect(body(sections, "cityRow") as string).toMatch(/flexWrap\s*:\s*"wrap"/);
  });
});

describe("the Report a stray card", () => {
  it("is capped and stacks when large, with the paw under the text", () => {
    expect(sections).toMatch(/styles\.reportCard,\s*large && styles\.reportCardLarge/);
    expect(body(sections, "reportCardLarge") as string).toMatch(/flexDirection\s*:\s*"column"/);
    const tag = /<Text\b[^>]*style=\{styles\.reportTitle\}[^>]*>/s.exec(sections);
    expect((tag as RegExpExecArray)[0]).toMatch(/maxFontSizeMultiplier=\{maxFontScale\.title\}/);
  });
});

describe("the section header", () => {
  it("title is capped and the row stacks when large, so 'See all ›' stays on screen", () => {
    const tag = /<Text\b[^>]*style=\{styles\.title\}[^>]*>/s.exec(sectionHeader);
    expect((tag as RegExpExecArray)[0]).toMatch(/maxFontSizeMultiplier=\{maxFontScale\.title\}/);
    expect(sectionHeader).toMatch(/const large = useLargeText\(\)/);
    expect(sectionHeader).toMatch(/styles\.row,\s*large && styles\.rowLarge,\s*style/);
    const r = body(sectionHeader, "rowLarge") as string;
    expect(r).toMatch(/flexDirection\s*:\s*"column"/);
    expect(r).toMatch(/alignItems\s*:\s*"flex-start"/);
  });
});

describe("the guest card and the Log in pill", () => {
  it("the Log in pill uses minHeight, not a fixed height", () => {
    const b = body(guest, "loginPill") as string;
    expect(b).toMatch(/minHeight\s*:\s*40/);
    expect(b).toMatch(/paddingVertical\s*:/);
    expect(b).not.toMatch(fixedHeight);
  });
  it("the guest card stacks when large; the text gets the full width with the base flex cancelled", () => {
    expect(guest).toMatch(/const large = useLargeText\(\)/);
    expect(guest).toMatch(/styles\.guestCard,\s*large && styles\.guestCardLarge/);
    const card = body(guest, "guestCardLarge") as string;
    expect(card).toMatch(/flexDirection\s*:\s*"column"/);
    expect(card).toMatch(/alignItems\s*:\s*"flex-start"/);
    expect(guest).toMatch(/styles\.guestCopy,\s*large && styles\.guestCopyLarge/);
    const c = body(guest, "guestCopyLarge") as string;
    expect(c).toMatch(/marginLeft\s*:\s*0/);
    expect(c).toMatch(/alignSelf\s*:\s*"stretch"/);
    expect(c).not.toMatch(/\bflex\s*:\s*1/);
    expect(c).toMatch(/flexGrow\s*:\s*0/);
    expect(c).toMatch(/flexBasis\s*:\s*"auto"/);
  });
  it("'Sign up ›' sits under the text when large", () => {
    expect(guest).toMatch(/styles\.guestLink,\s*large && styles\.guestLinkLarge/);
    expect(body(guest, "guestLinkLarge") as string).toMatch(/marginTop\s*:/);
  });
});
