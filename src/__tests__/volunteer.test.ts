import {
  BrowseShift, MySignupItem, MySignups, groupShiftsByDay, historyHours, lateCancelCopy,
  nextBookedShift, shiftDayLabel, shiftDurationLabel, shiftSlotsChip, shiftTypeLabel,
  shiftTimeRange, volunteerTotals, volunteerTotalsLabel
} from "../volunteer";

test("shiftTypeLabel maps the six enum values", () => {
  expect(shiftTypeLabel("walking")).toBe("Dog walking");
  expect(shiftTypeLabel("feeding")).toBe("Feeding");
});

test("historyHours formats the derived hours or a dash", () => {
  expect(historyHours({ hours: 2.5 } as any)).toBe("2.5 h");
  expect(historyHours({ hours: null } as any)).toBe("—");
});

test("lateCancelCopy is driven by the server's was_late, not a clock", () => {
  expect(lateCancelCopy(true)).toMatch(/less than 12 hours/i);
  expect(lateCancelCopy(false)).toMatch(/free/i);
});

// ── Kawang-Gawa hub (US-V8 redesign) ────────────────────────────────────────────────
const NOW = new Date("2026-09-09T09:00:00").getTime();
const at = (iso: string) => new Date(iso).toISOString();

function shift(over: Partial<BrowseShift> = {}): BrowseShift {
  return {
    shift_id: "s1", type: "walking", org_name: "E2E shelter",
    starts_at: at("2026-09-09T14:00:00"), ends_at: at("2026-09-09T16:00:00"),
    capacity: 4, status: "open", slots_left: 2,
    title: "", description: "", city: "", province: "", ...over
  };
}
function signups(over: Partial<MySignups> = {}): MySignups {
  return {
    requested: [], upcoming: [], history: [],
    reliability: { shifts_completed: 0, no_shows: 0, consecutive_no_shows: 0,
                   needs_reapproval: false, is_reliable: true },
    ...over
  };
}
function item(over: Partial<MySignupItem> = {}): MySignupItem {
  return {
    signup_id: "g1", status: "completed", cancelled_at: null, was_late: false,
    check_in_at: null, check_out_at: null, hours: 2,
    needs_marking: false, assigned_animal: null, cancel_cutoff_at: at("2026-09-11T21:00:00"),
    shift: { shift_id: "s9", type: "feeding", org_name: "E2E shelter",
             starts_at: at("2026-09-12T09:00:00"), ends_at: at("2026-09-12T11:00:00"),
             status: "open", capacity: 4,
             title: "", description: "", city: "", province: "", slots_left: 4 },
    ...over
  };
}

test("volunteerTotals counts only completed history, so the two halves agree", () => {
  const s = signups({
    reliability: { shifts_completed: 2, no_shows: 1, consecutive_no_shows: 0,
                   needs_reapproval: false, is_reliable: true },
    history: [item({ hours: 2 }), item({ hours: 3 }),
              item({ status: "no_show", hours: 9 }),      // must not be counted
              item({ status: "cancelled", hours: null })]
  });
  expect(volunteerTotals(s)).toEqual({ shifts: 2, hours: 5 });
});

test("volunteerTotalsLabel stays silent for a first-time volunteer", () => {
  // A row of zeroes at someone who has not started is the opposite of encouraging.
  expect(volunteerTotalsLabel({ shifts: 0, hours: 0 })).toBeNull();
  expect(volunteerTotalsLabel(null)).toBeNull();
});

test("volunteerTotalsLabel reads as plain totals, singular and plural", () => {
  expect(volunteerTotalsLabel({ shifts: 6, hours: 14 })).toBe("6 shifts · 14 hours given");
  expect(volunteerTotalsLabel({ shifts: 1, hours: 1 })).toBe("1 shift · 1 hour given");
  // Checked in but never checked out — report the shift, don't invent hours.
  expect(volunteerTotalsLabel({ shifts: 3, hours: 0 })).toBe("3 shifts");
});

test("nextBookedShift ignores a request a shelter has not approved", () => {
  // Showing a pending request under "Next" would tell someone they have a shift.
  const pending = signups({ upcoming: [item({ status: "requested" })] });
  expect(nextBookedShift(pending, NOW)).toBeNull();
  const booked = signups({ upcoming: [item({ status: "approved" })] });
  expect(nextBookedShift(booked, NOW)?.signup_id).toBe("g1");
});

test("nextBookedShift takes the soonest, and skips one already past", () => {
  const s = signups({ upcoming: [
    item({ signup_id: "later", status: "approved",
           shift: { ...item().shift, starts_at: at("2026-09-20T09:00:00") } }),
    item({ signup_id: "soon", status: "approved",
           shift: { ...item().shift, starts_at: at("2026-09-10T09:00:00") } }),
    item({ signup_id: "past", status: "approved",
           shift: { ...item().shift, starts_at: at("2026-09-01T09:00:00") } })
  ] });
  expect(nextBookedShift(s, NOW)?.signup_id).toBe("soon");
});

test("shiftDayLabel names the near days and dates the far ones", () => {
  expect(shiftDayLabel(at("2026-09-09T18:00:00"), NOW)).toBe("Today");
  expect(shiftDayLabel(at("2026-09-10T06:00:00"), NOW)).toBe("Tomorrow");
  expect(shiftDayLabel(at("2026-09-12T06:00:00"), NOW)).toBe("Saturday");
  expect(shiftDayLabel(at("2026-09-30T06:00:00"), NOW)).toContain("Sep");
});

test("shiftDayLabel is about the calendar day, not 24-hour spans", () => {
  // 23:00 today and 01:00 tomorrow are two hours apart and must not share a heading.
  expect(shiftDayLabel(at("2026-09-09T23:00:00"), NOW)).toBe("Today");
  expect(shiftDayLabel(at("2026-09-10T01:00:00"), NOW)).toBe("Tomorrow");
});

test("shiftTimeRange is the clock range only — the day is carried elsewhere", () => {
  // Locale-independent assertions: two times joined by an en dash, and no date in it.
  const range = shiftTimeRange(at("2026-09-09T14:00:00"), at("2026-09-09T16:00:00"));
  expect(range.split("–")).toHaveLength(2);
  expect(range).not.toMatch(/Sep|2026|\b9\b/);
});

test("shiftDurationLabel says what the shift actually asks for", () => {
  expect(shiftDurationLabel(at("2026-09-09T14:00:00"), at("2026-09-09T16:00:00"))).toBe("2 hours");
  expect(shiftDurationLabel(at("2026-09-09T14:00:00"), at("2026-09-09T15:00:00"))).toBe("1 hour");
  expect(shiftDurationLabel(at("2026-09-09T14:00:00"), at("2026-09-09T14:45:00"))).toBe("45 min");
});

test("shiftSlotsChip never repeats the 'N of N' shape that reads as 'N of N taken'", () => {
  // An untouched shift describes its size; a partly-filled one describes what is left.
  expect(shiftSlotsChip(5, 5)).toEqual({ label: "5 slots", tone: "teal" });
  expect(shiftSlotsChip(3, 4)).toEqual({ label: "3 left", tone: "teal" });
  expect(shiftSlotsChip(1, 4)).toEqual({ label: "1 slot left", tone: "amber" });
  expect(shiftSlotsChip(0, 4)).toEqual({ label: "Full", tone: "grey" });
  for (const [left, cap] of [[5, 5], [3, 4], [1, 4], [0, 4]] as const) {
    expect(shiftSlotsChip(left, cap).label).not.toMatch(/\d+ of \d+/);
  }
});

test("groupShiftsByDay splits into day sections in chronological order", () => {
  const groups = groupShiftsByDay([
    shift({ shift_id: "sat", starts_at: at("2026-09-12T09:00:00"), ends_at: at("2026-09-12T11:00:00") }),
    shift({ shift_id: "today", starts_at: at("2026-09-09T14:00:00"), ends_at: at("2026-09-09T16:00:00") })
  ], NOW);
  expect(groups.map((g) => g.label)).toEqual(["Today", "Saturday"]);
  expect(groups[0].shifts[0].shift_id).toBe("today");
});

test("a full shift sinks below the takeable ones inside its own day", () => {
  // Browse returns `full` shifts on purpose (a cancellation reopens them), but the first
  // card is the one a volunteer reaches for — and the one e2e flow 30 taps and requests.
  const groups = groupShiftsByDay([
    shift({ shift_id: "full", slots_left: 0, starts_at: at("2026-09-09T10:00:00"), ends_at: at("2026-09-09T12:00:00") }),
    shift({ shift_id: "open", slots_left: 2, starts_at: at("2026-09-09T15:00:00"), ends_at: at("2026-09-09T17:00:00") })
  ], NOW);
  expect(groups[0].shifts.map((s) => s.shift_id)).toEqual(["open", "full"]);
});

test("a full shift does not jump into an earlier day", () => {
  const groups = groupShiftsByDay([
    shift({ shift_id: "tomorrowOpen", slots_left: 2, starts_at: at("2026-09-10T09:00:00"), ends_at: at("2026-09-10T11:00:00") }),
    shift({ shift_id: "todayFull", slots_left: 0, starts_at: at("2026-09-09T15:00:00"), ends_at: at("2026-09-09T17:00:00") })
  ], NOW);
  expect(groups.map((g) => g.label)).toEqual(["Today", "Tomorrow"]);
  expect(groups[0].shifts[0].shift_id).toBe("todayFull");
});

import { detailSignupState, locationLine, shiftHeadline } from "../volunteer";

test("a shift is named by its title, falling back to its type", () => {
  expect(shiftHeadline({ title: "Morning dog walk", type: "walking" })).toBe("Morning dog walk");
  expect(shiftHeadline({ title: "", type: "walking" })).toBe("Dog walking");
});

test("locationLine joins what exists, meeting point first", () => {
  expect(locationLine({ meeting_point: "Front gate", address_line1: "12 Shelter Rd",
    barangay: "Concepcion Uno", city: "Marikina", province: "Metro Manila" }))
    .toBe("Front gate · 12 Shelter Rd, Concepcion Uno, Marikina, Metro Manila");
  expect(locationLine({ meeting_point: "", address_line1: "", barangay: "", city: "Marikina", province: "" }))
    .toBe("Marikina");
});

test("detailSignupState reads the viewer's own signup", () => {
  const base = { my_signup: null } as any;
  expect(detailSignupState(base)).toBe("none");
  expect(detailSignupState({ my_signup: { signup_id: "1", status: "requested" } } as any)).toBe("requested");
  expect(detailSignupState({ my_signup: { signup_id: "1", status: "approved" } } as any)).toBe("approved");
  expect(detailSignupState({ my_signup: { signup_id: "1", status: "completed" } } as any)).toBe("closed_for_you");
  expect(detailSignupState({ my_signup: { signup_id: "1", status: "cancelled" } } as any)).toBe("none");
  expect(detailSignupState({ my_signup: { signup_id: "1", status: "declined" } } as any)).toBe("none");
});

// ── Kawang-Gawa P3 · volunteer flow (cancel preview, check-in, calendar, today card) ────────
import { buildIcs, cancelVariant, checkinState, signupStatusCard, todayShift } from "../volunteer";

const T0 = Date.UTC(2030, 9, 4, 1, 0);           // 09:00 Manila
const item2 = (over: Partial<any> = {}): any => ({
  signup_id: "s1", status: "approved", cancelled_at: null, was_late: false,
  check_in_at: null, check_out_at: null, hours: null, needs_marking: false, assigned_animal: null,
  cancel_cutoff_at: new Date(T0 - 12 * 3600e3).toISOString(),
  shift: { shift_id: "sh1", type: "walking", title: "Morning dog walk", org_name: "KG Test Shelter",
           description: "", city: "Marikina", province: "", status: "open", capacity: 3, slots_left: 1,
           starts_at: new Date(T0).toISOString(), ends_at: new Date(T0 + 2 * 3600e3).toISOString(),
           location: { meeting_point: "Front gate", address_line1: "12 Shelter Rd", barangay: "", city: "Marikina", province: "" } },
  ...over
});

test("cancelVariant previews what the server will decide", () => {
  expect(cancelVariant(item2({ status: "requested" }), T0 - 2 * 3600e3)).toBe("request");
  expect(cancelVariant(item2(), T0 - 13 * 3600e3)).toBe("free");
  expect(cancelVariant(item2(), T0 - 11 * 3600e3)).toBe("late");
});

test("checkinState follows the window: 30 min before start to end, then out until +2h", () => {
  expect(checkinState(item2(), T0 - 3600e3)).toEqual({ kind: "not_yet", opensAt: new Date(T0 - 30 * 60e3).toISOString() });
  expect(checkinState(item2(), T0 - 10 * 60e3)).toEqual({ kind: "can_check_in" });
  expect(checkinState(item2({ check_in_at: "x" }), T0 + 60 * 60e3)).toEqual({ kind: "can_check_out" });
  expect(checkinState(item2({ check_in_at: "x", check_out_at: "y" }), T0)).toEqual({ kind: "done" });
  expect(checkinState(item2(), T0 + 3 * 3600e3)).toEqual({ kind: "missed" });
});

test("status chips use the shared vocabulary, and a past unmarked shift waits on the shelter", () => {
  expect(signupStatusCard({ status: "requested", needs_marking: false })).toEqual({ label: "Requested", tone: "warning" });
  expect(signupStatusCard({ status: "approved", needs_marking: false })).toEqual({ label: "Confirmed", tone: "success" });
  expect(signupStatusCard({ status: "approved", needs_marking: true })).toEqual({ label: "Awaiting shelter", tone: "info" });
  expect(signupStatusCard({ status: "completed", needs_marking: false })).toEqual({ label: "Completed", tone: "success" });
  expect(signupStatusCard({ status: "declined", needs_marking: false })).toEqual({ label: "Declined", tone: "danger" });
  expect(signupStatusCard({ status: "no_show", needs_marking: false })).toEqual({ label: "No-show", tone: "danger" });
  expect(signupStatusCard({ status: "cancelled", needs_marking: false })).toEqual({ label: "Cancelled", tone: "neutral" });
});

test("buildIcs is a valid single VEVENT in UTC with the meeting point", () => {
  const ics = buildIcs(item2(), Date.UTC(2030, 0, 1));
  expect(ics).toContain("BEGIN:VCALENDAR\r\n");
  expect(ics).toContain("DTSTART:20301004T010000Z");
  expect(ics).toContain("DTEND:20301004T030000Z");
  expect(ics).toContain("SUMMARY:Morning dog walk · KG Test Shelter");
  expect(ics).toContain("LOCATION:Front gate · 12 Shelter Rd\\, Marikina");
  expect(ics).toContain("UID:s1@kupkop.ph");
  expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
});

test("todayShift is the approved shift from 3h before start until checked out", () => {
  const mine: any = { requested: [], upcoming: [item2()], history: [], reliability: {} };
  expect(todayShift(mine, T0 - 4 * 3600e3)).toBeNull();
  expect(todayShift(mine, T0 - 2 * 3600e3)?.signup_id).toBe("s1");
  mine.upcoming[0].check_out_at = "done";
  expect(todayShift(mine, T0)).toBeNull();
});
