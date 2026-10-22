/**
 * Two Run 2 findings of the Abot-tulong QR plan, both on the donor's `DonateScreen`:
 *
 *  - AT2 · offline and 5xx drew the right words and no "Try again" (`LoadStateView` shows it only when `onRetry` is passed), so the one screen that
 *    exists to show a QR had no way out but Back.
 *  - AT14 · a guest may open Donate (it is public), but "My donations ›" went to `GET /me/pledges`, 401 for a guest, and landed on "Couldn't load
 *    that / Please try again." with a Try again that can never work. A guest now gets the sign-up wall instead.
 *
 * A source scan in the style of donateQrCard.test.ts; the device walk is the proof.
 */
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(__dirname, "..", "screens", "DonateScreen.tsx"), "utf-8");

describe("DonateScreen", () => {
  it("AT2: the QR load is a callable `load` and the state view is given it as onRetry", () => {
    expect(src).toMatch(/const load = useCallback\(/);
    expect(src).toMatch(/<LoadStateView[\s\S]*?onRetry=\{load\}/);
  });
  it("AT2: the retry refetches the QR (not only the needs)", () => {
    const body = /const load = useCallback\(([\s\S]*?)\n  \}, \[/.exec(src);
    expect(body).not.toBeNull();
    expect((body as RegExpExecArray)[1]).toMatch(/donation-qr/);
  });
  it("AT14: a guest's 'My donations ›' raises the sign-up wall instead of navigating", () => {
    expect(src).toMatch(/const \{ tokens \} = useAuth\(\)/);
    expect(src).toMatch(/const isGuest = tokens === null/);
    expect(src).toMatch(/isGuest\s*\?\s*openWall\("account"\)\s*:\s*navigation\.navigate\("myDonations"\)/);
    expect(src).toMatch(/<SignupWall/);
  });
});
