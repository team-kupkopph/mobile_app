/**
 * The need form and the Donation QR screen at AX5 (seen on `main` at `f732786`, Run 6 part 12-13): on the need form the Category chips were
 * a fixed `height: 38`, so "Food / Medicine / Supplies / Funds / Other" were clipped and overlapped each other, and the quantity stepper (a
 * fixed `height: 68` pill around 30 pt text at 3x) cut its number off; on the Donation QR screen the dashed "Add the QR image" box was a
 * fixed `height: 90` and clipped its label.
 *
 * Same fixes as the rest of the AX5 work: `minHeight` + padding instead of a fixed `height` (R6-F3/F4/F6); a glyph in a fixed shape does not
 * scale (R6-F5); a number in a fixed pill is capped (`maxFontScale.code`, R6-F11). Default-size layout is unchanged.
 *
 * A source scan in the style of shelterShellAx5.test.ts; the device walk is the proof.
 */
import { readFileSync } from "fs";
import { join } from "path";

const src = (f: string) => readFileSync(join(__dirname, "..", "screens", f), "utf-8");
const form = src("NeedFormScreen.tsx");
const qr = src("DonationQrScreen.tsx");
const body = (s: string, name: string) => {
  const m = new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*\\{([^{}]*)\\}`).exec(s);
  return m ? m[1] : null;
};
const fixedHeight = /(^|[^a-zA-Z])height\s*:/;
const tag = (s: string, style: string) => {
  const m = new RegExp(`<Text\\b[^>]*style=\\{(?:\\[)?styles\\.${style}\\b[^>]*>`, "s").exec(s);
  return m ? m[0] : null;
};

describe("the need form", () => {
  it("the scan found the styles (a guard that matches nothing proves nothing)", () => {
    for (const n of ["segment", "stepper", "stepBtn", "stepGlyph", "qty"]) expect(body(form, n)).not.toBeNull();
    expect(body(qr, "photoBtn")).not.toBeNull();
  });
  it("a Category chip uses minHeight + padding, not a fixed height (it clipped and overlapped its neighbours)", () => {
    const b = body(form, "segment") as string;
    expect(b).toMatch(/minHeight\s*:\s*38/);
    expect(b).toMatch(/paddingVertical\s*:/);
    expect(b).not.toMatch(fixedHeight);
  });
  it("the stepper pill uses minHeight, not a fixed height", () => {
    const b = body(form, "stepper") as string;
    expect(b).toMatch(/minHeight\s*:\s*68/);
    expect(b).not.toMatch(fixedHeight);
  });
  it("the stepper's glyphs do not scale (a glyph in a fixed 52 pt circle)", () => {
    const tags = [...form.matchAll(/<Text\b[^>]*style=\{styles\.stepGlyph\}[^>]*>/gs)].map((m) => m[0]);
    expect(tags.length).toBe(2);
    for (const t of tags) expect(t).toMatch(/allowFontScaling=\{false\}/);
  });
  it("the quantity is capped, so it stays inside the pill (it was cut off)", () => {
    expect(tag(form, "qty")).toMatch(/maxFontSizeMultiplier=\{maxFontScale\.code\}/);
    expect(form).toMatch(/import\s*\{[^}]*\bmaxFontScale\b[^}]*\}\s*from\s*"\.\.\/theme"/s);
  });
});

describe("the Donation QR screen", () => {
  it("the QR image box uses minHeight + padding, not a fixed height (it clipped its label)", () => {
    const b = body(qr, "photoBtn") as string;
    expect(b).toMatch(/minHeight\s*:\s*90/);
    expect(b).toMatch(/paddingVertical\s*:/);
    expect(b).not.toMatch(fixedHeight);
  });
});
