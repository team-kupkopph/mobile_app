/**
 * The placement screens at AX5 (static risk from `dev/handoff-ax5.md`; `PlaceRequestScreen` then walked, `PlaceAcceptedScreen` not: reaching it means
 * accepting a placement, which cannot be undone): the offer's "Adoption fee | ₱300" card is a row of two texts that cannot share a line once the text
 * grows (the same card as the listing detail's, #199), and the pet name here and the "Welcome home!" / "They're in your care" titles are uncapped hero text.
 *
 * The same fixes as the rest of the AX5 work, above `fontScale > 1.5` only: the fee card stacks; the titles are capped (`maxFontScale.title`).
 * Default-size layout is unchanged.
 *
 * A source scan in the style of homeAx5.test.ts; the device walk is the proof. Written in the same step as its fix (never seen red).
 */
import { readFileSync } from "fs";
import { join } from "path";

const read = (f: string) => readFileSync(join(__dirname, "..", "screens", f), "utf-8");
const request = read("PlaceRequestScreen.tsx");
const accepted = read("PlaceAcceptedScreen.tsx");
const body = (s: string, name: string) => {
  const m = new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*\\{([^{}]*)\\}`).exec(s);
  return m ? m[1] : null;
};

test("PlaceRequest's fee card stacks at large text", () => {
  expect(request).toMatch(/useLargeText\(\)/);
  const f = body(request, "feeCardLarge") as string;
  expect(f).toMatch(/flexDirection\s*:\s*"column"/);
  expect(f).toMatch(/alignItems\s*:\s*"flex-start"/);
  expect(request).toMatch(/styles\.feeCard, large && styles\.feeCardLarge/);
});

test("the pet name is capped", () => {
  expect(request).toMatch(/styles\.name\}[^>]*maxFontSizeMultiplier=\{maxFontScale\.title\}/);
});

test("both PlaceAccepted titles are capped", () => {
  expect((accepted.match(/styles\.heroTitle\}[^>]*maxFontSizeMultiplier=\{maxFontScale\.title\}/g) ?? []).length).toBe(2);
});
