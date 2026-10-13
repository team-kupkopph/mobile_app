/**
 * The shelter's "Post an activity" / "Edit activity" form at AX5 (seen on `main` at `170e179`, Run 6 part 18): the activity-type chips
 * (a fixed `height: 48`) and the Day / Starts / How long pills (a fixed `height: 44`) clipped the bottom of their text ("Tue, Oct 13"
 * lost its comma; "Facility care" sat on its neighbour); the "Use our shelter address" label ran 6 px past the right margin (no `flexShrink`). The two screens share these components, so one fix covers both.
 *
 * `minHeight` + vertical padding instead of a fixed `height`, the same fix as the rest of the AX5 work. The default-size height is
 * unchanged (minHeight keeps 48 / 44). A source scan in the style of needsRowsAx5.test.ts; the device walk is the proof.
 */
import { readFileSync } from "fs";
import { join } from "path";

const read = (...p: string[]) => readFileSync(join(__dirname, "..", ...p), "utf-8");
const fields = read("components", "ShiftFormFields.tsx");
const picker = read("components", "ShiftWhenPicker.tsx");
const body = (s: string, name: string) => {
  const m = new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*\\{([^{}]*)\\}`).exec(s);
  return m ? m[1] : null;
};
const fixedHeight = /(^|[^a-zA-Z])height\s*:/;

describe("the shift form's chips", () => {
  it("the scan found the styles (a guard that matches nothing proves nothing)", () => {
    expect(body(fields, "chip")).not.toBeNull();
    expect(body(picker, "chip")).not.toBeNull();
    expect(body(fields, "toggleLabel")).not.toBeNull();
  });
  it("the activity-type chip keeps 48 as a minimum and pads, so it grows with the text", () => {
    const c = body(fields, "chip") as string;
    expect(c).toMatch(/minHeight\s*:\s*48/);
    expect(c).toMatch(/paddingVertical\s*:/);
    expect(c).not.toMatch(fixedHeight);
  });
  it("the Day / Starts / How long pill keeps 44 as a minimum and pads, so it grows with the text", () => {
    const c = body(picker, "chip") as string;
    expect(c).toMatch(/minHeight\s*:\s*44/);
    expect(c).toMatch(/paddingVertical\s*:/);
    expect(c).not.toMatch(fixedHeight);
  });
  it("the 'Use our shelter address' label shrinks to its row instead of running past the right margin", () => {
    expect(body(fields, "toggleLabel") as string).toMatch(/flexShrink\s*:\s*1/);
  });
});
