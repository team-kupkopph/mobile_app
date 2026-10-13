/**
 * Two screens at AX5 (static risk from `dev/handoff-ax5.md`; "Adjust the pin" walked where the PR says): the pin screen lays an ABSOLUTE card (title, sub-line, "Save this spot")
 * over the bottom of a full-screen map, with the pin at the map's centre, so at AX5 the card's text grows until it covers the pin the person is meant to place; "Report this" is a
 * plain `View` with a multiline field and a button, which cannot scroll, so with the keyboard up (or at AX5) the Send button is unreachable.
 *
 * The same fixes as the rest of the AX5 work: the map card's text is capped hard (`maxFontScale.code`, 1.5: it is an overlay that must leave the map visible); the report form
 * is a ScrollView with the keyboard props (`automaticallyAdjustKeyboardInsets`, `keyboardShouldPersistTaps`, as #202). Default-size layout is unchanged.
 *
 * A source scan in the style of homeAx5.test.ts. Written in the same step as its fix (never seen red).
 */
import { readFileSync } from "fs";
import { join } from "path";

const read = (f: string) => readFileSync(join(__dirname, "..", "screens", f), "utf-8");
const pin = read("AdjustPinScreen.tsx");
const content = read("ReportContentScreen.tsx");

test("the pin screen's overlay text is capped so the map and its centre pin stay visible", () => {
  expect(pin).toMatch(/styles\.cardTitle\}[^>]*maxFontSizeMultiplier=\{maxFontScale\.code\}/);
  expect(pin).toMatch(/styles\.cardSub\}[^>]*maxFontSizeMultiplier=\{maxFontScale\.code\}/);
});

test("Report this scrolls and follows the keyboard", () => {
  const tag = /<ScrollView\b[\s\S]*?[}"]\s*>/.exec(content);
  expect(tag).not.toBeNull();
  expect(tag![0]).toMatch(/automaticallyAdjustKeyboardInsets/);
  expect(tag![0]).toMatch(/keyboardShouldPersistTaps/);
});
