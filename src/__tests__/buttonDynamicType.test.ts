/**
 * R6-F3 · AX-1 — At Dynamic Type accessibility-extra-extra-extra-large (AX5) the primary
 * button's label was cut off and clipped ("Reserve R5…" inside the pill), observed on the
 * Applicant screen on 2026-10-11, Run 6. The shared `Button` gave its fill a fixed `height`
 * and its label `numberOfLines={1}`, so a label that no longer fits on one line could only be
 * ellipsised and then clipped by the fixed-height fill's `overflow: "hidden"`. Every screen's
 * Button did the same.
 *
 * Same shape as dynamicType.test.ts (R4-F1): a source scan that pins the invariant, so the fix
 * can be confirmed without a device walk. The device walk is still the proof.
 */
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(__dirname, "..", "components", "ui", "Button.tsx"), "utf-8");

/** The body of a `name: { ... }` entry in the StyleSheet, or null. Matches the whole key, so
 *  `fill` does not match `smallFill`. */
function styleBody(name: string): string | null {
  const m = new RegExp(`(?:^|\\s)${name}\\s*:\\s*\\{([^{}]*)\\}`, "m").exec(src);
  return m ? m[1] : null;
}

describe("Button grows with its label at large Dynamic Type (R6-F3)", () => {
  it("the scan found what it is scanning (a guard that matches nothing proves nothing)", () => {
    expect(styleBody("fill")).toContain("alignItems");
    expect(styleBody("smallFill")).toContain("paddingHorizontal");
    expect(src).toContain("<Text style={labelStyle}");
  });

  it("the regular fill has a minHeight and no fixed height", () => {
    const body = styleBody("fill") as string;
    expect(body).not.toMatch(/\bheight\s*:/);
    expect(body).toMatch(/\bminHeight\s*:\s*HEIGHT\b/);
  });

  it("the small fill has a minHeight and no fixed height", () => {
    const body = styleBody("smallFill") as string;
    expect(body).not.toMatch(/\bheight\s*:/);
    expect(body).toMatch(/\bminHeight\s*:\s*SMALL_HEIGHT\b/);
  });

  it("the label is not limited to one line", () => {
    const label = /<Text style=\{labelStyle\}[^>]*>/.exec(src);
    expect(label).not.toBeNull();
    expect((label as RegExpExecArray)[0]).not.toMatch(/numberOfLines/);
  });

  it("the label stays centred when it wraps", () => {
    expect(src).toMatch(/textAlign\s*:\s*"center"/);
  });

  it("the highlight's 1 pt height is untouched (it is a hairline, not the button's height)", () => {
    expect(styleBody("topHighlight")).toMatch(/\bheight\s*:\s*1\b/);
  });
});
