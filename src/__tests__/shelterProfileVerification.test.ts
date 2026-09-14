// F13 (test-plan-auth Run 2, C-1 / C-N14) · a shelter that chose "I'll upload these later"
// has NO verification request. The dashboard said "Documents not sent yet · Upload ›";
// the profile tab said "Under review · Track your documents" for the SAME account,
// because its card keyed off `gated` (`!me.is_verified_rescuer`) — which is true for
// never-submitted, pending, needs_info AND rejected alike. The card state has to come
// from the dashboard's `verification` (or /me's latest request), never from the gate.
import { readFileSync } from "fs";
import { join } from "path";

import { Me, ShelterDashboard, VerificationStatus } from "../api/types";
import { shelterVerificationCard } from "../shelterDashboard";

function dash(submitted: boolean, status: ShelterDashboard["verification"]["status"]): ShelterDashboard {
  return {
    verification: { submitted, status, docs: [] },
    counts: { draft_listings: 0, adopted: 0, donations: 0 },
    gates: { can_publish: false, donations_enabled: false }
  };
}

function me(verification_status: VerificationStatus | null): Me {
  return {
    account_id: "a", account_type: "shelter", display_name: "S", email: "s@x", email_verified_at: null,
    phone: null, photo_url: null, capabilities: [],
    shelter: { tier: "community_rescue", verification_status },
    is_verified_rescuer: false, settings: {}
  };
}

describe("shelterVerificationCard (F13 — the profile card is derived, not gated)", () => {
  it("is 'incomplete' when nothing was submitted, even though the account is gated", () => {
    expect(shelterVerificationCard(dash(false, null), me(null))).toBe("incomplete");
  });

  it("is 'pending' while a submitted request is under review", () => {
    expect(shelterVerificationCard(dash(true, "pending"), me("pending"))).toBe("pending");
  });

  it("is 'pending' for needs_info too — still with the reviewer", () => {
    expect(shelterVerificationCard(dash(true, "needs_info"), me("needs_info"))).toBe("pending");
  });

  it("is 'rejected' when the latest request was rejected", () => {
    expect(shelterVerificationCard(dash(true, "rejected"), me("rejected"))).toBe("rejected");
  });

  it("falls back to /me's latest request when the dashboard has not answered", () => {
    // The dashboard is this screen's SECONDARY request (US-R2) — it may not be there yet.
    expect(shelterVerificationCard(null, me(null))).toBe("incomplete");
    expect(shelterVerificationCard(null, me("pending"))).toBe("pending");
    expect(shelterVerificationCard(null, me("rejected"))).toBe("rejected");
  });

  it("trusts the dashboard over /me when both are present", () => {
    // /me is fetched in parallel; if they ever disagree the dashboard is the record.
    expect(shelterVerificationCard(dash(false, null), me("pending"))).toBe("incomplete");
  });
});

describe("ShelterProfileScreen's verification card", () => {
  const screen = readFileSync(join(__dirname, "..", "screens", "ShelterProfileScreen.tsx"), "utf8");

  it("reads the derived card state, not `gated` alone", () => {
    expect(screen).toMatch(/shelterVerificationCard\(/);
  });

  it("offers the not-submitted shelter an upload, routed to the verify form", () => {
    expect(screen).toMatch(/Documents not sent yet/);
    expect(screen).toMatch(/navigation\.navigate\("shelterVerify", \{ tier \}\)/);
  });

  it("keeps 'Under review · Track your documents' for a submitted request", () => {
    expect(screen).toMatch(/Track your documents/);
    expect(screen).toMatch(/navigation\.navigate\("verifyDocuments"\)/);
  });

  it("names a rejection with the existing US-V4 copy", () => {
    expect(screen).toMatch(/Not verified/);
  });

  it("still gates rows on the served gate (US-R1 / decision 16 untouched)", () => {
    expect(screen).toMatch(/const gated = !me\?\.is_verified_rescuer/);
  });
});
