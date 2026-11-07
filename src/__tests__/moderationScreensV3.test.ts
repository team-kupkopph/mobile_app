/**
 * Content-moderation review step 25 (V1, V4, V6, V7) · the report form and the story page on the V3 surface, and what a
 * screen reader and a test flow can rely on there.
 *
 * ⚠️ The project's rule for a source scan: assert it READ something before it asserts anything was or was not there.
 */
import { readFileSync } from "fs";
import { join } from "path";

const read = (rel: string) => {
  const text = readFileSync(join(__dirname, "..", rel), "utf8");
  expect(text.length).toBeGreaterThan(500);
  return text;
};

describe.each([["screens/ReportContentScreen.tsx"], ["screens/StoryDetailScreen.tsx"]])("%s is V3", (file) => {
  const src = read(file);
  it("sits on the backdrop and presses controls IN, not by fading them", () => {
    expect(src).toContain("<ScreenBackdrop />");
    expect(src).toContain("<PressScale");
    expect(src.includes("TouchableOpacity")).toBe(false);
  });
  it("uses a Card for its surfaces, not a hand-spread shadow", () => {
    expect(src).toContain("<Card");
    expect(src.includes("...elevation")).toBe(false);
  });
  it("has no eyeballed colour", () => {
    expect(src.match(/#[0-9A-Fa-f]{6}\b/g)).toBeNull();
  });
});

describe("every state of the screen sits on the backdrop, not only the loaded one", () => {
  it("the story page paints it while loading or failed, and when loaded", () => {
    expect(read("screens/StoryDetailScreen.tsx").split("<ScreenBackdrop />").length - 1).toBe(2);
  });
  it("the report form paints it once", () => {
    expect(read("screens/ReportContentScreen.tsx").split("<ScreenBackdrop />").length - 1).toBe(1);
  });
});

describe("the story page's controls can be found by a screen reader and by a flow", () => {
  const src = read("screens/StoryDetailScreen.tsx");
  it("announces React and Report as buttons, each with a testID", () => {
    for (const id of ["btn.storyDetail.react", "btn.storyDetail.report"]) expect(src).toContain(`testID="${id}"`);
    expect(src.split('accessibilityRole="button"').length - 1).toBe(2);
  });
  it("says whether the reaction is on", () => {
    expect(src).toContain("accessibilityState={{ selected: story.my_reaction }}");
  });
  it("draws the hidden banner from the theme's warning tokens", () => {
    expect(src).toContain("backgroundColor: colors.warningBg");
    expect(src).toContain("color: colors.warning");
    expect(src).toContain('testID="banner.storyDetail.hidden"');
  });
});

describe("the report form", () => {
  const src = read("screens/ReportContentScreen.tsx");
  it("shows the note limit while typing, not only after Send", () => {
    expect(src).toContain("maxLength={2000}");
  });
  it("announces each category as a radio in a radiogroup", () => {
    expect(src).toContain('accessibilityRole="radio"');
    expect(src).toContain('accessibilityRole="radiogroup"');
  });
});
