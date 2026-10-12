/**
 * The shelter "You" (profile) screen at AX5 (seen on `main` at `e252cca`, Run 6 parts 11 and 12): the avatar's glyph outgrew its
 * 96 pt tile and was cropped to half a shape; the org name and chip were oversized; the three stat tiles were crushed in a row at a
 * fixed `height: 100`; and the Organization / Account rows put label | value | chevron on one line.
 *
 * Same fixes as the rest of the AX5 work: a text glyph in a fixed shape does not scale (R6-F5); titles are capped (R6-F10); tiles take
 * `minHeight` + padding and become full-width tiles at `fontScale > 1.5` (the shelter dashboard, #187); a row stacks (label, then value)
 * at large. Default-size layout is unchanged: every large style applies only above 1.5.
 *
 * A source scan in the style of shelterShellAx5.test.ts; the device walk is the proof.
 */
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(__dirname, "..", "screens", "ShelterProfileScreen.tsx"), "utf-8");
const body = (name: string) => {
  const m = new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*\\{([^{}]*)\\}`).exec(src);
  return m ? m[1] : null;
};
const fixedHeight = /(^|[^a-zA-Z])height\s*:/;
const tag = (style: string) => {
  const m = new RegExp(`<Text\\b[^>]*style=\\{(?:\\[)?styles\\.${style}\\b[^>]*>`, "s").exec(src);
  return m ? m[0] : null;
};

describe("shelter profile at a large font scale", () => {
  it("the scan found the styles (a guard that matches nothing proves nothing)", () => {
    for (const n of ["pageTitle", "avatar", "avatarGlyph", "orgName", "statRow", "statCard", "row", "chev"]) {
      expect(body(n)).not.toBeNull();
    }
  });

  it("the avatar's glyph does not scale (a text glyph in a fixed 96 pt tile, R6-F5)", () => {
    expect(tag("avatarGlyph")).toMatch(/allowFontScaling=\{false\}/);
  });

  it("the page title and the org name are capped", () => {
    expect(tag("pageTitle")).toMatch(/maxFontSizeMultiplier=\{maxFontScale\.title\}/);
    expect(tag("orgName")).toMatch(/maxFontSizeMultiplier=\{maxFontScale\.title\}/);
    expect(src).toMatch(/import\s*\{[^}]*\bmaxFontScale\b[^}]*\}\s*from\s*"\.\.\/theme"/s);
  });

  it("the group titles are capped (found on the device: 'Organizatio / n')", () => {
    const tags = [...src.matchAll(/<Text\b[^>]*style=\{styles\.groupTitle\}[^>]*>/gs)].map((m) => m[0]);
    expect(tags.length).toBe(2);
    for (const t of tags) expect(t).toMatch(/maxFontSizeMultiplier=\{maxFontScale\.title\}/);
  });

  it("the chevrons do not scale", () => {
    const tags = [...src.matchAll(/<Text\b[^>]*style=\{styles\.(?:chev|accentWarnChev|accentTealChev)\}[^>]*>/gs)].map((m) => m[0]);
    expect(tags.length).toBe(3);
    for (const t of tags) expect(t).toMatch(/allowFontScaling=\{false\}/);
  });

  it("the stat tiles grow with their text and are full-width tiles when large", () => {
    const base = body("statCard") as string;
    expect(base).toMatch(/minHeight\s*:\s*100/);
    expect(base).toMatch(/paddingVertical\s*:/);
    expect(base).not.toMatch(fixedHeight);
    expect(src).toMatch(/styles\.statRow,\s*large && styles\.statRowLarge/);
    expect(body("statRowLarge") as string).toMatch(/flexDirection\s*:\s*"column"/);
    expect(src).toMatch(/styles\.statCard,\s*large && styles\.statCardLarge/);
    const t = body("statCardLarge") as string;
    expect(t).toMatch(/width\s*:\s*"100%"/);
    expect(t).toMatch(/marginTop\s*:/);
  });

  it("a Row stacks when large (label, then its value and chevron)", () => {
    // the screen (it hands `large` to Stat) and Row each read the flag
    expect((src.match(/const large = useLargeText\(\)/g) ?? []).length).toBe(2);
    expect(src).toMatch(/styles\.row,\s*!last && styles\.rowRule,\s*large && styles\.rowLarge/);
    const r = body("rowLarge") as string;
    expect(r).toMatch(/flexDirection\s*:\s*"column"/);
    expect(r).toMatch(/alignItems\s*:\s*"flex-start"/);
    expect(r).toMatch(/paddingVertical\s*:/);
  });
});
