import { reliabilityChip, blastRadiusCopy } from "../shelterVolunteer";

test("reliabilityChip: Reliable only at >=3 completed", () => {
  expect(reliabilityChip({ shifts_completed: 3, no_shows: 0, consecutive_no_shows: 0,
    needs_reapproval: false, is_reliable: true })).toEqual({ label: "Reliable", tone: "done" });
  expect(reliabilityChip({ shifts_completed: 1, no_shows: 0, consecutive_no_shows: 0,
    needs_reapproval: false, is_reliable: false })).toEqual({ label: "New volunteer", tone: "muted" });
});

test("reliabilityChip: amber flagged when needs_reapproval", () => {
  expect(reliabilityChip({ shifts_completed: 5, no_shows: 3, consecutive_no_shows: 3,
    needs_reapproval: true, is_reliable: true }))
    .toEqual({ label: "Needs re-approval · 3 no-shows in a row", tone: "danger" });
});

test("blastRadiusCopy names the count", () => {
  expect(blastRadiusCopy(4)).toMatch(/4 volunteers/);
  expect(blastRadiusCopy(1)).toMatch(/1 volunteer\b/);
  expect(blastRadiusCopy(0)).toMatch(/No volunteers/i);
});
