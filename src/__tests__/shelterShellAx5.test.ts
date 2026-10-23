/**
 * The shelter shell at AX5 (Run 6 parts 8-11; seen on `main` at `e252cca`): the dashboard's "Verified Rescue" pill clipped
 * and its "You're verified" hero was a sliver; the three stat tiles ("Drafts / Adopted / Donations") were crushed in a row at a
 * fixed `height: 104`; the Requests heading broke as "Request / s"; the Requests and Animals rows truncated the animal's
 * name ("R5 N…", "R1 Dr…") with their status chip beside them; and the Donate tab's "₱" outgrew the tab bar.
 *
 * Same fixes as everywhere else in the AX5 work: pills and tiles take `minHeight` + padding instead of `height` (R6-F3/F4/F6);
 * a row of icon | text | action stacks at `fontScale > 1.5` and cancels the surviving `flex: 1` (R6-F10/F12/F14, #186); titles are
 * capped (R6-F10); a one-line title may wrap when stacked; a text glyph in a fixed shape does not scale (R6-F5). Default-size
 * layout is unchanged: every large style applies only above 1.5. The SegmentedControl is left alone: it was deliberately built to
 * shrink, never truncate (F-R3-8).
 *
 * A source scan in the style of homeAx5.test.ts; the device walk is the proof.
 */
import { readFileSync } from "fs";
import { join } from "path";

const src = (...p: string[]) => readFileSync(join(__dirname, "..", ...p), "utf-8");
const dash = src("screens", "ShelterDashboardScreen.tsx");
const requests = src("screens", "ShelterRequestsScreen.tsx");
const animals = src("screens", "ShelterAnimalsScreen.tsx");
const byStatus = src("components", "ListingsByStatus.tsx");
const tabs = src("components", "ShelterTabs.tsx");
const body = (s: string, name: string) => {
  const m = new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*\\{([^{}]*)\\}`).exec(s);
  return m ? m[1] : null;
};
const fixedHeight = /(^|[^a-zA-Z])height\s*:/;
const fixedWidth = /(^|[^a-zA-Z])width\s*:/;
const hasTitleCap = (s: string, style: string) => {
  const tag = new RegExp(`<Text\\b[^>]*style=\\{(?:\\[)?styles\\.${style}\\b[^>]*>`, "s").exec(s);
  return !!tag && /maxFontSizeMultiplier=\{maxFontScale\.title\}/.test(tag[0]);
};
const importsCap = (s: string) => /import\s*\{[^}]*\bmaxFontScale\b[^}]*\}\s*from\s*"\.\.\/theme"/s.test(s);
/** Stacked large styles: a column, the text at full width, the surviving `flex: 1` cancelled. */
function expectStackedCopy(s: string, name: string) {
  const c = body(s, name) as string;
  expect(c).not.toBeNull();
  expect(c).toMatch(/marginLeft\s*:\s*0/);
  expect(c).toMatch(/alignSelf\s*:\s*"stretch"/);
  expect(c).not.toMatch(/\bflex\s*:\s*1/);
  expect(c).toMatch(/flexGrow\s*:\s*0/);
  expect(c).toMatch(/flexBasis\s*:\s*"auto"/);
}

describe("shelter dashboard", () => {
  it("the scan found the styles (a guard that matches nothing proves nothing)", () => {
    for (const n of ["headerRow", "orgName", "verifiedPill", "unverifiedPill", "verifiedHero", "banner", "statRow", "statCard", "footCard", "volunteerTitle"]) {
      expect(body(dash, n)).not.toBeNull();
    }
  });
  it("reads the large-text flag", () => {
    expect(dash).toMatch(/const large = useLargeText\(\)/);
  });
  it.each(["verifiedPill", "unverifiedPill"])("%s uses minHeight 34 + padding, not a fixed height", (n) => {
    const b = body(dash, n) as string;
    expect(b).toMatch(/minHeight\s*:\s*34/);
    expect(b).toMatch(/paddingVertical\s*:/);
    expect(b).not.toMatch(fixedHeight);
  });
  it("the header row stacks when large (name, then pill, then bell) with the base flex cancelled, and the name is capped", () => {
    expect(dash).toMatch(/styles\.headerRow,\s*large && styles\.headerRowLarge/);
    const r = body(dash, "headerRowLarge") as string;
    expect(r).toMatch(/flexDirection\s*:\s*"column"/);
    expect(r).toMatch(/alignItems\s*:\s*"flex-start"/);
    expect(dash).toMatch(/styles\.orgName,\s*large && styles\.orgNameLarge/);
    const o = body(dash, "orgNameLarge") as string;
    expect(o).toMatch(/flexGrow\s*:\s*0/);
    expect(o).toMatch(/flexBasis\s*:\s*"auto"/);
    expect(o).toMatch(/alignSelf\s*:\s*"stretch"/);
    expect(o).not.toMatch(/\bflex\s*:\s*1/);
    expect(hasTitleCap(dash, "orgName")).toBe(true);
    expect(importsCap(dash)).toBe(true);
  });
  it("the verified hero stacks when large; its title is capped", () => {
    expect(dash).toMatch(/styles\.verifiedHero,\s*large && styles\.stackLarge/);
    expect(dash).toMatch(/styles\.bannerCopy,\s*large && styles\.bannerCopyLarge/);
    expectStackedCopy(dash, "bannerCopyLarge");
    expect(body(dash, "stackLarge") as string).toMatch(/flexDirection\s*:\s*"column"/);
    expect(hasTitleCap(dash, "verifiedHeroTitle")).toBe(true);
  });
  it("the under-review banner and the foot card stack when large", () => {
    expect(dash).toMatch(/styles\.banner,\s*large && styles\.stackLarge/);
    expect(dash).toMatch(/styles\.footCard,\s*large && styles\.stackLarge/);
    expect(dash).toMatch(/styles\.footCopy,\s*large && styles\.footCopyLarge/);
    expectStackedCopy(dash, "footCopyLarge");
    expect(hasTitleCap(dash, "bannerTitle")).toBe(true);
  });
  it("the stat tiles are a column of full-width tiles when large, and grow with their text", () => {
    expect(dash).toMatch(/styles\.statRow,\s*large && styles\.statRowLarge/);
    expect(body(dash, "statRowLarge") as string).toMatch(/flexDirection\s*:\s*"column"/);
    expect(dash).toMatch(/styles\.statCard,\s*large && styles\.statCardLarge/);
    const t = body(dash, "statCardLarge") as string;
    expect(t).toMatch(/width\s*:\s*"100%"/);
    expect(t).toMatch(/marginTop\s*:/);
    const base = body(dash, "statCard") as string;
    expect(base).toMatch(/minHeight\s*:\s*104/);
    expect(base).not.toMatch(fixedHeight);
  });
  it("the card titles are capped", () => {
    const tags = [...dash.matchAll(/<Text\b[^>]*style=\{styles\.volunteerTitle\}[^>]*>/gs)].map((m) => m[0]);
    expect(tags.length).toBe(3);   // Volunteers, Rescue and (wishlist refactor Task 8) Wishlist
    for (const t of tags) expect(t).toMatch(/maxFontSizeMultiplier=\{maxFontScale\.title\}/);
  });
});

describe("Requests", () => {
  it("the page title is capped (it broke as 'Request / s')", () => {
    expect(hasTitleCap(requests, "pageTitle")).toBe(true);
    expect(importsCap(requests)).toBe(true);
  });
  it("a row stacks when large, with its text wrapping and its chip under it", () => {
    expect(requests).toMatch(/const large = useLargeText\(\)/);
    expect(requests).toMatch(/styles\.row,\s*large && styles\.rowLarge/);
    expect(body(requests, "rowLarge") as string).toMatch(/flexDirection\s*:\s*"column"/);
    expect(body(requests, "rowLarge") as string).toMatch(/alignItems\s*:\s*"flex-start"/);
    expect(requests).toMatch(/styles\.rowCopy,\s*large && styles\.rowCopyLarge/);
    expectStackedCopy(requests, "rowCopyLarge");
    expect((requests.match(/numberOfLines=\{large \? 3 : 1\}/g) ?? []).length).toBe(2);
  });
});

describe("Animals and My listings (ListingsByStatus)", () => {
  it("the Animals page title is capped", () => {
    expect(hasTitleCap(animals, "pageTitle")).toBe(true);
    expect(importsCap(animals)).toBe(true);
  });
  it("a listing row stacks when large (photo, text, chip), with its text wrapping", () => {
    expect(byStatus).toMatch(/const large = useLargeText\(\)/);
    expect(byStatus).toMatch(/styles\.row,\s*large && styles\.rowLarge/);
    expect(body(byStatus, "rowLarge") as string).toMatch(/flexDirection\s*:\s*"column"/);
    expect(byStatus).toMatch(/styles\.rowCopy,\s*large && styles\.rowCopyLarge/);
    expectStackedCopy(byStatus, "rowCopyLarge");
    expect((byStatus.match(/numberOfLines=\{large \? 3 : 1\}/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });
  it("a draft row stacks when large (name, then its chip), so the name is not squeezed to '1623…'", () => {
    expect(byStatus).toMatch(/styles\.draftRow,\s*large && styles\.draftRowLarge/);
    const r = body(byStatus, "draftRowLarge") as string;
    expect(r).toMatch(/flexDirection\s*:\s*"column"/);
    expect(r).toMatch(/alignItems\s*:\s*"flex-start"/);
    expect(byStatus).toMatch(/styles\.draftName,\s*large && styles\.draftNameLarge/);
    const n = body(byStatus, "draftNameLarge") as string;
    expect(n).toMatch(/alignSelf\s*:\s*"stretch"/);
    expect(n).not.toMatch(/\bflex\s*:\s*1/);
    expect(n).toMatch(/flexGrow\s*:\s*0/);
    expect(n).toMatch(/flexBasis\s*:\s*"auto"/);
  });
});

describe("the shelter tab bar", () => {
  it("the peso glyph does not scale (a text glyph in a fixed tab bar)", () => {
    const tag = /<Text\b[^>]*style=\{\[styles\.symbolIcon[^>]*>/s.exec(tabs);
    expect(tag).not.toBeNull();
    expect((tag as RegExpExecArray)[0]).toMatch(/allowFontScaling=\{false\}/);
  });
});
