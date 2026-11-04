// U12 / NT-3 (shelter home test plan, Run 1) · Requests and the volunteer Pending section each had a private
// `timeAgo`. An unparseable timestamp made every comparison false and fell through to
// `new Date(iso).toLocaleDateString(...)`, which rendered "Invalid Date" on the row. One helper now, tested.
import { readFileSync } from "fs";
import { join } from "path";

import { timeAgo } from "../timeAgo";

const NOW = Date.parse("2030-10-10T12:00:00Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();

describe("timeAgo", () => {
  it("reads minutes, hours and days", () => {
    expect(timeAgo(ago(30_000), NOW)).toBe("just now");
    expect(timeAgo(ago(5 * 60_000), NOW)).toBe("5 min ago");
    expect(timeAgo(ago(3 * 3_600_000), NOW)).toBe("3h ago");
    expect(timeAgo(ago(2 * 86_400_000), NOW)).toBe("2d ago");
  });

  it("a week or more is a short date", () => {
    const iso = ago(9 * 86_400_000);
    expect(timeAgo(iso, NOW)).toBe(new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }));
  });

  it("a future timestamp (clock skew) is 'just now', never negative", () => {
    expect(timeAgo(new Date(NOW + 10 * 60_000).toISOString(), NOW)).toBe("just now");
  });

  it("an unparseable or empty timestamp says nothing, never 'Invalid Date' or NaN", () => {
    for (const bad of ["not a date", "", "2030-13-45T99:99:99Z"]) {
      expect(timeAgo(bad, NOW)).toBe("");
    }
  });
});

describe("both screens use the one helper", () => {
  for (const rel of ["screens/ShelterRequestsScreen.tsx", "components/shelterVolunteer/PendingSection.tsx"]) {
    it(rel, () => {
      const src = readFileSync(join(__dirname, "..", rel), "utf8");
      expect(src).not.toMatch(/function timeAgo\(/);
      expect(src).toMatch(/import \{ timeAgo \} from "\.\.\/(\.\.\/)?timeAgo"/);
    });
  }
});
