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
  it("routes a volunteer item to that shift's timeline, on Pending, keyed on target.id (the shift), not item.id (the signup)", () => {
    expect(requestRoute(item({
      kind: "volunteer", id: "su-1", target: { route: "shelterVolunteerRequests", id: "shift-1" }
    }))).toEqual({ name: "shelterVolunteerActivity", params: { shiftId: "shift-1", section: "pending" } });
  });

  // S17 · a placement still awaiting the shelter's answer used to open the read-only ladder
  // (every stage skipped, no buttons); Accept/Decline was reachable only from the pet-owner
  // inquiry list. It now opens the decision screen, as InquiryList already does.
  it("routes a placement awaiting a decision to the accept/decline screen", () => {
    expect(requestRoute(item({
      kind: "placement", id: "iq-2", status: "active", target: { route: "inquiry", id: "iq-2" }
    }))).toEqual({ name: "placeRequest", params: { inquiryId: "iq-2" } });
  });

  it("routes a decided placement to the inquiry ladder", () => {
    for (const status of ["adopted", "declined"]) {
      expect(requestRoute(item({
        kind: "placement", id: "iq-3", status, target: { route: "inquiry", id: "iq-3" }
      }))).toEqual({ name: "inquiry", params: { inquiryId: "iq-3" } });
    }
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


describe("ShelterRequestsScreen · R2-F2 regression · dispatch handles placeRequest", () => {
  // The pure routing decision (requestRoute above) returns `placeRequest` for a pending
  // placement. The SCREEN's own navigation dispatch has to actually honour that name — if
  // it collapses every non-volunteer route to the inquiry ladder, the shelter opens the
  // placement in the read-only "Step 6 of 6, all Skipped" ladder (Sagip test plan Run 2
  // R2-F2) and never sees Accept/Decline. The dispatch isn't easily unit-tested through a
  // real render (RootStackParamList types fight back), so this is a source scan — same
  // shape as the file guards below.
  const src = readScreen();

  it("dispatches route.name === \"placeRequest\" to navigation.navigate(\"placeRequest\")", () => {
    expect(src).toMatch(/route\.name\s*===\s*"placeRequest"/);
    expect(src).toMatch(/navigation\.navigate\(\s*"placeRequest"\s*,\s*\{\s*inquiryId:\s*route\.params\.inquiryId/);
  });

  it("does not silently fall-through placeRequest to the inquiry ladder", () => {
    // The old `if (shelterVolunteerActivity) …; else navigate("inquiry", …);` shape dropped
    // placeRequest into the else branch. Both route-name checks must be present AND the
    // placeRequest check must appear before the final `else`-with-inquiry (otherwise the
    // placeRequest branch could still be unreachable).
    const volIdx = src.search(/route\.name\s*===\s*"shelterVolunteerActivity"/);
    const prIdx = src.search(/route\.name\s*===\s*"placeRequest"/);
    const inquiryNav = src.search(/navigation\.navigate\(\s*"inquiry"/);
    expect(volIdx).toBeGreaterThan(-1);
    expect(prIdx).toBeGreaterThan(-1);
    expect(inquiryNav).toBeGreaterThan(prIdx);  // placeRequest decided before inquiry fallback
  });
});
