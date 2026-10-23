/**
 * Small findings of the Abot-tulong QR plan (Runs 3, 5, 6), source scans in the house style; the device walks are the proof.
 *  AT19 · the shelter dashboard's "Donations" tile was a hard-coded 0 (QR gifts leave no record, OQ6), a permanent false statistic: removed.
 *  AT20 · switching the payment app after picking an image re-labelled that image as the other provider: switching now clears the picked image.
 *  AT34 · the "Add the QR image." line stayed after an image was added: picking clears the error.
 *  AT39 · a refused replacement's reason ran into the next sentence when it had no full stop.
 *  AT40 · the Donate tab's QR card header (org name + chip) was not tappable, only its body.
 *  AT35 · the QR thumbnails did not grow with Larger Text while the text around them did.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { refusedNote } from "../ownQr";

const read = (f: string) => readFileSync(join(__dirname, "..", "screens", f), "utf-8");
const dash = read("ShelterDashboardScreen.tsx");
const form = read("DonationQrScreen.tsx");
const donate = read("ShelterDonateScreen.tsx");

describe("AT19 · the dashboard", () => {
  it("has no hard-coded Donations tile; the third of the artboard's three tiles is a real count (listings live now)", () => {
    expect(dash).not.toMatch(/label="Donations"/);
    expect(dash).toMatch(/label="Live"/);
    expect(dash).toMatch(/counts\.live_listings/);
    expect((dash.match(/<Stat /g) ?? []).length).toBeGreaterThanOrEqual(3);
  });
});

describe("AT20 / AT34 · the form", () => {
  it("clears the picked image when the payment app changes", () => {
    expect(form).toMatch(/onChange=\{\(i\) => \{[\s\S]{0,200}setQrUrl\(null\)/);
  });
  it("clears the error line when an image is picked (it already does at the start of addQrImage)", () => {
    expect(form).toMatch(/async function addQrImage\(\) \{[\s\S]{0,200}setError\(undefined\)/);
  });
});

describe("AT39 · refusedNote", () => {
  it("separates the reason from the next sentence", () => {
    expect(refusedNote("replacement", "Image is blurry")).toBe("Your last replacement wasn't approved: Image is blurry. Upload a different image to try again.");
  });
  it("does not double a full stop or question mark", () => {
    expect(refusedNote("QR", "Not the org's account.")).toBe("Your last QR wasn't approved: Not the org's account. Upload a different image to try again.");
    expect(refusedNote("QR", "Is this yours?")).toBe("Your last QR wasn't approved: Is this yours? Upload a different image to try again.");
  });
  it("works with no reason", () => {
    expect(refusedNote("QR", "")).toBe("Your last QR wasn't approved. Upload a different image to try again.");
  });
  it("the form uses it", () => {
    expect(form).toMatch(/refusedNote\(/);
  });
});

describe("AT40 / AT35 · the Donate tab", () => {
  it("the whole QR card (header included) is inside the tappable that opens the form", () => {
    const open = donate.indexOf('accessibilityLabel="Open your donation QR"');
    const head = donate.indexOf("styles.qrHead}");
    expect(open).toBeGreaterThan(-1);
    expect(head).toBeGreaterThan(open - 400);   // the header sits within the same touchable's JSX, after its opening tag
    expect(donate.lastIndexOf("<TouchableOpacity", head)).toBeGreaterThan(donate.lastIndexOf("<Card style={styles.qrCard}>"));
  });
  it("the thumbnails grow with Larger Text", () => {
    expect(donate).toMatch(/large && styles\.qrThumbLarge/);
  });
});
