import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(__dirname, "..", "components/ui/SegmentedControl.tsx"), "utf8");
const num = (name: string) => Number(new RegExp(`const ${name} = (\\d+)`).exec(src)?.[1]);

// Run 12 · AX-4: on the device each segment's tap area was 38 pt tall (the 48 pt track minus 5 pt of padding on
// each side), under the 44 pt guideline. The padding is visual only, so each segment extends its hit area into it.
describe("a segmented control's options are at least 44 pt tall to touch (AX-4)", () => {
  it("the thumb is the track less its padding, as the device showed (38 of 48)", () => {
    expect(num("TRACK_HEIGHT")).toBe(48);
    expect(num("PAD")).toBe(5);
  });
  it("each segment adds the padding back as vertical hitSlop, giving the full track height", () => {
    const seg = /<PressScale\b[\s\S]*?testID=/.exec(src)?.[0] ?? "";
    expect(seg).toContain("accessibilityRole=\"tab\"");                 // the scan found the segment
    expect(seg).toMatch(/hitSlop=\{\{ top: PAD, bottom: PAD \}\}/);
    expect(num("TRACK_HEIGHT") - 2 * num("PAD") + 2 * num("PAD")).toBeGreaterThanOrEqual(44);
  });
});
