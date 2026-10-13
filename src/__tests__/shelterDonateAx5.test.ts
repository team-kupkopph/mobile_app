/**
 * The shelter's Donate tab (`ShelterDonateScreen`) at AX5 (seen on `main` at `170e179`, Run 6 part 18): the wishlist row put each need's title in a
 * `flex: 1` column beside its status chip, so a long title ran one word per line ("AX5 / walk / need: / dry / dog / food / ...", about 12 lines)
 * under a chip that took the first line's right half; the "Donate" page title was uncapped `display` text (3.1x).
 *
 * Same fixes as the rest of the AX5 work: the title | chip row stacks at `fontScale > 1.5` (`useLargeText`), cancelling the surviving `flex: 1` with
 * `flex: 0` (#189); the page title and the need title are capped (`maxFontScale.title`).
 *
 * The stacked title has NO `alignSelf: "stretch"`: on a device (My donations, same part) a capped Text with the stretch reserved its frame for the
 * uncapped size and left ~100 pt of empty card under the title; the column's `alignItems: "flex-start"` already gives the text its natural width.
 *
 * A source scan in the style of needsRowsAx5.test.ts; the device walk is the proof.
 */
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(__dirname, "..", "screens", "ShelterDonateScreen.tsx"), "utf-8");
const body = (name: string) => {
  const m = new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*\\{([^{}]*)\\}`).exec(src);
  return m ? m[1] : null;
};

describe("the shelter Donate tab", () => {
  it("the scan found the styles (a guard that matches nothing proves nothing)", () => {
    for (const n of ["pageTitle", "needRow", "needTitle", "needCard"]) expect(body(n)).not.toBeNull();
  });
  it("the page title is capped", () => {
    expect(src).toMatch(/styles\.pageTitle\}\s+maxFontSizeMultiplier=\{maxFontScale\.title\}/);
  });
  it("the need row stacks when large (title, then its chip)", () => {
    expect(src).toMatch(/const large = useLargeText\(\)/);
    expect(src).toMatch(/styles\.needRow,\s*large && styles\.needRowLarge/);
    const r = body("needRowLarge") as string;
    expect(r).toMatch(/flexDirection\s*:\s*"column"/);
    expect(r).toMatch(/alignItems\s*:\s*"flex-start"/);
  });
  it("the stacked title cancels the surviving flex: 1, is capped, and does not stretch", () => {
    expect(src).toMatch(/styles\.needTitle,\s*large && styles\.needTitleLarge\]\}\s+maxFontSizeMultiplier=\{maxFontScale\.title\}/);
    const t = body("needTitleLarge") as string;
    expect(t).toMatch(/\bflex\s*:\s*0\b/);
    expect(t).toMatch(/flexGrow\s*:\s*0/);
    expect(t).toMatch(/flexBasis\s*:\s*"auto"/);
    expect(t).not.toMatch(/alignSelf/);
  });
});
