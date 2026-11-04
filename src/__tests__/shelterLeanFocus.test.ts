// Shelter home review (2026-10-29), steps 12, 15, 16 and 18 (mobile halves).
// - SH15 / SQ4 · a request whose counterparty is suspended stays in the inbox with a "Suspended" chip; the server
//   refuses its forward actions with `counterparty_suspended`, and the detail screens say so instead of "Try again".
// - SH12 · the bell's dot reads GET /me/notifications/unread-count, not the whole feed; You's "n active" reads the
//   dashboard's `volunteer.active_shifts` instead of paging /shelter/shifts (no more "20+").
// - SH18 · a volunteer row's date is formatted on the phone from `shift_starts_at`.
// - V6 (decided 2026-11-04) · "Organization profile" everywhere, the screen's own title.
import { readFileSync } from "fs";
import { join } from "path";

import { ShelterRequest } from "../api/types";
import { applicantRefusal } from "../applicant";
import { activeShiftsLabel } from "../shelterDashboard";
import { requestChip, requestSubtitle } from "../shelterRequests";

const read = (rel: string) => readFileSync(join(__dirname, "..", rel), "utf8");
const item = (p: Partial<ShelterRequest>): ShelterRequest => ({
  kind: "adoption", id: "r1", title: "Bantay", subtitle: "Ana Cruz", status: "active",
  created_at: "2030-10-01T00:00:00Z", target: { route: "inquiry", id: "r1" }, ...p
});

describe("requestChip (SQ4)", () => {
  it("a suspended counterparty reads Suspended, whatever the status", () => {
    expect(requestChip(item({ counterparty_suspended: true }))).toEqual({ label: "Suspended", tone: "danger" });
  });
  it("otherwise the status chip, as before", () => {
    expect(requestChip(item({ status: "active" }))).toEqual({ label: "Active", tone: "warning" });
    expect(requestChip(item({ status: "requested", counterparty_suspended: false })).label).toBe("Requested");
  });
});

describe("requestSubtitle (SH18)", () => {
  it("formats a volunteer row's date on the phone, from the raw instant", () => {
    const iso = "2030-10-05T01:00:00Z";
    const expected = new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    expect(requestSubtitle(item({ kind: "volunteer", subtitle: "server text", shift_starts_at: iso,
                                  shift_title: "Bath day" }))).toBe(`${expected} · Bath day`);
  });
  it("falls back to the server's subtitle for other kinds, or an older server", () => {
    expect(requestSubtitle(item({ kind: "volunteer", subtitle: "Sat, Oct 5 · Dog walking" })))
      .toBe("Sat, Oct 5 · Dog walking");
    expect(requestSubtitle(item({}))).toBe("Ana Cruz");
  });
});

describe("applicantRefusal (SQ4)", () => {
  it("names a suspended adopter instead of 'try again'", () => {
    expect(applicantRefusal("counterparty_suspended")).toBe("suspended");
  });
});

describe("activeShiftsLabel (SH12)", () => {
  it("reads the dashboard's exact count: no 20+", () => {
    expect(activeShiftsLabel(24)).toBe("24 active");
    expect(activeShiftsLabel(0)).toBe("None");
    expect(activeShiftsLabel(undefined)).toBeUndefined();
  });
});

describe("screens", () => {
  it("both Homes ask for the unread count, not the whole feed", () => {
    for (const f of ["screens/HomeScreen.tsx", "screens/ShelterDashboardScreen.tsx"]) {
      const src = read(f);
      expect(src).toMatch(/api\.get\("\/me\/notifications\/unread-count"\)/);
      expect(src).not.toMatch(/api\.get\("\/me\/notifications"\)/);
    }
  });
  it("You no longer pages /shelter/shifts to count", () => {
    const you = read("screens/ShelterProfileScreen.tsx");
    expect(you).not.toMatch(/\/shelter\/shifts\?when=upcoming/);
    expect(you).toMatch(/activeShiftsLabel\(dash\?\.volunteer\?\.active_shifts\)/);
  });
  it("Requests rows use the chip and subtitle helpers", () => {
    const screen = read("screens/ShelterRequestsScreen.tsx");
    expect(screen).toMatch(/requestChip\(item\)/);
    expect(screen).toMatch(/requestSubtitle\(item\)/);
  });
  it("the placement screen names a suspended rescuer", () => {
    expect(read("screens/PlaceRequestScreen.tsx")).toMatch(/counterparty_suspended/);
  });
  it("V6 · no screen calls it Organization details any more", () => {
    for (const f of ["screens/ShelterVolunteerCreateScreen.tsx", "screens/ShelterVolunteerEditScreen.tsx"]) {
      expect(read(f)).not.toMatch(/Organization details/);
      expect(read(f)).toMatch(/Organization profile/);
    }
  });
});
