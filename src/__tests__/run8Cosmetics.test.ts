import { readFileSync } from "fs";
import { join } from "path";

const read = (rel: string) => readFileSync(join(__dirname, "..", rel), "utf8");

describe("the 'W' initial tile at AX5 (Run 8, R8-F6)", () => {
  it("the glyph's text scale is capped, since its 56 pt tile cannot grow", () => {
    const by = read("components/ListingsByStatus.tsx");
    expect(by).toMatch(/<Text style=\{styles\.photoGlyph\} maxFontSizeMultiplier=\{1\.2\}>/);
  });
});

describe("the photo strip's 'Main photo' / 'Make main' labels (Run 8, R8-F7)", () => {
  const form = read("screens/ListingFormScreen.tsx");
  it("'Main photo' sits in the same 44 pt centred slot as 'Make main', not offset by its own margin", () => {
    expect(form).toMatch(/<View style=\{styles\.photoAct\}>\s*<Text style=\{styles\.mainTag\}>Main photo<\/Text>\s*<\/View>/);
    const tag = /mainTag: \{[^}]*\}/.exec(form)?.[0] ?? "";
    expect(tag).toContain("color");                  // the scan found the style
    expect(tag).not.toMatch(/marginTop|minHeight/);
  });
});
