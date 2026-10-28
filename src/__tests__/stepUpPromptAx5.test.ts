/**
 * The "Confirm it's you" prompt at the largest text size (account-settings Run 1, AX-7).
 *
 * Walked at AX5 on the simulator: the card is a plain View inside a Modal, so when the text grows the card
 * becomes taller than the screen. The title ("Confirm it's you") was clipped under the status bar and Cancel,
 * the only way out, was cut off at the bottom edge, with nothing to scroll. A modal that cannot be dismissed
 * is a trap, so the card scrolls, clears the safe areas, and follows the keyboard.
 *
 * A source scan; the device walk (AX5, the prompt over Two-step verification) is the proof.
 */
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(__dirname, "..", "components", "StepUpPrompt.tsx"), "utf8");

describe("StepUpPrompt scrolls at large text", () => {
  it("finds the file it means to check", () => {
    // ⚠️ Assert the scan found something before believing it found nothing.
    expect(src).toContain("<Modal");
    expect(src).toContain('testID="prompt.stepUp"');
  });

  it("puts the card inside a ScrollView that is inside the Modal", () => {
    const modal = src.indexOf("<Modal");
    const scroll = src.indexOf("<ScrollView");
    const card = src.indexOf("<Card");
    expect(modal).toBeGreaterThan(-1);
    expect(scroll).toBeGreaterThan(modal);
    expect(card).toBeGreaterThan(scroll);
  });

  it("follows the keyboard and keeps Cancel tappable while it is up", () => {
    const tag = src.slice(src.indexOf("<ScrollView"), src.indexOf(">", src.indexOf("<ScrollView")));
    expect(tag).toMatch(/automaticallyAdjustKeyboardInsets/);
    expect(tag).toMatch(/keyboardShouldPersistTaps="handled"/);
  });

  it("centres the card when it fits and clears the notch and home indicator when it does not", () => {
    expect(src).toContain("useSafeAreaInsets");
    expect(src).toMatch(/flexGrow:\s*1/);
    expect(src).toMatch(/justifyContent:\s*"center"/);
    expect(src).toMatch(/insets\.top/);
    expect(src).toMatch(/insets\.bottom/);
  });
});
