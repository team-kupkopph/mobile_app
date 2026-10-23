/**
 * DW2 (Abot-tulong QR plan; backend#93 is merged): a shelter can finally read its own QRs, so the app stops guessing.
 *  - AT3 · "pending" is told apart from "never uploaded";
 *  - AT5 · the You row says On only when a QR is live (it said On for a shelter with none or a pending one);
 *  - the Donate tab shows On / Pending verification / Off.
 */
import { donateChip, ownQrState, youRowValue, type OwnQr } from "../ownQr";

const row = (over: Partial<OwnQr>): OwnQr => ({
  donation_qr_id: "q", provider: "gcash", account_name: "Ana", qr_image_url: "https://x/q.png", status: "live",
  verified: true, replaces: null, decision_note: "", created_at: "2026-10-20T00:00:00Z", decided_at: null, overdue: false, ...over,
});

describe("ownQrState", () => {
  it("none when there are no rows (or they have not loaded)", () => {
    expect(ownQrState([])).toBe("none");
    expect(ownQrState(null)).toBe("none");
  });
  it("pending when only a pending row exists (AT3)", () => {
    expect(ownQrState([row({ status: "pending", verified: false })])).toBe("pending");
  });
  it("live when any row is live, even with a pending replacement beside it", () => {
    expect(ownQrState([row({}), row({ status: "pending", verified: false, replaces: "q" })])).toBe("live");
  });
  it("a refused row alone is none (nothing is live or waiting)", () => {
    expect(ownQrState([row({ status: "refused", verified: false })])).toBe("none");
  });
});

describe("youRowValue (AT5)", () => {
  it("gated (org not approved) shows no value (the lock glyph stands in)", () => {
    expect(youRowValue([row({})], true)).toBeUndefined();
  });
  it("On only with a live QR", () => {
    expect(youRowValue([row({})], false)).toBe("On");
  });
  it("Pending when only a pending QR exists", () => {
    expect(youRowValue([row({ status: "pending", verified: false })], false)).toBe("Pending");
  });
  it("Add when there is none", () => {
    expect(youRowValue([], false)).toBe("Add");
  });
  it("shows nothing while the rows have not loaded (never a false On)", () => {
    expect(youRowValue(null, false)).toBeUndefined();
  });
});

describe("donateChip", () => {
  it("On needs the dashboard gate (org approved AND a live QR), not just a live row", () => {
    expect(donateChip([row({})], true)).toEqual({ label: "On", tone: "success", sub: "Donations are on" });
    expect(donateChip([row({})], false)).toEqual({ label: "Off", tone: "neutral", sub: "Donations are paused" });
  });
  it("Pending verification (amber) when only a pending QR waits", () => {
    expect(donateChip([row({ status: "pending", verified: false })], false)).toEqual({ label: "Pending verification", tone: "warning", sub: "Waiting for review" });
  });
  it("Off when there is none", () => {
    expect(donateChip([], false).label).toBe("Off");
  });
});
