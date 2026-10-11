/**
 * R6-F6 · AX-1 — At Dynamic Type accessibility-extra-extra-extra-large (AX5) the Welcome screen's
 * "Google" and "Apple" buttons clipped their labels vertically (Run 6 part 4, seen in passing).
 * `SocialSignIn`'s pill had a fixed `height: 52`, so a label scaled past 52 pt was cut by the
 * pill's own shape. Same shape as the Button's R6-F3 and the Chip's R6-F4. The component is shared
 * with Log in, so one fix covers both screens.
 *
 * A source scan in the style of buttonDynamicType.test.ts; the device walk is still the proof.
 */
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(__dirname, "..", "components", "ui", "SocialSignIn.tsx"), "utf-8");

/** The body of a `name: { ... }` StyleSheet entry, or null. Matches the whole key. */
function styleBody(name: string): string | null {
  const m = new RegExp(`(?:^|\\s)${name}\\s*:\\s*\\{([^{}]*)\\}`, "m").exec(src);
  return m ? m[1] : null;
}

describe("the social sign-in pills grow with their label at large Dynamic Type (R6-F6)", () => {
  it("the scan found what it is scanning (a guard that matches nothing proves nothing)", () => {
    expect(styleBody("pill")).toContain("borderRadius");
    expect(styleBody("label")).toContain("fontWeight");
    expect(src).toContain("<Text style={styles.label}>");
  });

  it("the pill has a minHeight and no fixed height", () => {
    const body = styleBody("pill") as string;
    expect(body).not.toMatch(/\bheight\s*:/);
    expect(body).toMatch(/\bminHeight\s*:\s*HEIGHT\b/);
  });

  it("the pill keeps its label off the edge once it grows", () => {
    expect(styleBody("pill")).toMatch(/\bpaddingVertical\s*:\s*\d+/);
    expect(styleBody("pill")).toMatch(/\bpaddingHorizontal\s*:\s*\d+/);
  });

  it("the label is not limited to one line", () => {
    const tag = /<Text style=\{styles\.label\}[^>]*>/.exec(src);
    expect(tag).not.toBeNull();
    expect((tag as RegExpExecArray)[0]).not.toMatch(/numberOfLines/);
  });

  it("the pill's rounded shape follows its minimum height, not a fixed one", () => {
    expect(styleBody("pill")).toMatch(/borderRadius\s*:\s*pill\(HEIGHT\)/);
  });
});

describe("at a large font scale the pills stack, so a label is not broken mid-word (R6-F6)", () => {
  // Tried first: minHeight alone. On the device the clipping went, but two half-width pills could
  // not hold "Google" beside its mark at AX5: it broke as "Googl / e" and the mark sat on the edge.
  it("reads the font scale and only changes the row when it is large", () => {
    expect(src).toMatch(/useWindowDimensions/);
    expect(src).toMatch(/\bfontScale\b/);
    expect(src).toMatch(/const\s+large\s*=/);
    expect(src).toContain("[styles.row, large && styles.rowLarge]");
    expect(src).toContain("[styles.pill, large && styles.pillLarge]");
  });
  it("the large row is a column", () => {
    expect(styleBody("rowLarge")).toMatch(/flexDirection\s*:\s*"column"/);
  });
  it("a large pill sizes to its content: no flexBasis 0 in a column, which would collapse it to the minHeight", () => {
    expect(styleBody("pillLarge")).toMatch(/flexBasis\s*:\s*"auto"/);
    expect(styleBody("pillLarge")).toMatch(/flexGrow\s*:\s*0/);
  });
});
