import { ShelterDashboard } from "../api/types";
import { shelterBannerState } from "../shelterDashboard";

function dash(submitted: boolean, status: ShelterDashboard["verification"]["status"]): ShelterDashboard {
  return {
    verification: { submitted, status, docs: [] },
    counts: { draft_listings: 0, adopted: 0, donations: 0 },
    gates: { can_publish: false, donations_enabled: false }
  };
}

describe("shelterBannerState (US-B5 — two derived states)", () => {
  it("shows 'pending' when a verification request exists", () => {
    expect(shelterBannerState(dash(true, "pending"))).toBe("pending");
  });

  it("shows 'incomplete' when nothing was submitted", () => {
    expect(shelterBannerState(dash(false, null))).toBe("incomplete");
  });

  it("shows 'verified' once the request is approved (US-V5)", () => {
    expect(shelterBannerState(dash(true, "approved"))).toBe("verified");
  });
});
