/**
 * R6-F14 · AX-1 — The shelter document rows ("Get verified", and the NGO papers step) are icon | text | action in
 * a row. At Dynamic Type AX5 the text column is a sliver beside the 48 pt icon and the "Upload" link: "Government ID"
 * broke as "Gove / rnme / nt ID", "Required" as "Require / d", and a later row's title ran a letter or two a line (Run 6
 * part 10 walk; the NGO papers screen was not walked, but it carries a copy of the same `DocSlot`).
 *
 * Same fix as the sign-up success rows (R6-F12, #182) and the account-type cards (R6-F10, #179): at
 * `fontScale > 1.5` the row stacks (icon, then text, then the action) so the title gets the card's full width. The
 * base `docCopy` is `flex: 1`, which survives in a style array and would collapse the text in a column, so the large
 * style cancels it. Default-size layout is unchanged: the large styles apply only above 1.5.
 *
 * A source scan in the style of signupSuccessAx5.test.ts; the device walk is the proof.
 */
import { readFileSync } from "fs";
import { join } from "path";

const FILES = ["ShelterVerifyScreen.tsx", "ShelterVerifyNgoScreen.tsx"];
const read = (f: string) => readFileSync(join(__dirname, "..", "screens", f), "utf-8");
const body = (src: string, name: string) => {
  const m = new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*\\{([^{}]*)\\}`).exec(src);
  return m ? m[1] : null;
};

describe.each(FILES)("%s: the document rows stack at a large font scale (R6-F14)", (f) => {
  const src = read(f);

  it("the scan found DocSlot and its styles (a guard that matches nothing proves nothing)", () => {
    expect(src).toMatch(/function DocSlot\(/);
    expect(body(src, "docCard")).not.toBeNull();
    expect(body(src, "docCopy")).not.toBeNull();
  });

  it("DocSlot reads the font scale", () => {
    expect(src).toMatch(/useWindowDimensions/);
    expect(src).toMatch(/const\s+large\s*=\s*fontScale\s*>\s*1\.5/);
  });

  it("the card becomes a column when large", () => {
    expect(src).toMatch(/styles\.docCard,\s*large && styles\.docCardLarge/);
    const b = body(src, "docCardLarge") as string;
    expect(b).toMatch(/flexDirection\s*:\s*"column"/);
    expect(b).toMatch(/alignItems\s*:\s*"flex-start"/);
  });

  it("the text gets the card's full width, not a share of a row", () => {
    expect(src).toMatch(/styles\.docCopy,\s*large && styles\.docCopyLarge/);
    const b = body(src, "docCopyLarge") as string;
    expect(b).toMatch(/marginLeft\s*:\s*0/);
    expect(b).toMatch(/alignSelf\s*:\s*"stretch"/);
    expect(b).not.toMatch(/\bflex\s*:\s*1/);
    // the base `docCopy` is `flex: 1`, which survives in a style array: in a column it collapses the text to
    // zero height, so the large style must cancel it (the same trap as #179 and #182)
    expect(b).toMatch(/flexGrow\s*:\s*0/);
    expect(b).toMatch(/flexBasis\s*:\s*"auto"/);
  });

  it("the action (Upload / Done) sits under the text when large", () => {
    const b = body(src, "docActionLarge") as string;
    expect(b).toMatch(/marginTop\s*:/);
    expect(src).toMatch(/styles\.docUploadLink,\s*large && styles\.docActionLarge/);
    expect(src).toMatch(/styles\.docDone,\s*large && styles\.docActionLarge/);
  });
});
