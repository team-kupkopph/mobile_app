/**
 * R9-F2 / R10-F2 · At Dynamic Type AX5 a Field's placeholder sometimes drew at the unscaled size and sat at the
 * bottom of its box, while the typed text of the same field was normal. Which field it hit changed between launches
 * (Name in one walk, Breed in every later one), the input's frame was the same each time (73 pt from the layout
 * hierarchy), and a `minHeight` did nothing. Giving the input an explicit `lineHeight` made the placeholder draw
 * like the text on 6 of 6 cold launches (it had been wrong on every recent one).
 *
 * A source scan; the device walk is the proof, and the cause inside the native text input was not found.
 */
import { readFileSync } from "fs";
import { join } from "path";

const field = readFileSync(join(__dirname, "..", "components", "ui", "Field.tsx"), "utf8");
const inputStyle = /\n  input: \{([^}]*)\}/.exec(field)?.[1] ?? "";

describe("Field's input style (R9-F2)", () => {
  it("the scan found the style (a guard that matches nothing proves nothing)", () => {
    expect(inputStyle).toMatch(/\.\.\.typography\.subtitle/);
  });
  it("sets an explicit lineHeight, which the placeholder follows", () => {
    expect(inputStyle).toMatch(/lineHeight\s*:\s*\d+/);
  });
});
