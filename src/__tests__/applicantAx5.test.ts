/**
 * R6-F4 · AX-1 — At Dynamic Type accessibility-extra-extra-extra-large (AX5) the Applicant
 * screen still broke after R6-F3 fixed the Button: the applicant's name was cut to "Run1 A…",
 * the phone number broke mid-number ("+63917 / 555100 / 1"), the "Step 2 of 6" and "Verified
 * Member" chips were clipped, and step titles broke mid-word ("bac / kgro / und / che / ck").
 * Observed on the simulator on 2026-10-11, Run 6 part 3.
 *
 * Two causes. (1) The shared `Chip` gave itself a fixed `height` and a one-line label, the same
 * shape as the Button's R6-F3. (2) `ApplicantScreen` laid the identity row, the contact row, the
 * steps header and every step row out as a single non-wrapping row with a `flex: 1` column,
 * and the name and contact name were limited to one line.
 *
 * The screen's row changes apply only at a large font scale, so default-size layouts are
 * untouched. A source scan in the style of buttonDynamicType.test.ts: it pins the invariants
 * so the fix can be confirmed without a device walk. The device walk is still the proof.
 */
import { readFileSync } from "fs";
import { join } from "path";

const read = (...p: string[]) => readFileSync(join(__dirname, "..", ...p), "utf-8");
const chip = read("components", "ui", "Chip.tsx");
const screen = read("screens", "ApplicantScreen.tsx");

/** The body of a `name: { ... }` StyleSheet entry in `src`, or null. Matches the whole key. */
function styleBody(src: string, name: string): string | null {
  const m = new RegExp(`(?:^|\\s)${name}\\s*:\\s*\\{([^{}]*)\\}`, "m").exec(src);
  return m ? m[1] : null;
}
const textTag = (src: string, style: string): string | null => {
  const m = new RegExp(`<Text style=\\{styles\\.${style}\\}[^>]*>`).exec(src);
  return m ? m[0] : null;
};

describe("Chip grows with its label at large Dynamic Type (R6-F4)", () => {
  it("the scan found what it is scanning", () => {
    expect(styleBody(chip, "chip")).toContain("alignSelf");
    expect(chip).toContain("<Text style={[styles.label");
  });
  it("has a minHeight and no fixed height", () => {
    const body = styleBody(chip, "chip") as string;
    expect(body).not.toMatch(/\bheight\s*:/);
    expect(body).toMatch(/\bminHeight\s*:\s*HEIGHT\b/);
  });
  it("the label is not limited to one line", () => {
    const label = /<Text style=\{\[styles\.label[^>]*>/.exec(chip);
    expect(label).not.toBeNull();
    expect((label as RegExpExecArray)[0]).not.toMatch(/numberOfLines/);
  });
});

describe("the Applicant screen holds together at AX5 (R6-F4)", () => {
  it("the scan found what it is scanning", () => {
    expect(textTag(screen, "name")).not.toBeNull();
    expect(textTag(screen, "contactName")).not.toBeNull();
    expect(screen).toContain("styles.phone");
    expect(styleBody(screen, "personRow")).toContain("flexDirection");
    expect(styleBody(screen, "stepRow")).toContain("minHeight");
  });

  it("neither the applicant's name nor the contact name is limited to one line", () => {
    expect(textTag(screen, "name")).not.toMatch(/numberOfLines/);
    expect(textTag(screen, "contactName")).not.toMatch(/numberOfLines/);
  });

  it("the phone number is one line that shrinks to fit rather than breaking mid-number", () => {
    const tag = textTag(screen, "phone") as string;
    expect(tag).toMatch(/numberOfLines=\{1\}/);
    expect(tag).toMatch(/adjustsFontSizeToFit/);
    expect(tag).toMatch(/minimumFontScale=/);
  });

  it("reads the font scale, and only changes the rows when it is large", () => {
    expect(screen).toMatch(/useWindowDimensions/);
    expect(screen).toMatch(/\bfontScale\b/);
    expect(screen).toMatch(/const\s+large\s*=/);
    for (const row of ["personRow", "contactRow", "stepsHead"]) {
      expect(screen).toContain(`[styles.${row}, large && styles.${row}Large]`);
      expect(styleBody(screen, `${row}Large`)).toMatch(/flexWrap\s*:\s*"wrap"/);
    }
  });

  it("a step's title and meta stack in a column at large size, so the title gets the whole width", () => {
    // Tried first: a flexBasis floor on the title inside a wrapping row. On the device the title
    // just shrank to share the line and "Application" broke as "App / licat / ion".
    expect(screen).toContain("[styles.stepText, large && styles.stepTextLarge]");
    expect(styleBody(screen, "stepText")).toMatch(/flexDirection\s*:\s*"row"/);
    expect(styleBody(screen, "stepTextLarge")).toMatch(/flexDirection\s*:\s*"column"/);
    expect(screen).toContain("[styles.stepTitle, large && styles.stepTitleLarge]");
    // in a column, `flex: 1` would size the title's height; it must size to its text instead
    expect(styleBody(screen, "stepTitleLarge")).toMatch(/flexGrow\s*:\s*0/);
    expect(styleBody(screen, "stepTitleLarge")).toMatch(/flexBasis\s*:\s*"auto"/);
  });

  it("the identity text keeps a floor of its own width so the chip wraps below it", () => {
    expect(screen).toContain("[styles.personText, large && styles.personTextLarge]");
    expect(styleBody(screen, "personTextLarge")).toMatch(/flexBasis\s*:\s*\d+/);
  });
});
