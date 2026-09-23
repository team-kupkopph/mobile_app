import { toLocalInputValue, toOffsetIso } from "../shiftTime";

test("a local wall-clock time gets the device's offset, never Z", () => {
  expect(toOffsetIso("2026-10-04T09:00", 480)).toBe("2026-10-04T09:00:00+08:00");
  expect(toOffsetIso("2026-10-04T09:00", -300)).toBe("2026-10-04T09:00:00-05:00");
  expect(toOffsetIso("2026-10-04T09:00", 0)).toBe("2026-10-04T09:00:00+00:00");
});

test("seconds are accepted, whitespace trimmed", () => {
  expect(toOffsetIso(" 2026-10-04T09:00:30 ", 480)).toBe("2026-10-04T09:00:30+08:00");
});

test("anything that isn't a plain local date-time is refused", () => {
  expect(toOffsetIso("tomorrow 9am", 480)).toBeNull();
  expect(toOffsetIso("2026-10-04", 480)).toBeNull();
  expect(toOffsetIso("2026-13-04T09:00", 480)).toBeNull();
  expect(toOffsetIso("2026-10-04T09:00+08:00", 480)).toBeNull();
});

test("the server's UTC instant is shown as local wall-clock time for editing", () => {
  expect(toLocalInputValue("2026-10-04T01:00:00+00:00", 480)).toBe("2026-10-04T09:00");
  expect(toLocalInputValue("2026-10-03T23:30:00+00:00", 480)).toBe("2026-10-04T07:30");
});

test("round trip is the identity", () => {
  const iso = toOffsetIso("2026-10-04T09:00", 480)!;
  expect(toLocalInputValue(iso, 480)).toBe("2026-10-04T09:00");
});
