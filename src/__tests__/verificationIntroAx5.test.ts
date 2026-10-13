/**
 * The verification intro screens at AX5 (seen on `main` at `418ac48`, an unverified persona, "Get verified"): "Become a Verified Member" is a hero card of a 64 pt icon beside a `flex: 1` title and text, which
 * squeezed the title to a narrow column; the screen's content is a plain non-scrolling `View` (`flex: 1`), so everything below the fold, including the "Get verified" button, cannot be reached. "Request
 * submitted" has the same non-scrolling layout (not seen: it needs a submitted request) and a 44 pt icon | `flex: 1` notice. "Badge" (from My impact) puts a text ★ in a fixed 108 pt medal and has a fixed
 * `height: 38` "Earned" pill.
 *
 * The same fixes as the rest of the AX5 work: the content scrolls (`flexGrow: 1`); above `fontScale > 1.5` the hero and the notice stack, cancelling the surviving `flex: 1` with `flex: 0` (#189); titles
 * are capped (`maxFontScale.title`); the ★ in its fixed shape does not scale; the pill takes `minHeight` + padding. Default-size layout is unchanged.
 *
 * A source scan in the style of homeAx5.test.ts; the device walk is the proof (Upgrade and Badge seen where the PR says; Submitted not). Written in the same step as its fix (never seen red).
 */
import { readFileSync } from "fs";
import { join } from "path";

const read = (f: string) => readFileSync(join(__dirname, "..", "screens", f), "utf-8");
const upgrade = read("MemberUpgradeScreen.tsx");
const submitted = read("MemberSubmittedScreen.tsx");
const badge = read("BadgeComparisonScreen.tsx");
const body = (s: string, name: string) => {
  const m = new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*\\{([^{}]*)\\}`).exec(s);
  return m ? m[1] : null;
};
const cancelFlex = (b: string | null) => {
  expect(b).not.toBeNull();
  expect(b).toMatch(/\bflex\s*:\s*0\b/);
  expect(b).toMatch(/alignSelf\s*:\s*"stretch"/);
  expect(b).toMatch(/flexGrow\s*:\s*0/);
  expect(b).toMatch(/flexBasis\s*:\s*"auto"/);
};

describe.each([["MemberUpgrade", upgrade], ["MemberSubmitted", submitted]])("%s", (_n, src) => {
  test("the content scrolls and keeps its top alignment", () => {
    expect(src).toMatch(/<ScrollView contentContainerStyle=\{styles\.content\}/);
    const c = body(src, "content") as string;
    expect(c).toMatch(/flexGrow\s*:\s*1/);
    expect(c).not.toMatch(/(^|[^a-zA-Z])flex\s*:\s*1/);
    expect(c).toMatch(/paddingBottom\s*:/);
  });
});

test("the Upgrade hero stacks at large text and its title is capped", () => {
  expect(upgrade).toMatch(/useLargeText\(\)/);
  expect(body(upgrade, "heroCardLarge")).toMatch(/flexDirection\s*:\s*"column"/);
  expect(body(upgrade, "heroCardLarge")).toMatch(/alignItems\s*:\s*"flex-start"/);
  cancelFlex(body(upgrade, "heroCopyLarge"));
  expect(upgrade).toMatch(/styles\.heroCard, large && styles\.heroCardLarge/);
  expect(upgrade).toMatch(/styles\.heroTitle\}[^>]*maxFontSizeMultiplier=\{maxFontScale\.title\}/);
});

test("the Submitted notice stacks at large text and its heading is capped", () => {
  expect(submitted).toMatch(/useLargeText\(\)/);
  expect(body(submitted, "noticeBarLarge")).toMatch(/flexDirection\s*:\s*"column"/);
  cancelFlex(body(submitted, "noticeCopyLarge"));
  expect(submitted).toMatch(/styles\.noticeBar, large && styles\.noticeBarLarge/);
  expect(submitted).toMatch(/styles\.heading\}[^>]*maxFontSizeMultiplier=\{maxFontScale\.title\}/);
});

test("the Badge screen's ★ does not scale, its name is capped and the pill grows", () => {
  expect(badge).toMatch(/styles\.medalGlyph[^>]*\][^>]*allowFontScaling=\{false\}/);
  expect(badge).toMatch(/styles\.name[^>]*\][^>]*maxFontSizeMultiplier=\{maxFontScale\.title\}/);
  const p = body(badge, "earnedPill") as string;
  expect(p).not.toMatch(/(^|[^a-zA-Z])height\s*:/);
  expect(p).toMatch(/minHeight\s*:/);
  expect(p).toMatch(/paddingVertical\s*:/);
});
