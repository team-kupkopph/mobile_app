import { shiftTypeLabel, slotsLeftLabel, signupStatusCard, historyHours, lateCancelCopy } from "../volunteer";

test("shiftTypeLabel maps the six enum values", () => {
  expect(shiftTypeLabel("walking")).toBe("Dog walking");
  expect(shiftTypeLabel("feeding")).toBe("Feeding");
});

test("slotsLeftLabel reads '4 of 6 slots left' and handles a full shift", () => {
  expect(slotsLeftLabel(4, 6)).toBe("4 of 6 slots left");
  expect(slotsLeftLabel(0, 6)).toBe("Full");
});

test("signupStatusCard maps status to label + tone", () => {
  expect(signupStatusCard("completed")).toEqual({ label: "Completed", tone: "done" });
  expect(signupStatusCard("no_show")).toEqual({ label: "No-show", tone: "danger" });
  expect(signupStatusCard("cancelled")).toEqual({ label: "Cancelled", tone: "muted" });
});

test("historyHours formats the derived hours or a dash", () => {
  expect(historyHours({ hours: 2.5 } as any)).toBe("2.5 h");
  expect(historyHours({ hours: null } as any)).toBe("—");
});

test("lateCancelCopy is driven by the server's was_late, not a clock", () => {
  expect(lateCancelCopy(true)).toMatch(/less than 12 hours/i);
  expect(lateCancelCopy(false)).toMatch(/free/i);
});
