/**
 * The shelter's Wishlist rows and the need (pledges) screen at AX5 (seen on `main` at `ef5f74c`, Run 6 part 13): a need's row put its title
 * in a narrow column beside the status chip ("Dog / food / (adult, / dry)" over four lines); on the need screen the "Edit" and "Close need"
 * buttons (a fixed `height: 38`) were clipped and "Close need" ran off the screen's right edge.
 *
 * Same fixes as the rest of the AX5 work: `minHeight` + padding instead of a fixed `height` (R6-F3/F4/F6); a row of text | chip stacks at
 * `fontScale > 1.5`, cancelling the surviving `flex: 1` with `flex: 0` (#189: grow / basis alone left the text at zero height); a button row
 * wraps. The pledge cards are changed the same way but could not be seen: no donor has pledged to the test need.
 *
 * A source scan in the style of volunteerAx5.test.ts; the device walk is the proof.
 */
import { readFileSync } from "fs";
import { join } from "path";

const src = (f: string) => readFileSync(join(__dirname, "..", "screens", f), "utf-8");
const needs = src("ShelterNeedsScreen.tsx");
const pledges = src("NeedPledgesScreen.tsx");
const body = (s: string, name: string) => {
  const m = new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*\\{([^{}]*)\\}`).exec(s);
  return m ? m[1] : null;
};
const fixedHeight = /(^|[^a-zA-Z])height\s*:/;
function expectStackedCopy(s: string, name: string) {
  const c = body(s, name) as string;
  expect(c).not.toBeNull();
  expect(c).toMatch(/\bflex\s*:\s*0\b/);
  expect(c).toMatch(/alignSelf\s*:\s*"stretch"/);
  expect(c).toMatch(/flexGrow\s*:\s*0/);
  expect(c).toMatch(/flexBasis\s*:\s*"auto"/);
}

describe("the Wishlist's need row", () => {
  it("the scan found the styles (a guard that matches nothing proves nothing)", () => {
    for (const n of ["needCard", "row", "needTitle", "meta"]) expect(body(needs, n)).not.toBeNull();
    for (const n of ["secondaryBtn", "receiveBtn", "actionRow", "pledgeCard", "pledger"]) expect(body(pledges, n)).not.toBeNull();
  });
  it("stacks when large (title, then its chip), with the base flex cancelled", () => {
    expect(needs).toMatch(/const large = useLargeText\(\)/);
    expect(needs).toMatch(/styles\.row,\s*large && styles\.rowLarge/);
    const r = body(needs, "rowLarge") as string;
    expect(r).toMatch(/flexDirection\s*:\s*"column"/);
    expect(r).toMatch(/alignItems\s*:\s*"flex-start"/);
    expect(needs).toMatch(/styles\.needTitle,\s*large && styles\.needTitleLarge/);
    expectStackedCopy(needs, "needTitleLarge");
  });
});

describe("the need screen (NeedPledgesScreen)", () => {
  it("reads the large-text flag", () => {
    expect(pledges).toMatch(/const large = useLargeText\(\)/);
  });
  it.each(["secondaryBtn", "receiveBtn"])("%s uses minHeight 38 + padding, not a fixed height", (n) => {
    const b = body(pledges, n) as string;
    expect(b).toMatch(/minHeight\s*:\s*38/);
    expect(b).toMatch(/paddingVertical\s*:/);
    expect(b).not.toMatch(fixedHeight);
  });
  it("the Edit / Close need row wraps, so a wide button drops to the next line instead of running off the screen", () => {
    expect(body(pledges, "actionRow") as string).toMatch(/flexWrap\s*:\s*"wrap"/);
  });
  it("a pledge card stacks when large (name, then its chip), with the base flex cancelled", () => {
    expect(pledges).toMatch(/styles\.row,\s*large && styles\.rowLarge/);
    const r = body(pledges, "rowLarge") as string;
    expect(r).toMatch(/flexDirection\s*:\s*"column"/);
    expect(r).toMatch(/alignItems\s*:\s*"flex-start"/);
    expect(pledges).toMatch(/styles\.pledger,\s*large && styles\.pledgerLarge/);
    expectStackedCopy(pledges, "pledgerLarge");
  });
});
