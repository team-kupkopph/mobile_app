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

import { shiftWindow, upcomingDays, windowParts } from "../shiftTime";

test("upcomingDays lists local calendar days starting today", () => {
  const now = Date.UTC(2026, 9, 3, 17, 0); // 2026-10-04 01:00 in Manila
  expect(upcomingDays(3, now, 480)).toEqual(["2026-10-04", "2026-10-05", "2026-10-06"]);
});

test("shiftWindow builds an offset-aware start and end", () => {
  expect(shiftWindow("2026-10-04", "09:00", 120, 480))
    .toEqual({ starts_at: "2026-10-04T09:00:00+08:00", ends_at: "2026-10-04T11:00:00+08:00" });
});

test("a window crossing midnight ends on the next day", () => {
  expect(shiftWindow("2026-10-04", "23:00", 90, 480))
    .toEqual({ starts_at: "2026-10-04T23:00:00+08:00", ends_at: "2026-10-05T00:30:00+08:00" });
});

test("windowParts is shiftWindow's inverse", () => {
  expect(windowParts("2026-10-04T01:00:00+00:00", "2026-10-04T03:00:00+00:00", 480))
    .toEqual({ day: "2026-10-04", start: "09:00", durationMins: 120 });
});
