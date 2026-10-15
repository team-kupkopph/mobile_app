/**
 * The Adopt deck's position row ("1 of 20 near Marikina City" / "You have seen all 20" beside the Undo pill) at AX5 (seen on `main` at `fbd0eb0`, Run 6 part 21, on the end card):
 * the counter text had no `flexShrink`, so it kept its full single-line width and pushed the Undo pill off the right edge (a sliver of it showed at the screen's edge), and its
 * number sat alone on a second line. At default size the row is unchanged.
 *
 * The counter may shrink and wrap (`flexShrink: 1`); the Undo pill never shrinks (`flexShrink: 0`) and keeps a gap from the text. A source scan in the style of
 * adoptDeckAx5.test.ts; the device walk is the proof.
 */
import { readFileSync } from "fs";
import { join } from "path";

const deck = readFileSync(join(__dirname, "..", "components", "AdoptDeck.tsx"), "utf-8");
const body = (name: string) => {
  const m = new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*\\{([^{}]*)\\}`).exec(deck);
  return m ? m[1] : null;
};

describe("the deck's position row", () => {
  it("the scan found the styles (a guard that matches nothing proves nothing)", () => {
    for (const n of ["positionRow", "position", "undo"]) expect(body(n)).not.toBeNull();
  });
  it("the counter shrinks and wraps instead of pushing Undo off the row", () => {
    expect(body("position") as string).toMatch(/flexShrink\s*:\s*1/);
  });
  it("the Undo pill never shrinks and keeps a gap from the counter", () => {
    const u = body("undo") as string;
    expect(u).toMatch(/flexShrink\s*:\s*0/);
    expect(u).toMatch(/marginLeft\s*:\s*\d+/);
  });
});
