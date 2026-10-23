/**
 * Abot-tulong QR plan Runs 1 and 3 · three findings on the shelter's `DonationQrScreen`:
 *
 *  - AT6 · a failed upload (offline, presign refused, storage refused, too large) left the box on "Add the QR image" with NO message: `addQrImage` ignored
 *    `res.ok === false` although `uploadErrorMessage` exists for exactly this.
 *  - AT7 · the server's own sentence ("Ensure this field has no more than 120 characters.", `"bank" is not a valid choice.`) was shown under the button.
 *    The name field now stops at 120 and a server error is mapped to plain copy (a name error under the field, anything else "Couldn't save. Try again.").
 *  - AT36 · the screen's red error lines were a plain Text, so VoiceOver never announced them.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { donationQrSaveError, NAME_MAX } from "../donationQrErrors";

const src = readFileSync(join(__dirname, "..", "screens", "DonationQrScreen.tsx"), "utf-8");

describe("donationQrSaveError (AT7)", () => {
  it("a name error is a plain sentence for the name field, not the server's", () => {
    const r = donationQrSaveError({ ok: false, status: 400, data: { error: { field: "account_name", message: "Ensure this field has no more than 120 characters." } } });
    expect(r).toEqual({ field: "name", message: `Keep the name to ${NAME_MAX} characters or fewer.` });
  });
  it("a blank-name error asks for the name", () => {
    const r = donationQrSaveError({ ok: false, status: 400, data: { error: { field: "account_name", message: "This field may not be blank." } } });
    expect(r.field).toBe("name");
    expect(r.message).toBe("Enter the name on the receiving account.");
  });
  it("anything else is 'Couldn't save', never the raw server text", () => {
    const r = donationQrSaveError({ ok: false, status: 400, data: { error: { field: "provider", message: '"bank" is not a valid choice.' } } });
    expect(r).toEqual({ field: null, message: "Couldn't save. Try again." });
    expect(donationQrSaveError({ ok: false, status: 500, data: "<html>" })).toEqual({ field: null, message: "Couldn't save. Try again." });
  });
  it("DW2: a wrong password is a password-field error", () => {
    const r = donationQrSaveError({ ok: false, status: 403, data: { error: { code: "reauth_required", message: "x" } } });
    expect(r.field).toBe("password");
    expect(r.message).toMatch(/password/i);
  });
  it("DW2: a refused image is told to upload a different one", () => {
    const r = donationQrSaveError({ ok: false, status: 400, data: { error: { code: "refused_image", field: "file_url", message: "x" } } });
    expect(r).toEqual({ field: null, message: "That image was already refused. Upload a different one." });
  });
  it("offline says so", () => {
    expect(donationQrSaveError({ ok: false, status: 0, data: null }).message).toMatch(/offline|reach the server/i);
  });
});

describe("DonationQrScreen", () => {
  it("AT6: a failed upload shows uploadErrorMessage(reason)", () => {
    expect(src).toMatch(/uploadErrorMessage/);
    expect(src).toMatch(/res && !res\.ok[\s\S]{0,120}uploadErrorMessage\(res\.reason\)/);
  });
  it("AT7: the name field is capped at 120 and carries the name error", () => {
    expect(src).toMatch(/maxLength=\{NAME_MAX\}/);
    expect(src).toMatch(/error=\{nameError\}/);
  });
  it("AT36: the screen-level error is announced (alert role, live region, announceForAccessibility)", () => {
    expect(src).toMatch(/accessibilityRole="alert"/);
    expect(src).toMatch(/accessibilityLiveRegion="polite"/);
    expect(src).toMatch(/AccessibilityInfo\.announceForAccessibility/);
  });
});
