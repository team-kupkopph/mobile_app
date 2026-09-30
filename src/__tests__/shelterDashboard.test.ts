import { ShelterDashboard, ShelterDashboardVolunteer } from "../api/types";
import { rescueSummary, shelterBannerState, volunteerSummary } from "../shelterDashboard";

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


// S16 · the Rescue card. Every number is a claim about the world, so none is made unless the
// server counted it — an uncovered or missing city says so instead of "0 near you".
describe("rescueSummary (S16)", () => {
  const r = (over: Partial<{ city: string | null; city_supported: boolean; needs_help: number | null; open_cases: number }>) =>
    ({ city: "Marikina City", city_supported: true, needs_help: 2, open_cases: 1, ...over });

  it("says how many strays need help near the shelter and how many cases are open", () => {
    expect(rescueSummary(r({}), true)).toEqual({
      line1: "2 strays need help near Marikina City", line2: "1 open case",
      mapCity: "Marikina City", note: null
    });
    expect(rescueSummary(r({ needs_help: 1, open_cases: 3 }), true))
      .toMatchObject({ line1: "1 stray needs help near Marikina City", line2: "3 open cases" });
  });

  it("says plainly when none need help and nothing is open", () => {
    expect(rescueSummary(r({ needs_help: 0, open_cases: 0 }), true))
      .toMatchObject({ line1: "No strays need help near Marikina City right now", line2: "No open cases" });
  });

  it("never states a count for a city the map can't search, and offers no map", () => {
    expect(rescueSummary(r({ city: "Iloilo City", city_supported: false, needs_help: null }), true))
      .toMatchObject({ line1: "The rescue map doesn't cover Iloilo City yet", mapCity: null });
    expect(rescueSummary(r({ city: null, city_supported: false, needs_help: null }), true))
      .toMatchObject({ line1: "Add your shelter's address to see strays near you", mapCity: null });
  });

  it("tells an unverified shelter that claiming needs verification", () => {
    expect(rescueSummary(r({}), false).note).toBe("Get verified to claim a rescue.");
  });
});
