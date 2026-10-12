/**
 * R6-F12 · AX-1 — The sign-up success screen's "Here's what you can do" rows are icon | text | "Verify" chip in a
 * row. At AX5 the text column is a sliver beside the fixed 46 pt icon tile and the chip: "Adopt a pet" broke as
 * "Adop / t a / pet", "Report & rescue strays" as "Repo / rt & / resc / ue / stray / s", the descriptions wrapped to a
 * word a line, and the "Verify" chip (a fixed `height: 28`) was clipped vertically (Run 6 part 9 walk).
 *
 * Two fixes, the same shapes the app already uses: the chip grows (`minHeight` + padding, as the pills did in
 * R6-F3/F4/F6) and, at `fontScale > 1.5`, the row stacks (icon, then text, then chip) so the title gets the card's
 * full width (as the account-type and shelter-tier cards did in R6-F10). Default-size layout is unchanged.
 *
 * A source scan in the style of titleScaleAx5.test.ts; the device walk is the proof.
 */
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(__dirname, "..", "screens", "SignupSuccessScreen.tsx"), "utf-8");
const body = (name: string) => {
  const m = new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*\\{([^{}]*)\\}`).exec(src);
  return m ? m[1] : null;
};

describe("the Verify chip grows with its text (R6-F12)", () => {
  it("the scan found the chip's style (a guard that matches nothing proves nothing)", () => {
    expect(body("verifyBadge")).not.toBeNull();
  });
  it("uses minHeight with vertical padding, not a fixed height", () => {
    const b = body("verifyBadge") as string;
    expect(b).toMatch(/minHeight\s*:\s*28/);
    expect(b).toMatch(/paddingVertical\s*:/);
    expect(b).not.toMatch(/(^|[^n])\bheight\s*:/);
  });
});

describe("the rows stack at a large font scale (R6-F12)", () => {
  it("reads the font scale", () => {
    expect(src).toMatch(/useWindowDimensions/);
    expect(src).toMatch(/const\s+large\s*=\s*fontScale\s*>\s*1\.5/);
  });
  it("the card becomes a column when large", () => {
    expect(src).toMatch(/styles\.stepCard,\s*large && styles\.stepCardLarge/);
    const b = body("stepCardLarge") as string;
    expect(b).toMatch(/flexDirection\s*:\s*"column"/);
    expect(b).toMatch(/alignItems\s*:\s*"flex-start"/);
  });
  it("the text gets the card's full width, not a share of a row", () => {
    expect(src).toMatch(/styles\.stepCopy,\s*large && styles\.stepCopyLarge/);
    const b = body("stepCopyLarge") as string;
    expect(b).toMatch(/marginLeft\s*:\s*0/);
    expect(b).toMatch(/alignSelf\s*:\s*"stretch"/);
    expect(b).not.toMatch(/\bflex\s*:\s*1/);
    // the base `stepCopy` is `flex: 1`, which survives in a style array: in a column it collapses the text to
    // zero height, so the large style must cancel it (the same trap as R6-F10's cards)
    expect(b).toMatch(/flexGrow\s*:\s*0/);
    expect(b).toMatch(/flexBasis\s*:\s*"auto"/);
  });
  it("the chip drops its row margin and sits under the text when large", () => {
    expect(src).toMatch(/styles\.verifyBadge,\s*large && styles\.verifyBadgeLarge/);
    const b = body("verifyBadgeLarge") as string;
    expect(b).toMatch(/marginLeft\s*:\s*0/);
    expect(b).toMatch(/marginTop\s*:/);
  });
});
