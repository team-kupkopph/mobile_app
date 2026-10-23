/**
 * Abot-tulong QR plan, Run 5 (AT35's second half): at Larger Text AX3+ the shared `SegmentedControl` stayed a 48 pt track with labels capped at 1.5x while the
 * text around it was 3x, so "GCash | Maya" read tiny beside its own heading. The F-R3-8 rule still holds at normal sizes (the track does not grow, the label shrinks
 * rather than truncates); at `useLargeText()` the track grows to 64 pt (still above the 44 pt target floor) and the label may scale to 2x.
 */
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(__dirname, "..", "components", "ui", "SegmentedControl.tsx"), "utf-8");

describe("SegmentedControl at Larger Text", () => {
  it("reads useLargeText", () => {
    expect(src).toMatch(/useLargeText\(\)/);
  });
  it("the track grows to 64 pt at large text and stays 48 pt otherwise", () => {
    expect(src).toMatch(/TRACK_HEIGHT_LARGE = 64/);
    expect(src).toMatch(/TRACK_HEIGHT = 48/);
    expect(src).toMatch(/large \? TRACK_HEIGHT_LARGE : TRACK_HEIGHT/);
  });
  it("the thumb follows the track height", () => {
    expect(src).toMatch(/height: trackHeight - PAD \* 2/);
  });
  it("the label may scale to 2x at large text, 1.5x otherwise, and still shrinks rather than truncates", () => {
    expect(src).toMatch(/maxFontSizeMultiplier=\{large \? 2 : 1\.5\}/);
    expect(src).toMatch(/adjustsFontSizeToFit/);
    expect(src).toMatch(/minimumFontScale=\{0\.6\}/);
  });
  it("the segment hit area still covers the full track (padding given back)", () => {
    expect(src).toMatch(/hitSlop=\{\{ top: PAD, bottom: PAD \}\}/);
  });
});
