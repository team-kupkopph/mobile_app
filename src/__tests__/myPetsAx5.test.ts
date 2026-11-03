/**
 * My Pets test plan NT-13 / NT-14 (Run 4, the AX5 walk on a simulator): "Sir Bartholomew Fluffington of Marikina" broke mid-word
 * twice. On My pets the card kept its 62 pt thumbnail beside the text, so the name had a narrow column ("Barthol / omew"); on the pet
 * screen one long word at the title's full Dynamic Type size was wider than the card ("Fluffingto / n").
 *
 * The fixes are the app's two existing patterns: the card stacks at AX3+ (`useLargeText`, as MyRescuesScreen), and both names take
 * the title cap (`maxFontScale.title`, as cityNameCapAx5.test.ts). A source scan; the device walk is the proof.
 */
import { readFileSync } from "fs";
import { join } from "path";

const read = (file: string) => readFileSync(join(__dirname, "..", "screens", file), "utf-8");

describe("My pets at AX5 (NT-13)", () => {
  const src = read("MyPetsScreen.tsx");

  it("stacks the pet card at large text so the name gets the full width", () => {
    expect(src).toMatch(/const large = useLargeText\(\)/);
    expect(src).toMatch(/style=\{\[styles\.petRow, large && styles\.petRowLarge\]\}/);
    expect(src).toMatch(/style=\{large \? styles\.petTextLarge : styles\.petText\}/);
  });

  it("caps the pet name like every other title", () => {
    expect(src).toMatch(/styles\.petName\}[^>]*maxFontSizeMultiplier=\{maxFontScale\.title\}/);
  });
});

describe("The pet screen at AX5 (NT-14)", () => {
  it("caps the hero title like every other title", () => {
    const src = read("PetDetailScreen.tsx");
    expect(src).toMatch(/styles\.title\}[^>]*maxFontSizeMultiplier=\{maxFontScale\.title\}/);
    expect(src).toMatch(/import \{[^}]*maxFontScale[^}]*\} from "\.\.\/theme"/);
  });
});
