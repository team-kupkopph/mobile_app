/**
 * The shelter's "Cancel activity" screen (`ShelterVolunteerCancelScreen`) at AX5 (seen on `main` at `768b259`, Run 6 part 24): the screen's `ScrollView` content container was `flex: 1`, so it
 * could not scroll; the summary card, the question and the blast-radius copy filled the screen and the destructive "Cancel activity" button and "Keep activity" link sat below the edge,
 * unreachable. The same non-scrolling pattern fixed on the volunteer's Cancel screen: `flexGrow: 1`, which still fills a short screen but lets a tall one scroll.
 *
 * A source scan in the style of kawangGawaSignupScreensAx5.test.ts; the device walk is the proof.
 */
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(__dirname, "..", "screens", "ShelterVolunteerCancelScreen.tsx"), "utf-8");
const body = (name: string) => {
  const m = new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*\\{([^{}]*)\\}`).exec(src);
  return m ? m[1] : null;
};

describe("the shelter's Cancel activity screen", () => {
  it("the scan found the style (a guard that matches nothing proves nothing)", () => {
    expect(body("content")).not.toBeNull();
    expect(src).toMatch(/<ScrollView contentContainerStyle=\{styles\.content\}/);
  });
  it("the scrolling content grows (flexGrow) instead of being pinned to the screen (flex: 1), so the buttons are reachable", () => {
    const c = body("content") as string;
    expect(c).toMatch(/flexGrow\s*:\s*1/);
    expect(c).not.toMatch(/(^|[^a-zA-Z])flex\s*:\s*1/);
  });
});
