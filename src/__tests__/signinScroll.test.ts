/**
 * R6-F7 · AX-1 — The Log in screen did not scroll at Dynamic Type AX5 (Run 6 part 6, found while
 * checking the Welcome fix): its content ended at "Forgot password?", a swipe did nothing, and the
 * "Log in" button and the social pills below were out of reach, so a person at AX5 could not log in.
 * The form lived in a plain `<View style={{ flex: 1 }}>`. The same screen on a small phone with the
 * keyboard open has the same problem at default size.
 *
 * The form now scrolls (always, not only at large sizes: it is the right behaviour at every size and
 * the default layout is unchanged because the content grows to fill the screen). Moving a form into
 * a ScrollView changes tap handling: by default the first tap outside a field only dismisses the
 * keyboard, so "type the password, tap Log in" would stop working; `keyboardShouldPersistTaps` keeps it.
 *
 * A source scan in the style of buttonDynamicType.test.ts; the device walk is still the proof.
 */
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(__dirname, "..", "screens", "SigninScreen.tsx"), "utf-8");
const at = (needle: string) => src.indexOf(needle);

function styleBody(name: string): string | null {
  const m = new RegExp(`(?:^|\\s)${name}\\s*:\\s*\\{([^{}]*)\\}`, "m").exec(src);
  return m ? m[1] : null;
}

describe("the Log in form scrolls (R6-F7)", () => {
  it("the scan found what it is scanning", () => {
    expect(at('testID="screen.signin"')).toBeGreaterThan(-1);
    expect(at("<SimpleHeader")).toBeGreaterThan(-1);
    expect(at('testID="btn.signin.submit"')).toBeGreaterThan(-1);
    expect(at('<SocialSignIn testIDPrefix="signin"')).toBeGreaterThan(-1);
    expect(styleBody("content")).toContain("alignItems");
  });

  it("imports ScrollView from react-native", () => {
    expect(src).toMatch(/import\s*\{[^}]*\bScrollView\b[^}]*\}\s*from\s*"react-native"/);
  });

  it("the ScrollView sits below the header and holds the submit button and the social row", () => {
    const header = at("<SimpleHeader");
    const open = at("<ScrollView");
    const submit = at('testID="btn.signin.submit"');
    const social = at('<SocialSignIn testIDPrefix="signin"');
    const close = at("</ScrollView>");
    expect(open).toBeGreaterThan(header);
    expect(submit).toBeGreaterThan(open);
    expect(social).toBeGreaterThan(submit);
    expect(close).toBeGreaterThan(social);
  });

  it("the first tap on Log in still lands when the keyboard is up", () => {
    const tag = /<ScrollView[^>]*>/s.exec(src);
    expect(tag).not.toBeNull();
    expect((tag as RegExpExecArray)[0]).toMatch(/keyboardShouldPersistTaps="handled"/);
  });

  it("the content grows to the screen instead of being pinned to it", () => {
    const tag = (/<ScrollView[^>]*>/s.exec(src) as RegExpExecArray)[0];
    expect(tag).toMatch(/contentContainerStyle=\{styles\.content\}/);
    const body = styleBody("content") as string;
    expect(body).toMatch(/flexGrow\s*:\s*1/);
    expect(body).not.toMatch(/\bflex\s*:\s*1/);
    expect(body).toMatch(/paddingBottom\s*:/);
  });

  it("the form still centres its children (the SocialSignIn width trap, socialSignIn.test.ts)", () => {
    expect(styleBody("content")).toMatch(/alignItems\s*:\s*"center"/);
  });
});
