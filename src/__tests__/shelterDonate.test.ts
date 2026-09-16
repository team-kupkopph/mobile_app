// Task B1 · ShelterDonateScreen — the shelter's Donate tab root.
//
// `donateSections` is kept pure and separate from the screen so the QR-state derivation and
// the needs → row mapping are testable without React Native at all — same shape as
// `shelterDashboard.ts`'s `shelterBannerState`/`shelterVerificationCard`.
import { readFileSync } from "fs";
import { join } from "path";
import { donateSections } from "../shelterDonate";

const SCREEN = join(__dirname, "..", "screens", "ShelterDonateScreen.tsx");
const readScreen = () => readFileSync(SCREEN, "utf8");

describe("donateSections", () => {
  it("locks the QR when the dashboard hasn't loaded yet", () => {
    expect(donateSections(null, null, null).qr).toBe("locked");
  });

  it("locks the QR when donations_enabled is false", () => {
    const r = donateSections({ gates: { can_publish: false, donations_enabled: false } }, null, null);
    expect(r.qr).toBe("locked");
  });

  it("locks the QR when donations_enabled is false even if a QR happens to be present", () => {
    // `gates.donations_enabled` IS the two-key gate (org approved AND QR verified) — a
    // false value here means the gate is shut regardless of what the QR fetch found.
    const r = donateSections(
      { gates: { can_publish: true, donations_enabled: false } },
      { donation_qrs: [{ provider: "gcash", account_name: "Ana", qr_image_url: "https://x/y.png" }] },
      null
    );
    expect(r.qr).toBe("locked");
  });

  it("is missing when donations are enabled but no QR rows came back", () => {
    const r = donateSections(
      { gates: { can_publish: true, donations_enabled: true } },
      { donation_qrs: [] },
      null
    );
    expect(r.qr).toBe("missing");
  });

  it("is missing when donations are enabled but the QR hasn't loaded at all", () => {
    const r = donateSections({ gates: { can_publish: true, donations_enabled: true } }, null, null);
    expect(r.qr).toBe("missing");
  });

  it("is ready when donations are enabled and a QR is on file", () => {
    const r = donateSections(
      { gates: { can_publish: true, donations_enabled: true } },
      { donation_qrs: [{ provider: "gcash", account_name: "Ana", qr_image_url: "https://x/y.png" }] },
      null
    );
    expect(r.qr).toBe("ready");
  });

  it("maps needs to id/title/pledged/received rows, in order", () => {
    const r = donateSections(
      { gates: { can_publish: true, donations_enabled: true } },
      { donation_qrs: [] },
      [
        { need_id: "n1", title: "Dog food", quantity_received: 3, pledged: 5 },
        { need_id: "n2", title: "Blankets", quantity_received: 0, pledged: 0 }
      ]
    );
    expect(r.needs).toEqual([
      { id: "n1", title: "Dog food", pledged: 5, received: 3 },
      { id: "n2", title: "Blankets", pledged: 0, received: 0 }
    ]);
  });

  it("returns an empty needs array when needs haven't loaded", () => {
    expect(donateSections(null, null, null).needs).toEqual([]);
  });
});

describe("ShelterDonateScreen file guards", () => {
  it("renders ScreenBackdrop", () => {
    expect(readScreen()).toMatch(/<ScreenBackdrop\b/);
  });

  it('renders ShelterTabs active="donate"', () => {
    expect(readScreen()).toMatch(/<ShelterTabs[\s\S]*?active="donate"/);
  });

  it('carries testID="screen.shelterDonate"', () => {
    expect(readScreen()).toMatch(/testID="screen\.shelterDonate"/);
  });

  it("keeps qrCard's explicit white fill (decision 5)", () => {
    expect(readScreen()).toMatch(/qrCard: \{[^}]*backgroundColor: colors\.white/);
  });
});
