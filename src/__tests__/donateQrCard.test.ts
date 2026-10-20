/**
 * The donor's QR card (`DonateScreen`), two Run 2 findings of the Abot-tulong QR plan (dev/test-plan-abot-tulong-qr.md):
 *
 *  - AT31 · a QR image that fails to load was a blank grey 220 pt box with the account name under it, so a donor could not tell "loading", "failed"
 *    and "no code". The card now says so when the image errors.
 *  - AT32 · the account name sat in a centred Card but a wrapped name (up to 120 chars) read left-aligned, because only the short single-line case
 *    looks centred. The name is `textAlign: "center"`.
 *
 * A source scan in the style of shelterDonateAx5.test.ts; the device walk is the proof.
 */
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(__dirname, "..", "screens", "DonateScreen.tsx"), "utf-8");
const body = (name: string) => {
  const m = new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*\\{([^{}]*)\\}`).exec(src);
  return m ? m[1] : null;
};

describe("the donor's QR card", () => {
  it("the scan found the styles (a guard that matches nothing proves nothing)", () => {
    for (const n of ["qrCard", "qrImage", "accountName"]) expect(body(n)).not.toBeNull();
  });
  it("AT32: the account name is centred, so a wrapped name stays centred", () => {
    expect(body("accountName") as string).toMatch(/textAlign\s*:\s*"center"/);
  });
  it("AT31: a failed QR image is replaced by copy that says so", () => {
    expect(src).toMatch(/onError=\{/);
    expect(src).toMatch(/couldn't load this code/i);
  });
  it("AT31: the fallback keeps the account name on screen (the donor can still read who it is for)", () => {
    expect(src).toMatch(/styles\.accountName/);
  });
});
