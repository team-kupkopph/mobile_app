import { activitySection, attendanceSuggestion, blastRadiusCopy, reliabilityChip } from "../shelterVolunteer";

const rel = (o: Partial<any>) => ({ shifts_completed: 0, no_shows: 0, consecutive_no_shows: 0,
  needs_reapproval: false, is_reliable: false, ...o });

test("reliabilityChip reads four ways (K9)", () => {
  expect(reliabilityChip(rel({ needs_reapproval: true, consecutive_no_shows: 3, no_shows: 3 }))).toBeNull();
  expect(reliabilityChip(rel({ shifts_completed: 5, is_reliable: true }))).toEqual({ label: "Reliable", tone: "success" });
  expect(reliabilityChip(rel({ shifts_completed: 5, no_shows: 2, consecutive_no_shows: 2 }))).toEqual({ label: "2 no-shows", tone: "neutral" });
  expect(reliabilityChip(rel({ shifts_completed: 1, no_shows: 1, consecutive_no_shows: 1 }))).toEqual({ label: "1 no-show", tone: "neutral" });
  expect(reliabilityChip(rel({}))).toEqual({ label: "New volunteer", tone: "info" });
  expect(reliabilityChip(rel({ shifts_completed: 2 }))).toEqual({ label: "2 shifts", tone: "neutral" });
});

test("a volunteer who checked in and out is suggested as Attended", () => {
  const row: any = { status: "approved", check_in_at: "a", check_out_at: "b" };
  expect(attendanceSuggestion(row)).toBe("completed");
  expect(attendanceSuggestion({ ...row, check_out_at: null })).toBeNull();
  expect(attendanceSuggestion({ ...row, status: "completed" })).toBeNull();
});

test("the timeline opens on the question the shelter has now", () => {
  const T = Date.UTC(2030, 9, 4, 1);
  const shift: any = { starts_at: new Date(T).toISOString(), ends_at: new Date(T + 2 * 3600e3).toISOString() };
  expect(activitySection(shift, 2, T - 86400e3)).toBe("pending");
  expect(activitySection(shift, 0, T - 86400e3)).toBe("confirmed");
  expect(activitySection(shift, 1, T + 3 * 3600e3)).toBe("attendance");
});

test("blastRadiusCopy names the count", () => {
  expect(blastRadiusCopy(4)).toMatch(/4 volunteers/);
  expect(blastRadiusCopy(1)).toMatch(/1 volunteer\b/);
  expect(blastRadiusCopy(0)).toMatch(/No volunteers/i);
});
