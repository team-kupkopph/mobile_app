/**
 * R6-F10 · AX-1 — At Dynamic Type AX5 the auth screens' hero headings and the account-type / shelter-tier
 * card titles broke in the middle of a word: "Forgot your passwor / d?", "Registe / red NGO", "Shelter / Organi /
 * zation" (Run 6 part 8). The hero step is 25 pt and the section step 19 pt, and iOS scales them about 3x at AX5,
 * so one word ("password?") comes out wider than the screen, and a card's narrow text column cannot hold
 * "Registered". React Native has nowhere to wrap but inside the word.
 *
 * Titles are capped (`maxFontScale.title`), as the app already caps Welcome's brand text (1.3) and the
 * SegmentedControl (1.5): a title still grows with the user's setting, but not past the width of a word.
 * The body copy under it keeps scaling fully, so the heading stays the heading.
 *
 * Two parts: the constant, and a scan of every screen that uses the shared auth kit for any Text styled with the
 * hero or section step, so a new screen cannot skip the cap. A source scan in the style of
 * buttonDynamicType.test.ts; the device walk is still the proof.
 */
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { maxFontScale } from "../theme";

const SCREENS = join(__dirname, "..", "screens");
const read = (f: string) => readFileSync(join(SCREENS, f), "utf-8");

describe("maxFontScale.title (R6-F10)", () => {
  it("is a multiplier that still lets a title grow, but not to the screen's width", () => {
    expect(maxFontScale.title).toBeGreaterThanOrEqual(1.5);
    expect(maxFontScale.title).toBeLessThanOrEqual(2.2);
  });
  it("is high enough that a card title is not smaller than the copy under it (Run 6 part 9)", () => {
    // Tried first at 1.8: "Organization" fitted the card's narrow text column, but the 19 pt title then
    // scaled to about 34 pt while the 13 pt description under it scaled to about 40 pt, inverting the hierarchy.
    // The stacked layout below gives the title the card's full width, so the cap can be this high.
    expect(maxFontScale.title).toBeGreaterThanOrEqual(2.1);
  });
});

/** The names of StyleSheet entries whose body uses the hero or section ramp step. */
function titleStyles(src: string): string[] {
  const out: string[] = [];
  for (const m of src.matchAll(/(?:^|\n)\s*(\w+)\s*:\s*\{([^{}]*)\}/g)) {
    if (/typography\.(hero|section)\b/.test(m[2])) out.push(m[1]);
  }
  return out;
}

const files = readdirSync(SCREENS)
  .filter((f) => f.endsWith(".tsx") && f !== "AuthFormKit.tsx")
  .filter((f) => /<SimpleHeader\b|from "\.\/AuthFormKit"/.test(read(f)));

describe("every title in the auth screens is capped (R6-F10)", () => {
  const sites: Array<{ file: string; style: string; tag: string }> = [];
  for (const file of files) {
    const src = read(file);
    for (const style of titleStyles(src)) {
      for (const m of src.matchAll(new RegExp(`<Text\\b[^>]*style=\\{styles\\.${style}\\}[^>]*>`, "gs"))) {
        sites.push({ file, style, tag: m[0] });
      }
    }
  }

  it("the scan found the titles (a guard that matches nothing proves nothing)", () => {
    expect(files.length).toBeGreaterThanOrEqual(17);
    expect(sites.length).toBeGreaterThanOrEqual(15);
    const have = new Set(sites.map((s) => s.file));
    for (const f of ["ForgotPasswordScreen.tsx", "AccountTypeScreen.tsx", "ShelterTierScreen.tsx", "SignupScreen.tsx"]) {
      expect(have).toContain(f);
    }
  });

  it("each carries maxFontSizeMultiplier={maxFontScale.title}", () => {
    const missing = sites.filter((s) => !/maxFontSizeMultiplier=\{maxFontScale\.title\}/.test(s.tag));
    expect(missing.map((s) => `${s.file}:${s.style}`)).toEqual([]);
  });

  it("each of those files imports maxFontScale", () => {
    for (const f of new Set(sites.map((s) => s.file))) {
      expect(read(f)).toMatch(/import\s*\{[^}]*\bmaxFontScale\b[^}]*\}\s*from\s*"\.\.\/theme"/s);
    }
  });
});

describe("the account-type and shelter-tier cards stack at a large font scale (R6-F10)", () => {
  const SCREENS_WITH_CARDS = ["AccountTypeScreen.tsx", "ShelterTierScreen.tsx"];
  const body = (src: string, name: string) => {
    const m = new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*\\{([^{}]*)\\}`).exec(src);
    return m ? m[1] : null;
  };

  it.each(SCREENS_WITH_CARDS)("%s reads the font scale and stacks its cards when large", (f) => {
    const src = read(f);
    expect(src).toMatch(/useWindowDimensions/);
    expect(src).toMatch(/const\s+large\s*=\s*fontScale\s*>\s*1\.5/);
    expect(src).toMatch(/styles\.card,[^\]]*large && styles\.cardLarge/);
    expect(body(src, "cardLarge")).toMatch(/flexDirection\s*:\s*"column"/);
    expect(body(src, "cardLarge")).toMatch(/alignItems\s*:\s*"flex-start"/);
  });

  it.each(SCREENS_WITH_CARDS)("%s gives the stacked text the card's full width, not a share of a row", (f) => {
    const src = read(f);
    expect(src).toContain("[styles.copy, large && styles.copyLarge]");
    const copyLarge = body(src, "copyLarge") as string;
    expect(copyLarge).toMatch(/marginLeft\s*:\s*0/);
    expect(copyLarge).toMatch(/alignSelf\s*:\s*"stretch"/);
    expect(copyLarge).not.toMatch(/\bflex\s*:\s*1/);
    // the base `copy` style is `flex: 1`, which survives in a style array: in a column it would collapse the
    // text to zero height, so the large style must cancel it
    expect(copyLarge).toMatch(/flexGrow\s*:\s*0/);
    expect(copyLarge).toMatch(/flexBasis\s*:\s*"auto"/);
  });
});

describe("the shared header's title is capped too (R6-F10)", () => {
  // Found on the device once the page headings were fixed: the header title (#178 let it wrap to three lines)
  // still scaled to the full AX5 size, so "Forgot password" broke as "Forgot / passwor / d" beside the 44 pt back
  // button. Same cause, same cap. The header title is 17 pt (subtitle step), so 2.2 is about 37 pt, which fits.
  const header = readFileSync(join(__dirname, "..", "components", "ui", "ScreenHeader.tsx"), "utf-8");
  it("imports maxFontScale and puts it on the title Text", () => {
    expect(header).toMatch(/import\s*\{[^}]*\bmaxFontScale\b[^}]*\}\s*from\s*"\.\.\/\.\.\/theme"/s);
    const tag = (/<Text\b[^>]*accessibilityRole="header"[^>]*>/s.exec(header) as RegExpExecArray)[0];
    expect(tag).toMatch(/maxFontSizeMultiplier=\{maxFontScale\.title\}/);
  });
});
