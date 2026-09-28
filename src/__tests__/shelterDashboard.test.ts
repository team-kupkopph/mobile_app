import { ShelterDashboard, ShelterDashboardVolunteer } from "../api/types";
import { shelterBannerState, volunteerSummary } from "../shelterDashboard";

function dash(submitted: boolean, status: ShelterDashboard["verification"]["status"]): ShelterDashboard {
  return {
    verification: { submitted, status, docs: [] },
    counts: { draft_listings: 0, adopted: 0, donations: 0 },
    gates: { can_publish: false, donations_enabled: false },
    volunteer: { pending_requests: 0, attendance_due: 0, next_shift: null }
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

describe("volunteerSummary (Task 10 — K8/G12)", () => {
  const next: ShelterDashboardVolunteer["next_shift"] = {
    shift_id: "s1", title: "Morning dog walk", starts_at: "2026-10-03T09:00:00+08:00"
  };

  it("says nothing is waiting and shows no attendance line at 0/0", () => {
    const s = volunteerSummary({ pending_requests: 0, attendance_due: 0, next_shift: null });
    expect(s.line1).toBe("0 waiting");
    expect(s.line2).toBeNull();
  });

  it("singularizes the attendance line at 1", () => {
    const s = volunteerSummary({ pending_requests: 1, attendance_due: 1, next_shift: null });
    expect(s.line1).toBe("1 waiting");
    expect(s.line2).toBe("Mark attendance for 1 volunteer");
  });

  it("pluralizes at n and appends the next shift when one is scheduled", () => {
    const s = volunteerSummary({ pending_requests: 4, attendance_due: 3, next_shift: next });
    expect(s.line1).toContain("4 waiting");
    expect(s.line1).toContain("next: Morning dog walk");
    expect(s.line2).toBe("Mark attendance for 3 volunteers");
  });

  it("omits the next-shift clause entirely when next_shift is null", () => {
    const s = volunteerSummary({ pending_requests: 2, attendance_due: 0, next_shift: null });
    expect(s.line1).toBe("2 waiting");
    expect(s.line1).not.toContain("next:");
    expect(s.line2).toBeNull();
  });
});
