/**
 * DW2 PR 3 (backend#93 merged): the three shelter screens read the shelter's OWN QRs. Source scans in the house style; the device walk is the proof.
 */
import { readFileSync } from "fs";
import { join } from "path";

const read = (f: string) => readFileSync(join(__dirname, "..", "screens", f), "utf-8");
const donate = read("ShelterDonateScreen.tsx");
const profile = read("ShelterProfileScreen.tsx");
const form = read("DonationQrScreen.tsx");

describe("ShelterDonateScreen", () => {
  it("reads the shelter's own QRs, not the donor-facing public endpoint (AT3)", () => {
    expect(donate).toMatch(/api\.get\("\/shelter\/donation-qr"\)/);
    expect(donate).not.toMatch(/\/donation-qr`\)/);
  });
  it("shows the On / Pending verification / Off chip from donateChip", () => {
    expect(donate).toMatch(/donateChip\(/);
  });
  it("the whole QR card opens the form, locked or not (AT4: the locked card was a dead end)", () => {
    expect(donate).toMatch(/navigation\.navigate\("donationQr"\)/);
    expect(donate).not.toMatch(/styles\.lockedRow\}>\s*<LockIcon[\s\S]{0,400}<\/View>\s*\) : \(\s*<TouchableOpacity/);
  });
  it("a failed QR load says so, never 'Add your donation QR' (AT4)", () => {
    expect(donate).toMatch(/Couldn't load your QR/);
    expect(donate).not.toMatch(/Add your donation QR/);
  });
});

describe("ShelterProfileScreen · You → Donation QR (AT5)", () => {
  it("takes its value from youRowValue over the shelter's own QRs, not a hard-coded On", () => {
    expect(profile).toMatch(/youRowValue\(/);
    expect(profile).toMatch(/api\.get\("\/shelter\/donation-qr"\)/);
    expect(profile).not.toMatch(/gated \? undefined : "On"/);
  });
});

describe("DonationQrScreen", () => {
  it("opens pre-filled from the shelter's own QRs and shows the live code and any pending replacement", () => {
    expect(form).toMatch(/api\.get\("\/shelter\/donation-qr"\)/);
    expect(form).toMatch(/rowsFor\(/);
    expect(form).toMatch(/Replacement pending verification/);
  });
  it("previews the picked image", () => {
    expect(form).toMatch(/<Image source=\{\{ uri: qrUrl \}\}/);
  });
  it("asks for the password only when replacing a live code, and sends it as current_password", () => {
    expect(form).toMatch(/current_password/);
    expect(form).toMatch(/secure/);
    expect(form).toMatch(/reauth_required/);
  });
  it("confirms receipt: the live QR stays until the replacement is verified", () => {
    expect(form).toMatch(/Your current QR stays live until it's verified/);
  });
  it("has 'Take my QR offline now' behind a destructive confirm that names the consequence", () => {
    expect(form).toMatch(/Take my QR offline now/);
    expect(form).toMatch(/Donors won't see this QR until you add a new one and it's reviewed/);
    expect(form).toMatch(/\/shelter\/donation-qr\/\$\{[^}]+\}\/offline/);
  });
  it("says why a replacement was refused", () => {
    expect(form).toMatch(/decision_note/);
  });
});
