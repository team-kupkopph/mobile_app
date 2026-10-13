/**
 * The shelter's volunteer (Kawang-Gawa) screens at AX5 (seen on `main` at `dd12ddf`): on the activity list the header's "+ Post an
 * activity" button squeezed the screen title out of the header row altogether, and the button itself (a fixed `height: 40`) was clipped; the
 * heading "Your volunteer activities" was crushed to a letter-wide column beside a "Calendar ›" link ("Yo / ur / vol…"); and each activity card
 * (icon | text | status chip) broke its title ("Dog wa…") and its time ("6:40 P / M–").
 *
 * The header fix is shared (`ScreenHeader`'s `right` slot is also used by Stories, Kawang-Gawa detail, Listing detail and Report detail): at
 * `fontScale > 1.5` the row wraps, so a wide action drops under the title instead of taking its space. The rest are the patterns used everywhere
 * in the AX5 work: `minHeight` + padding instead of a fixed `height`; a row of icon | text | action stacks at large, cancelling the surviving
 * `flex: 1`; titles capped; a footer that would eat the screen scrolls with the content. Default-size layout is unchanged.
 *
 * Not covered here, and not walked: the sign-up cards (Pending / Confirmed / Attendance), the sign-up detail, and the create / edit forms.
 *
 * A source scan in the style of shelterShellAx5.test.ts; the device walk is the proof.
 */
import { readFileSync } from "fs";
import { join } from "path";

const src = (...p: string[]) => readFileSync(join(__dirname, "..", ...p), "utf-8");
const header = src("components", "ui", "ScreenHeader.tsx");
const list = src("screens", "ShelterVolunteerScreen.tsx");
const calendar = src("screens", "ShelterVolunteerCalendarScreen.tsx");
const cancel = src("screens", "ShelterVolunteerCancelScreen.tsx");
const activity = src("screens", "ShelterVolunteerActivityScreen.tsx");
const body = (s: string, name: string) => {
  const m = new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*\\{([^{}]*)\\}`).exec(s);
  return m ? m[1] : null;
};
const fixedHeight = /(^|[^a-zA-Z])height\s*:/;
const hasTitleCap = (s: string, style: string) => {
  const tag = new RegExp(`<Text\\b[^>]*style=\\{(?:\\[)?styles\\.${style}\\b[^>]*>`, "s").exec(s);
  return !!tag && /maxFontSizeMultiplier=\{maxFontScale\.title\}/.test(tag[0]);
};
const importsCap = (s: string) => /import\s*\{[^}]*\bmaxFontScale\b[^}]*\}\s*from\s*"\.\.\/theme"/s.test(s);
function expectStackedCopy(s: string, name: string) {
  const c = body(s, name) as string;
  expect(c).not.toBeNull();
  expect(c).toMatch(/marginLeft\s*:\s*0/);
  expect(c).toMatch(/alignSelf\s*:\s*"stretch"/);
  expect(c).not.toMatch(/\bflex\s*:\s*1/);
  expect(c).toMatch(/flexGrow\s*:\s*0/);
  expect(c).toMatch(/flexBasis\s*:\s*"auto"/);
}

describe("ScreenHeader's right slot", () => {
  it("the row wraps when large, so a wide action drops under the title instead of squeezing it out", () => {
    expect(header).toMatch(/styles\.row,\s*large && styles\.rowLarge/);
    expect(body(header, "rowLarge") as string).toMatch(/flexWrap\s*:\s*"wrap"/);
  });
  it("the right slot stops pushing to the far edge when large", () => {
    expect(header).toMatch(/styles\.right,\s*large && styles\.rightLarge/);
    const r = body(header, "rightLarge") as string;
    expect(r).toMatch(/marginLeft\s*:\s*0/);
    expect(r).toMatch(/paddingLeft\s*:\s*0/);
  });
});

describe("the activity list (ShelterVolunteerScreen)", () => {
  it("the scan found the styles (a guard that matches nothing proves nothing)", () => {
    for (const n of ["newBtn", "sectionHeader", "sectionTitle", "card", "cardTitle", "calendarLink"]) {
      expect(body(list, n)).not.toBeNull();
    }
  });
  it("reads the large-text flag", () => {
    expect(list).toMatch(/const large = useLargeText\(\)/);
  });
  it("the Post an activity button uses minHeight + padding, not a fixed height", () => {
    const b = body(list, "newBtn") as string;
    expect(b).toMatch(/minHeight\s*:\s*40/);
    expect(b).toMatch(/paddingVertical\s*:/);
    expect(b).not.toMatch(fixedHeight);
  });
  it("the section header stacks when large (heading, then the Calendar link), with the base flex cancelled, and the heading is capped", () => {
    expect(list).toMatch(/styles\.sectionHeader,\s*large && styles\.sectionHeaderLarge/);
    expect(body(list, "sectionHeaderLarge") as string).toMatch(/flexDirection\s*:\s*"column"/);
    expect(list).toMatch(/styles\.sectionCopy,\s*large && styles\.sectionCopyLarge/);
    const c = body(list, "sectionCopyLarge") as string;
    expect(c).toMatch(/alignSelf\s*:\s*"stretch"/);
    expect(c).toMatch(/flexGrow\s*:\s*0/);
    expect(c).toMatch(/flexBasis\s*:\s*"auto"/);
    expect(hasTitleCap(list, "sectionTitle")).toBe(true);
    expect(importsCap(list)).toBe(true);
  });
  it("an activity card stacks when large (icon, text, chip) and its title may wrap further", () => {
    expect(list).toMatch(/styles\.card,\s*large && styles\.cardLarge/);
    expect(body(list, "cardLarge") as string).toMatch(/flexDirection\s*:\s*"column"/);
    expect(body(list, "cardLarge") as string).toMatch(/alignItems\s*:\s*"flex-start"/);
    expect(list).toMatch(/styles\.cardCopy,\s*large && styles\.cardCopyLarge/);
    expectStackedCopy(list, "cardCopyLarge");
    expect(list).toMatch(/numberOfLines=\{large \? 4 : 2\}/);
  });
});

describe("the volunteer schedule (calendar)", () => {
  it("an activity card stacks when large and its title may wrap further", () => {
    expect(calendar).toMatch(/const large = useLargeText\(\)/);
    expect(calendar).toMatch(/styles\.card,\s*large && styles\.cardLarge/);
    expect(body(calendar, "cardLarge") as string).toMatch(/flexDirection\s*:\s*"column"/);
    expect(calendar).toMatch(/styles\.cardCopy,\s*large && styles\.cardCopyLarge/);
    expectStackedCopy(calendar, "cardCopyLarge");
    expect(calendar).toMatch(/numberOfLines=\{large \? 4 : 2\}/);
  });
});

describe("cancel an activity", () => {
  it("the summary card stacks when large; the question and heading are capped", () => {
    expect(cancel).toMatch(/const large = useLargeText\(\)/);
    expect(cancel).toMatch(/styles\.summaryCard,\s*large && styles\.summaryCardLarge/);
    expect(body(cancel, "summaryCardLarge") as string).toMatch(/flexDirection\s*:\s*"column"/);
    expect(cancel).toMatch(/styles\.summaryCopy,\s*large && styles\.summaryCopyLarge/);
    expectStackedCopy(cancel, "summaryCopyLarge");
    expect(hasTitleCap(cancel, "question")).toBe(true);
    expect(hasTitleCap(cancel, "heading")).toBe(true);
    expect(importsCap(cancel)).toBe(true);
  });
  it("the summary text cannot collapse in the stacked card: the large style sets flex: 0, not only grow / basis (found on the device)", () => {
    // `flexGrow: 0` + `flexBasis: "auto"` was not enough here: the summary text rendered at zero height (absent from the
    // accessibility tree), because the base `summaryCopy` is `flex: 1`. `flex: 0` overrides it outright.
    expect(body(cancel, "summaryCopyLarge") as string).toMatch(/\bflex\s*:\s*0\b/);
  });
  it("the Keep activity link uses minHeight, not a fixed height", () => {
    const b = body(cancel, "keepLink") as string;
    expect(b).toMatch(/minHeight\s*:\s*40/);
    expect(b).not.toMatch(fixedHeight);
  });
});

describe("an activity (ShelterVolunteerActivityScreen)", () => {
  it("the footer scrolls with the content when large, so three stacked buttons do not eat the screen", () => {
    expect(activity).toMatch(/const large = useLargeText\(\)/);
    expect(activity).toMatch(/\{!large && footer\}/);
    expect(activity).toMatch(/\{large && footer\}/);
  });
  it("Edit and Duplicate stack when large, with the base flex cancelled", () => {
    expect(activity).toMatch(/styles\.footerRow,\s*large && styles\.footerRowLarge/);
    expect(body(activity, "footerRowLarge") as string).toMatch(/flexDirection\s*:\s*"column"/);
    expect(activity).toMatch(/styles\.footerHalf,\s*large && styles\.footerHalfLarge/);
    const h = body(activity, "footerHalfLarge") as string;
    expect(h).toMatch(/flexGrow\s*:\s*0/);
    expect(h).toMatch(/flexBasis\s*:\s*"auto"/);
    expect(h).toMatch(/alignSelf\s*:\s*"stretch"/);
  });
});
