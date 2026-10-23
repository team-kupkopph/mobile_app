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
// The stepper moved out of the form into the shared QuantityStepper (wishlist refactor Task 8), which the need form and the shelter's
// received-confirm dialog both use; its styles and the AX5 rules on them are scanned where they now live.
const stepper = readFileSync(join(__dirname, "..", "components", "QuantityStepper.tsx"), "utf-8");
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
    expect(body(form, "segment")).not.toBeNull();
    for (const n of ["stepper", "stepBtn", "stepGlyph", "qty"]) expect(body(stepper, n)).not.toBeNull();
    expect(body(qr, "photoBtn")).not.toBeNull();
    expect(form).toMatch(/<QuantityStepper\b/);
  });
  it("a Category chip uses minHeight + padding, not a fixed height (it clipped and overlapped its neighbours)", () => {
    const b = body(form, "segment") as string;
    expect(b).toMatch(/minHeight\s*:\s*38/);
    expect(b).toMatch(/paddingVertical\s*:/);
    expect(b).not.toMatch(fixedHeight);
  });
  it("the stepper pill uses minHeight, not a fixed height", () => {
    const b = body(stepper, "stepper") as string;
    expect(b).toMatch(/minHeight\s*:\s*68/);
    expect(b).not.toMatch(fixedHeight);
  });
  it("the stepper's glyphs do not scale (a glyph in a fixed 52 pt circle)", () => {
    const tags = [...stepper.matchAll(/<Text\b[^>]*style=\{styles\.stepGlyph\}[^>]*>/gs)].map((m) => m[0]);
    expect(tags.length).toBe(2);
    for (const t of tags) expect(t).toMatch(/allowFontScaling=\{false\}/);
  });
  it("the quantity is capped, so it stays inside the pill (it was cut off)", () => {
    expect(tag(stepper, "qty")).toMatch(/maxFontSizeMultiplier=\{maxFontScale\.code\}/);
    expect(stepper).toMatch(/import\s*\{[^}]*\bmaxFontScale\b[^}]*\}\s*from\s*"\.\.\/theme"/s);
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
