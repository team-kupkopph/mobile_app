/**
 * The Adopt tab's header and "My inquiries" list at AX5 (seen on `main` at `f1629a0`, owner persona): the "+ List" button sat on top of the "Adopt"
 * title, the species chips were a fixed `height: 36` row cut off at the screen edge ("Dogs", "Cats", "C…"), and each inquiry card put its name in a
 * `flex: 1` column beside the status chip, so "E2E Milo" broke mid-word ("E2E / Mil / o") one or two letters per line, the "Share your adoption
 * story" pill was a fixed `height: 38`, and the screen was a stack of one-word lines. `MyInquiriesScreen` hosts the same `InquiryList`.
 *
 * The same fixes as the rest of the AX5 work, above `fontScale > 1.5` only: the title is capped and the header wraps; chips take `minHeight` +
 * padding and the row wraps; an inquiry card's name | chip row stacks, cancelling the surviving `flex: 1` with `flex: 0` (#189); the pill takes
 * `minHeight` + padding. Default-size layout is unchanged.
 *
 * A source scan in the style of homeAx5.test.ts; the device walk is the proof. Written in the same step as its fix (never seen red).
 */
import { readFileSync } from "fs";
import { join } from "path";

const screen = readFileSync(join(__dirname, "..", "screens", "AdoptScreen.tsx"), "utf-8");
const list = readFileSync(join(__dirname, "..", "components", "InquiryList.tsx"), "utf-8");
const body = (s: string, name: string) => {
  const m = new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*\\{([^{}]*)\\}`).exec(s);
  return m ? m[1] : null;
};
const fixedHeight = /(^|[^a-zA-Z])height\s*:/;

describe("AdoptScreen", () => {
  test("the header wraps and the title is capped", () => {
    expect(body(screen, "header")).toMatch(/flexWrap\s*:\s*"wrap"/);
    expect(screen).toMatch(/styles\.title\}[^>]*maxFontSizeMultiplier=\{maxFontScale\.title\}/);
  });
  test("the species chips grow with their text and the row wraps", () => {
    const c = body(screen, "filterChip") as string;
    expect(c).not.toBeNull();
    expect(c).not.toMatch(fixedHeight);
    expect(c).toMatch(/minHeight\s*:/);
    expect(c).toMatch(/paddingVertical\s*:/);
    expect(body(screen, "filterRow")).toMatch(/flexWrap\s*:\s*"wrap"/);
  });
});

describe("InquiryList", () => {
  test("reads the large-text flag", () => {
    expect(list).toMatch(/useLargeText\(\)/);
  });
  test("the name | status chip row stacks at large text and cancels the surviving flex: 1", () => {
    const row = body(list, "cardTopLarge") as string;
    expect(row).toMatch(/flexDirection\s*:\s*"column"/);
    expect(row).toMatch(/alignItems\s*:\s*"flex-start"/);
    const copy = body(list, "cardCopyLarge") as string;
    expect(copy).toMatch(/\bflex\s*:\s*0\b/);
    expect(copy).toMatch(/alignSelf\s*:\s*"stretch"/);
    expect(copy).toMatch(/flexGrow\s*:\s*0/);
    expect(copy).toMatch(/flexBasis\s*:\s*"auto"/);
    expect(list).toMatch(/styles\.cardTop, large && styles\.cardTopLarge/);
  });
  test("the inquiry name is capped", () => {
    expect(list).toMatch(/styles\.cardName\}[^>]*maxFontSizeMultiplier=\{maxFontScale\.title\}/);
  });
  test("the Share-your-story pill grows with its text", () => {
    const b = body(list, "shareStory") as string;
    expect(b).not.toMatch(fixedHeight);
    expect(b).toMatch(/minHeight\s*:/);
    expect(b).toMatch(/paddingVertical\s*:/);
  });
});
