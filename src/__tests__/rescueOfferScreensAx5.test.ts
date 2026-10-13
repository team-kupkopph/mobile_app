/**
 * The rescue-offer screens at AX5 (static risk from `dev/handoff-ax5.md`; walked where the PR says): "Offer help" has an uncapped `display` headline; "Offer sent" is
 * a centred, NON-scrolling card, so at AX5 its title, body and two buttons can outgrow the screen with nothing to scroll; "My offers" puts a title | status-chip + "Withdraw"
 * column in one row (a `flex: 1` copy column beside a right column) with a fixed `height: 28` chip and a bare `paddingVertical: 2` Withdraw link.
 *
 * The same fixes as the rest of the AX5 work: titles capped (`maxFontScale.title`); the Offer-sent card scrolls (its content keeps centring when short); above
 * `fontScale > 1.5` the offer row stacks, cancelling the surviving `flex: 1` with `flex: 0` (#189); the chip takes `minHeight` + padding and Withdraw a 44 pt floor.
 * Default-size layout is unchanged.
 *
 * A source scan in the style of homeAx5.test.ts. Written in the same step as its fix (never seen red).
 */
import { readFileSync } from "fs";
import { join } from "path";

const read = (f: string) => readFileSync(join(__dirname, "..", "screens", f), "utf-8");
const offer = read("RescueOfferScreen.tsx");
const sent = read("RescueOfferSentScreen.tsx");
const mine = read("MyOffersScreen.tsx");
const body = (s: string, name: string) => {
  const m = new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*\\{([^{}]*)\\}`).exec(s);
  return m ? m[1] : null;
};

test("the headlines are capped", () => {
  expect(offer).toMatch(/styles\.h1\}[^>]*maxFontSizeMultiplier=\{maxFontScale\.title\}/);
  expect(sent).toMatch(/styles\.heroTitle\}[^>]*maxFontSizeMultiplier=\{maxFontScale\.title\}/);
});

test("Offer sent scrolls and keeps centring a short card", () => {
  expect(sent).toMatch(/<ScrollView[^>]*contentContainerStyle=\{styles\.content\}/);
  const c = body(sent, "content") as string;
  expect(c).toMatch(/flexGrow\s*:\s*1/);
  expect(c).toMatch(/justifyContent\s*:\s*"center"/);
  expect(c).not.toMatch(/(^|[^a-zA-Z])flex\s*:\s*1/);
});

test("My offers' card stacks at large text and cancels the surviving flex: 1", () => {
  expect(mine).toMatch(/useLargeText\(\)/);
  expect(body(mine, "cardLarge")).toMatch(/flexDirection\s*:\s*"column"/);
  expect(body(mine, "cardLarge")).toMatch(/alignItems\s*:\s*"flex-start"/);
  const c = body(mine, "cardCopyLarge") as string;
  expect(c).toMatch(/\bflex\s*:\s*0\b/);
  expect(c).toMatch(/alignSelf\s*:\s*"stretch"/);
  expect(c).toMatch(/flexGrow\s*:\s*0/);
  expect(c).toMatch(/flexBasis\s*:\s*"auto"/);
  expect(mine).toMatch(/styles\.card, large && styles\.cardLarge/);
  expect(mine).toMatch(/large \? styles\.cardCopyLarge : styles\.cardCopy/);
  expect(mine).toMatch(/styles\.cardTitle\}[^>]*maxFontSizeMultiplier=\{maxFontScale\.title\}/);
});

test("My offers' chip grows and Withdraw has a 44 pt floor at large text", () => {
  const chip = body(mine, "chip") as string;
  expect(chip).not.toMatch(/(^|[^a-zA-Z])height\s*:/);
  expect(chip).toMatch(/minHeight\s*:/);
  expect(chip).toMatch(/paddingVertical\s*:/);
  expect(body(mine, "withdrawBtnLarge")).toMatch(/minHeight\s*:\s*44/);
  expect(mine).toMatch(/styles\.withdrawBtn, large && styles\.withdrawBtnLarge/);
});
