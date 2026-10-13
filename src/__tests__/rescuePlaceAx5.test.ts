/**
 * The three placement-handoff screens at AX5 (static risk from `dev/handoff-ax5.md`): "Place with someone" was walked and is a plain Field form (clean); "Review placement" and
 * "Placement sent" were NOT walked (reaching Sent means placing the animal, which sends a real placement offer). By reading: the recipient's email on the review card is a long
 * unbreakable word that scaled with the full Dynamic Type size, and the "Placement sent" headline is uncapped hero text.
 *
 * The same fixes as the rest of the AX5 work: both are capped (`maxFontScale.title`). Default-size layout is unchanged.
 *
 * A source scan in the style of homeAx5.test.ts. Written in the same step as its fix (never seen red).
 */
import { readFileSync } from "fs";
import { join } from "path";

const read = (f: string) => readFileSync(join(__dirname, "..", "screens", f), "utf-8");

test("the recipient email on the review card is capped", () => {
  expect(read("RescuePlaceConfirmScreen.tsx")).toMatch(/styles\.recipientEmail\}[^>]*maxFontSizeMultiplier=\{maxFontScale\.title\}/);
});

test("the Placement sent headline is capped", () => {
  expect(read("RescuePlaceSentScreen.tsx")).toMatch(/styles\.heroTitle\}[^>]*maxFontSizeMultiplier=\{maxFontScale\.title\}/);
});
