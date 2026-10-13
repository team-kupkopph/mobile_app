/**
 * The volunteer's Kawang-Gawa list (Browse / Calendar) at AX5 (seen on `main` at `4dfa81e`, owner persona): the title is an uncapped `hero`; the "All cities | Set your city ›" scope row
 * runs off the screen; the filter chips are a fixed `height: 44`; each shift card is an icon | `flex: 1` copy row whose title row (a `numberOfLines={1}` title beside the slots chip) leaves the
 * title a few letters; in the calendar the day cells are a fixed `height: 52` with the day number in a fixed 30 pt circle.
 *
 * The same fixes as the rest of the AX5 work, above `fontScale > 1.5` only: the card stacks (icon above copy), cancelling the surviving `flex: 1` with `flex: 0` (#189), its title row wraps and the title is
 * not truncated; the scope row wraps; chips and calendar cells take `minHeight` + padding; the title is capped; a day number in its fixed circle does not scale. Default-size layout is unchanged.
 *
 * A source scan in the style of homeAx5.test.ts; the device walk is the proof. Written in the same step as its fix (never seen red).
 */
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(__dirname, "..", "screens", "KawangGawaScreen.tsx"), "utf-8");
const sheet = (name: "styles" | "calStyles") => {
  const m = new RegExp(`const ${name} = StyleSheet\\.create\\(\\{([\\s\\S]*?)\\n\\}\\);`).exec(src);
  return m ? m[1] : "";
};
const body = (which: "styles" | "calStyles", name: string) => {
  const m = new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*\\{([\\s\\S]*?)\\}\\s*(?:,|\\n)`).exec(sheet(which));
  return m ? m[1] : null;
};
const fixedHeight = /(^|[^a-zA-Z])height\s*:/;

test("the scan found both stylesheets", () => {
  expect(sheet("styles").length).toBeGreaterThan(500);
  expect(sheet("calStyles").length).toBeGreaterThan(500);
});

describe.each(["styles", "calStyles"] as const)("%s cards", (which) => {
  test("stack at large text and cancel the surviving flex: 1", () => {
    const row = body(which, "cardLarge") as string;
    expect(row).toMatch(/flexDirection\s*:\s*"column"/);
    expect(row).toMatch(/alignItems\s*:\s*"flex-start"/);
    const c = body(which, "cardCopyLarge") as string;
    expect(c).toMatch(/\bflex\s*:\s*0\b/);
    expect(c).toMatch(/alignSelf\s*:\s*"stretch"/);
    expect(c).toMatch(/flexGrow\s*:\s*0/);
    expect(c).toMatch(/flexBasis\s*:\s*"auto"/);
    expect(body(which, "cardTop")).toMatch(/flexWrap\s*:\s*"wrap"/);
  });
});

test("both card uses read the flag and the titles are not one line at large text", () => {
  expect(src).toMatch(/useLargeText\(\)/);
  expect((src.match(/\[(?:styles|calStyles)\.card, large && (?:styles|calStyles)\.cardLarge\]/g) ?? []).length).toBe(2);
  expect((src.match(/numberOfLines=\{large \? undefined : 1\}/g) ?? []).length).toBe(2);
});

test("the title is capped, the scope row wraps, chips and cells grow", () => {
  expect(src).toMatch(/styles\.title\}[^>]*maxFontSizeMultiplier=\{maxFontScale\.title\}/);
  expect(body("styles", "scopeRow")).toMatch(/flexWrap\s*:\s*"wrap"/);
  for (const [w, n] of [["styles", "filterChip"], ["styles", "emptyAction"], ["calStyles", "cell"]] as const) {
    const b = body(w, n) as string;
    expect(b).not.toMatch(fixedHeight);
    expect(b).toMatch(/minHeight\s*:/);
  }
  expect(src).toMatch(/calStyles\.dayText[^>]*\][^>]*allowFontScaling=\{false\}|allowFontScaling=\{false\}[\s\S]{0,200}calStyles\.dayText/);
});
