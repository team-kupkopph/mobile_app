/**
 * The Adopt deck at AX5 (seen on `main` at `f1629a0`, owner persona): the card is a fixed `height: 452` with a 268 pt photo, so at AX5 the pet name
 * collapsed to "R…" (`numberOfLines={1}`), the "Available" chip sat on top of it, and the shelter row and the fee fell below the card's `overflow:
 * hidden` edge; the "Undo" pill (`height: 32`), the city chip (`height: 30`) and the "Details" pill (`height: 50`) clipped their text.
 *
 * The same fixes as the rest of the AX5 work, applied only above `fontScale > 1.5`: the card takes its MEASURED content height instead of 452, the
 * photo and body are not truncated, the name row and shelter row wrap or stack, pills take `minHeight` + padding, and the "that is everyone nearby"
 * card flows instead of being 452 tall. Default size keeps the artboard's numbers (`adoptDeckParity.test.ts` pins them).
 *
 * A source scan in the style of homeAx5.test.ts; the device walk is the proof. Written in the same step as its fix (never seen red).
 */
import { readFileSync } from "fs";
import { join } from "path";

const deck = readFileSync(join(__dirname, "..", "components", "AdoptDeck.tsx"), "utf-8");
const body = (name: string) => {
  const m = new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*\\{([^{}]*)\\}`).exec(deck);
  return m ? m[1] : null;
};
const fixedHeight = /(^|[^a-zA-Z])height\s*:/;

test("the deck reads the large-text flag", () => {
  expect(deck).toMatch(/useLargeText\(\)/);
});

test("the artboard's card height is only the default-size number", () => {
  expect(deck).toMatch(/const CARD_HEIGHT = 452;/);
  expect(deck).toMatch(/const cardHeight = large && measured > 0 \? measured : CARD_HEIGHT;/);
});

test("the card is measured at large text and takes its natural height", () => {
  expect(deck).toMatch(/onLayout=\{/);
  expect(deck).toMatch(/Math\.max\(/);
});

describe.each(["name", "meta", "posterName"])("%s", (n) => {
  test("is truncated to one line only at default size", () => {
    const m = new RegExp(`styles\\.${n}\\}[^>]*numberOfLines=\\{([^}]*)\\}`).exec(deck);
    expect(m).not.toBeNull();
    expect(m![1]).toMatch(/large \? undefined : 1/);
  });
});

test("the pet name is capped like every other title", () => {
  expect(deck).toMatch(/styles\.name\}[^>]*maxFontSizeMultiplier=\{maxFontScale\.title\}/);
});

describe.each(["undo", "cityChip", "details", "endButtonFill"])("%s", (n) => {
  test("grows with its text (minHeight + padding, no fixed height)", () => {
    const b = body(n) as string;
    expect(b).not.toBeNull();
    expect(b).not.toMatch(fixedHeight);
    expect(b).toMatch(/minHeight\s*:/);
    expect(b).toMatch(/paddingVertical\s*:/);
  });
});

test("the name row, the shelter row and the action row wrap or stack at large text", () => {
  expect(body("nameRow")).toMatch(/flexWrap\s*:\s*"wrap"/);
  expect(body("posterHead")).toMatch(/flexWrap\s*:\s*"wrap"/);
  expect(body("actions")).toMatch(/flexWrap\s*:\s*"wrap"/);
  const stacked = body("posterRowLarge") as string;
  expect(stacked).toMatch(/flexDirection\s*:\s*"column"/);
  expect(stacked).toMatch(/alignItems\s*:\s*"flex-start"/);
  const copy = body("posterCopyLarge") as string;
  expect(copy).toMatch(/\bflex\s*:\s*0\b/);
  expect(copy).toMatch(/alignSelf\s*:\s*"stretch"/);
  expect(copy).toMatch(/flexGrow\s*:\s*0/);
  expect(copy).toMatch(/flexBasis\s*:\s*"auto"/);
});

test("the facts overlay flows (and grows the photo) at large text instead of clipping inside it", () => {
  expect(body("factsLarge")).not.toMatch(/absolute/);
  expect(body("photoLarge")).toMatch(/minHeight\s*:/);
  expect(body("photoLarge")).not.toMatch(fixedHeight);
});

test("the end card flows at large text", () => {
  const e = body("endLarge") as string;
  expect(e).not.toMatch(/absolute/);
  expect(e).toMatch(/minHeight\s*:/);
  expect(e).not.toMatch(fixedHeight);
});

test("the stamps are capped (a gesture decoration, not copy)", () => {
  expect((deck.match(/styles\.stampText\}[^>]*maxFontSizeMultiplier=\{maxFontScale\.code\}/g) ?? []).length).toBe(2);
});
