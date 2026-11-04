// SH1 / SH2 / SH10 (shelter home review, 2026-10-29) · one verified state for the shell.
//
// Home read `verification.status` from the LATEST shelter_org request, so an approved tier-1
// rescue applying for tier 2 (a newer pending request) was told "Unverified · Listings stay hidden
// & donations off" on Home while You said "Verified Rescue". The server already sends the answer:
// `gates.can_publish` ("any approved"). And the verified hero said "donations are on" to every
// approved shelter, including one with no live QR (`gates.donations_enabled: false`).
import { readFileSync } from "fs";
import { join } from "path";

import { Me, ShelterDashboard, VerificationStatus } from "../api/types";
import { shelterShellState } from "../shelterDashboard";

function dash(opts: {
  submitted?: boolean; status?: VerificationStatus | null; canPublish?: boolean; donations?: boolean;
}): ShelterDashboard {
  const { submitted = true, status = null, canPublish = false, donations = false } = opts;
  return {
    verification: { submitted, status, docs: [] },
    counts: { draft_listings: 0, adopted: 0, donations: 0 },
    gates: { can_publish: canPublish, donations_enabled: donations },
    volunteer: { pending_requests: 0, attendance_due: 0, next_shift: null }
  };
}

function me(verified: boolean, verification_status: VerificationStatus | null): Me {
  return {
    account_id: "a", account_type: "shelter", display_name: "S", email: "s@x", email_verified_at: null,
    phone: null, photo_url: null, capabilities: [],
    shelter: { tier: "community_rescue", verification_status },
    is_verified_rescuer: verified, settings: {}
  };
}

describe("shelterShellState (SH1 — one verified state for Home, You and Rescue)", () => {
  it("knows nothing while neither request has answered: no banner, never a false 'Documents not sent'", () => {
    expect(shelterShellState(null, null)).toEqual({ verified: false, banner: "none", donationsOn: false });
  });

  it("falls back to /me's served gate while the dashboard has not answered", () => {
    expect(shelterShellState(null, me(true, "approved"))).toEqual({ verified: true, banner: "none", donationsOn: false });
  });

  it("SH1 regression: approved + a pending tier-2 upgrade is VERIFIED, with an upgrade-in-review accent", () => {
    const s = shelterShellState(dash({ status: "pending", canPublish: true }), me(true, "pending"));
    expect(s.verified).toBe(true);
    expect(s.banner).toBe("upgrade_in_review");
  });

  it("needs_info on an upgrade is still the upgrade in review, not a gate", () => {
    expect(shelterShellState(dash({ status: "needs_info", canPublish: true }), null).banner).toBe("upgrade_in_review");
  });

  it("a rejected upgrade leaves the approved shelter verified with no banner", () => {
    expect(shelterShellState(dash({ status: "rejected", canPublish: true }), null))
      .toEqual({ verified: true, banner: "none", donationsOn: false });
  });

  it("approved with a live QR: donations on", () => {
    expect(shelterShellState(dash({ status: "approved", canPublish: true, donations: true }), null))
      .toEqual({ verified: true, banner: "none", donationsOn: true });
  });

  it("SH2: approved with no live QR: donations OFF", () => {
    expect(shelterShellState(dash({ status: "approved", canPublish: true, donations: false }), null).donationsOn).toBe(false);
  });

  it("trusts the dashboard's gate over /me when both are present", () => {
    expect(shelterShellState(dash({ status: "approved", canPublish: true }), me(false, "approved")).verified).toBe(true);
  });

  it("never submitted: incomplete", () => {
    expect(shelterShellState(dash({ submitted: false }), me(false, null))).toEqual({ verified: false, banner: "incomplete", donationsOn: false });
  });

  it("pending: pending", () => {
    expect(shelterShellState(dash({ status: "pending" }), null).banner).toBe("pending");
  });

  it("needs_info while gated reads as pending, never incomplete", () => {
    expect(shelterShellState(dash({ status: "needs_info" }), null).banner).toBe("pending");
  });

  it("rejected: rejected", () => {
    expect(shelterShellState(dash({ status: "rejected" }), null).banner).toBe("rejected");
  });

  it("an unknown status from a newer server reads as pending and does not throw", () => {
    const d = dash({ status: "escalated" as VerificationStatus });
    expect(shelterShellState(d, null).banner).toBe("pending");
  });

  it("F9: a dashboard with no `gates` (older server) falls back to /me", () => {
    const d = { ...dash({ status: "pending" }), gates: undefined } as unknown as ShelterDashboard;
    expect(shelterShellState(d, me(true, "pending"))).toEqual({ verified: true, banner: "upgrade_in_review", donationsOn: false });
  });

  it("falls back to /me's latest request for the gated banner when the dashboard has not answered", () => {
    expect(shelterShellState(null, me(false, null)).banner).toBe("incomplete");
    expect(shelterShellState(null, me(false, "pending")).banner).toBe("pending");
    expect(shelterShellState(null, me(false, "rejected")).banner).toBe("rejected");
  });
});

describe("the shell screens read shelterShellState, not their own derivation", () => {
  const read = (f: string) => readFileSync(join(__dirname, "..", "screens", f), "utf8");
  const home = read("ShelterDashboardScreen.tsx");
  const you = read("ShelterProfileScreen.tsx");

  it("Home derives verified, banner and donations from shelterShellState(dash, me)", () => {
    expect(home).toMatch(/shelterShellState\(dash, me\)/);
    expect(home).not.toMatch(/verification\.status/);
    expect(home).not.toMatch(/me\?\.is_verified_rescuer/);
  });

  it("Home's hero only says donations are on when they are, and otherwise offers the QR", () => {
    expect(home).not.toMatch(/Your listings are live and donations are on\./);
    expect(home).toMatch(/shell\.donationsOn/);
    expect(home).toMatch(/Add a donation QR to turn donations on/);
    expect(home).toMatch(/navigation\.navigate\("donationQr"\)/);
  });

  it("Home shows an approved shelter's upgrade in review as a quiet accent, not the amber gate", () => {
    expect(home).toMatch(/upgrade_in_review/);
    expect(home).toMatch(/Upgrade under review/);
  });

  it("Rescue's canClaim and the Wishlist card read the same verified flag", () => {
    expect(home).toMatch(/rescueSummary\(dash\.rescue, shell\.verified\)/);
    expect(home).toMatch(/shell\.verified && dash\?\.wishlist/);
  });

  it("You derives its gate and card from shelterShellState(dash, me)", () => {
    expect(you).toMatch(/shelterShellState\(dash, me\)/);
    expect(you).toMatch(/const gated = !shell\.verified/);
    expect(you).toMatch(/shell\.banner === "upgrade_in_review"/);
  });

  it("the per-screen derivations are gone", () => {
    const helpers = readFileSync(join(__dirname, "..", "shelterDashboard.ts"), "utf8");
    expect(helpers).not.toMatch(/export function shelterBannerState/);
    expect(helpers).not.toMatch(/export function shelterVerificationCard/);
  });
});
