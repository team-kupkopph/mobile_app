/**
 * R3-F1 (wishlist Run 3) · A single-line Field whose value is wider than the box showed only the words that fit on the
 * first line and then nothing — "R2" of "R2 Deworming tablets" at AX5, "…puppies in the" of a long title at default
 * size — not the usual text cut at the edge. React Native applies the input's `lineHeight` (kept for R9-F2, see
 * fieldPlaceholderAx5.test.ts) as an iOS paragraph style, whose line-break mode is word wrapping, so a one-line field
 * drew a wrapped first line. `lineBreakModeIOS="tail"` restores what a native field does: the text runs to the edge and
 * ends in "…". Multiline fields still wrap.
 *
 * A source scan; the simulator walk (default size and AX5, with a long title) is the proof.
 */
import { readFileSync } from "fs";
import { join } from "path";

const field = readFileSync(join(__dirname, "..", "components", "ui", "Field.tsx"), "utf8");
const input = /<TextInput[\s\S]*?\/>/.exec(field)?.[0] ?? "";

describe("Field's single-line value is cut at the edge, not after the last whole word (R3-F1)", () => {
  it("the scan found the TextInput (a guard that matches nothing proves nothing)", () => {
    expect(input).toMatch(/value=\{value\}/);
  });
  it("a single-line input truncates its tail; a multiline one keeps wrapping", () => {
    expect(input).toMatch(/lineBreakModeIOS=\{input\.multiline \? undefined : "tail"\}/);
  });
  it("keeps R9-F2's explicit lineHeight, which the placeholder needs at AX5", () => {
    expect(/\n  input: \{([^}]*)\}/.exec(field)?.[1] ?? "").toMatch(/lineHeight\s*:\s*\d+/);
  });
});
