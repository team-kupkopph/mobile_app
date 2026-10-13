/**
 * The city picker at AX5 (seen on a device after #203): "Mandaluyong", one long word on a column of roughly 200 pt, still broke mid-word ("Mandaluyo / ng")
 * because the city name scaled with the full Dynamic Type size. The names are list labels in a fixed-width row beside a pin and a radio, so they take the
 * same cap as titles (`maxFontScale.title`, 2.2); shorter names still wrap on their spaces.
 *
 * A source scan in the style of homeAx5.test.ts; the device walk is the proof. Written in the same step as its fix (never seen red).
 */
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(__dirname, "..", "screens", "LocationPickerScreen.tsx"), "utf-8");

test("the city name is capped like every other title", () => {
  expect(src).toMatch(/styles\.cityName[^>]*maxFontSizeMultiplier=\{maxFontScale\.title\}/);
  expect(src).toMatch(/import \{[^}]*maxFontScale[^}]*\} from "\.\.\/theme"/);
});
