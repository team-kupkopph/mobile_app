/**
 * The volunteer's sign-up outcome screens at AX5 (seen on `main` at `4dfa81e`, owner persona, one real request): "Request sent!" is a NON-scrolling `View` (`flex: 1`) of a 108 pt icon, an uncapped `hero` heading, two
 * paragraphs and two buttons, so at AX5 everything past the first paragraph, including "View my shifts", was unreachable. "Cancel shift"'s result and error panels are the same layout (by reading). "Your shift"
 * (check-in) already scrolls, but its shift card is an icon | `flex: 1` copy row with an uncapped title.
 *
 * The same fixes as the rest of the AX5 work: the two outcome screens scroll (`flexGrow: 1`, so a short one still sits at the top as before); the headings are capped (`maxFontScale.title`); above `fontScale > 1.5` the check-in shift card
 * stacks, cancelling the surviving `flex: 1` with `flex: 0` (#189). Default-size layout is unchanged.
 *
 * A source scan in the style of homeAx5.test.ts; the device walk is the proof (Requested seen; Check-in and Cancel see the PR). Written in the same step as its fix (never seen red).
 */
import { readFileSync } from "fs";
import { join } from "path";

const read = (f: string) => readFileSync(join(__dirname, "..", "screens", f), "utf-8");
const requested = read("KawangGawaRequestedScreen.tsx");
const cancel = read("KawangGawaCancelScreen.tsx");
const checkin = read("KawangGawaCheckinScreen.tsx");
const body = (s: string, name: string) => {
  const m = new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*\\{([^{}]*)\\}`).exec(s);
  return m ? m[1] : null;
};

describe.each([["Requested", requested], ["Cancel", cancel]])("%s", (_n, src) => {
  test("the outcome content scrolls and keeps its top alignment", () => {
    expect(src).toMatch(/<ScrollView contentContainerStyle=\{styles\.content\}/);
    const c = body(src, "content") as string;
    expect(c).toMatch(/flexGrow\s*:\s*1/);
    expect(c).not.toMatch(/(^|[^a-zA-Z])flex\s*:\s*1/);
    expect(c).toMatch(/paddingBottom\s*:/);
  });
  test("the heading is capped", () => {
    expect(src).toMatch(/styles\.heading\}[^>]*maxFontSizeMultiplier=\{maxFontScale\.title\}/);
  });
});

test("Cancel's result and error panels both scroll", () => {
  expect((cancel.match(/<ScrollView contentContainerStyle=\{styles\.content\}/g) ?? []).length).toBe(2);
});

test("the check-in shift card stacks at large text and cancels the surviving flex: 1", () => {
  expect(checkin).toMatch(/useLargeText\(\)/);
  expect(body(checkin, "shiftCardLarge")).toMatch(/flexDirection\s*:\s*"column"/);
  expect(body(checkin, "shiftCardLarge")).toMatch(/alignItems\s*:\s*"flex-start"/);
  const c = body(checkin, "cardCopyLarge") as string;
  expect(c).toMatch(/\bflex\s*:\s*0\b/);
  expect(c).toMatch(/alignSelf\s*:\s*"stretch"/);
  expect(c).toMatch(/flexGrow\s*:\s*0/);
  expect(c).toMatch(/flexBasis\s*:\s*"auto"/);
  expect(checkin).toMatch(/styles\.shiftCard, large && styles\.shiftCardLarge/);
  expect(checkin).toMatch(/styles\.cardTitle\}[^>]*maxFontSizeMultiplier=\{maxFontScale\.title\}/);
});
