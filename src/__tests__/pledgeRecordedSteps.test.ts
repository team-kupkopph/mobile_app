/**
 * D1 (owner, 2026-10-27) · "Pledge recorded" shows the wireframe's "What happens next" strip
 * (`screen-donate-pledged`): three numbered steps from `pledgeNextSteps`. Not the wireframe's summary row or
 * Pledged chip — the sentence above already names the quantity, need and shelter. The step numbers are fixed-shape
 * circles (`allowFontScaling={false}`, like the ✓ tile); the step text scales.
 */
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(__dirname, "..", "screens", "DonatePledgeScreen.tsx"), "utf8");
const done = /if \(done\) \{([\s\S]*?)\n {2}\}\n/.exec(src)?.[1] ?? "";

describe("Pledge recorded · What happens next (D1)", () => {
  it("the scan found the confirmation (a guard that matches nothing proves nothing)", () => {
    expect(done).toMatch(/Pledge recorded/);
  });

  it("shows the three steps under a heading", () => {
    expect(done).toMatch(/>What happens next</);
    expect(done).toMatch(/pledgeNextSteps\(shelterName\)\.map\(/);
  });

  it("numbers them in fixed-shape circles", () => {
    expect(done).toMatch(/styles\.stepNumber\}[^>]*allowFontScaling=\{false\}/);
  });

  it("adds no summary row or Pledged chip, and keeps the drop-off instructions", () => {
    expect(done).not.toMatch(/<Chip\b/);
    expect(done).toMatch(/<DropOff\b/);
  });

  it("the sentence no longer repeats what the steps say", () => {
    expect(done).not.toMatch(/will confirm once it arrives/);
  });
});
