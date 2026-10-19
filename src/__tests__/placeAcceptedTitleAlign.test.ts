/**
 * "Welcome home!" (and "They're in your care") on the placement-accepted screen: the hero card centres its icon and its body (`textAlign:
 * "center"`) but the title had no alignment, so a title that fills the card's width read left-aligned over a centred body (device walk, Run 6).
 * Both variants share `heroTitle`, so one style change fixes both.
 *
 * A source scan in the style of placementScreensAx5.test.ts; the device walk is the proof.
 */
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(__dirname, "..", "screens", "PlaceAcceptedScreen.tsx"), "utf-8");
const body = (name: string) => {
  const m = new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*\\{([^{}]*)\\}`).exec(src);
  return m ? m[1] : null;
};

test("found the title and body styles", () => {
  expect(body("heroTitle")).not.toBeNull();
  expect(body("heroBody")).toMatch(/textAlign\s*:\s*"center"/);
});

test("the title is centred like the body", () => {
  expect(body("heroTitle") as string).toMatch(/textAlign\s*:\s*"center"/);
});

test("both variants use the one title style", () => {
  expect((src.match(/styles\.heroTitle/g) ?? []).length).toBe(2);
});
