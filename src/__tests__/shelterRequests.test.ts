// Task B3 · ShelterRequestsScreen — the shelter's Requests tab root. New screen, V3 from
// birth — the last of ShelterTabs' five tabs to stop being dead (see `surfaceV3.test.ts`'s
// `findDeadTabs`). Segmented Adoption/Volunteer/Placement over B-be2's merged inbox,
// GET /shelter/requests?kind=<adoption|volunteer|placement>&status=open.
import { readFileSync } from "fs";
import { join } from "path";
import { SEGMENT_KIND, requestRoute } from "../shelterRequests";
import { ShelterRequest } from "../api/types";

const SCREEN = join(__dirname, "..", "screens", "ShelterRequestsScreen.tsx");
const readScreen = () => readFileSync(SCREEN, "utf8");

function item(overrides: Partial<ShelterRequest>): ShelterRequest {
  return {
    kind: "adoption", id: "req-1", title: "Bantay", subtitle: "Juana dela Cruz",
    status: "active", created_at: "2026-09-14T10:00:00Z",
    target: { route: "inquiry", id: "req-1" },
    ...overrides
  };
}

describe("SEGMENT_KIND", () => {
  it("maps SegmentedControl's index to the kind B-be2 accepts, in Adoption/Volunteer/Placement order", () => {
    expect(SEGMENT_KIND).toEqual({ 0: "adoption", 1: "volunteer", 2: "placement" });
  });
});

describe("requestRoute", () => {
  it("routes an adoption item to the inquiry ladder", () => {
    expect(requestRoute(item({
      kind: "adoption", id: "iq-1", target: { route: "inquiry", id: "iq-1" }
    }))).toEqual({ name: "inquiry", params: { inquiryId: "iq-1" } });
  });

  // The signup's own id (`item.id`) and the shift's id (`item.target.id`) are DIFFERENT
  // values on the wire — routing must read `target.id`, since `shelterVolunteerRequests`
  // takes a shiftId, not a signupId. See shelter/views.py::_volunteer_items on the backend.
  it("routes a volunteer item to that shift's requests queue, keyed on target.id (the shift), not item.id (the signup)", () => {
    expect(requestRoute(item({
      kind: "volunteer", id: "su-1", target: { route: "shelterVolunteerRequests", id: "shift-1" }
    }))).toEqual({ name: "shelterVolunteerRequests", params: { shiftId: "shift-1" } });
  });

  it("routes a placement item to the inquiry ladder", () => {
    expect(requestRoute(item({
      kind: "placement", id: "iq-2", target: { route: "inquiry", id: "iq-2" }
    }))).toEqual({ name: "inquiry", params: { inquiryId: "iq-2" } });
  });
});

describe("ShelterRequestsScreen file guards", () => {
  it("renders ScreenBackdrop", () => {
    expect(readScreen()).toMatch(/<ScreenBackdrop\b/);
  });

  it('renders ShelterTabs active="requests"', () => {
    expect(readScreen()).toMatch(/<ShelterTabs[\s\S]*?active="requests"/);
  });

  it('carries testID="screen.shelterRequests"', () => {
    expect(readScreen()).toMatch(/testID="screen\.shelterRequests"/);
  });

  it("renders SegmentedControl", () => {
    expect(readScreen()).toMatch(/<SegmentedControl\b/);
  });

  it("renders rows as Cards", () => {
    expect(readScreen()).toMatch(/<Card\b/);
  });
});
