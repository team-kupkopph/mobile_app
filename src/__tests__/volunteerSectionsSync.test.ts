/**
 * The shelter's volunteer activity screen keeps its Pending, Confirmed and Attendance sections all mounted (hidden with `display`), and each fetched
 * only on screen focus. Approving a request in Pending refetched only Pending: the Confirmed segment kept reading "No one's confirmed yet." (count 0)
 * until the screen was re-entered (seen on a device, Run 6 part 14; the cause is read from the code here). Removing a volunteer (Confirmed) and marking
 * attendance (Attendance) move rows between the same lists, and the header's "spots filled" line comes from a shift fetch that also ran only on focus.
 *
 * The fix: a section that changes the roster tells the screen (`onRosterChanged`), the screen bumps a counter and refetches the shift, and every OTHER
 * section refetches when the counter moves (`useReloadOnRosterChange`).
 *
 * A source scan in the style of signupCardsAx5.test.ts: the repo has no component renderer, so it pins the wiring; the device walk is the proof.
 * Written in the same step as its fix (never seen red).
 */
import { readFileSync } from "fs";
import { join } from "path";

const comp = (f: string) => readFileSync(join(__dirname, "..", "components", "shelterVolunteer", f), "utf-8");
const screen = readFileSync(join(__dirname, "..", "screens", "ShelterVolunteerActivityScreen.tsx"), "utf-8");
const sync = comp("rosterSync.ts");
const sections = [
  ["PendingSection", "pending", comp("PendingSection.tsx")],
  ["ConfirmedSection", "confirmed", comp("ConfirmedSection.tsx")],
  ["AttendanceSection", "attendance", comp("AttendanceSection.tsx")]
] as const;

test("the sync hook skips the first render and the section's own signal", () => {
  expect(sync).toMatch(/export function useReloadOnRosterChange/);
  expect(sync).toMatch(/sync\.n\s*>\s*0/);
  expect(sync).toMatch(/sync\.from\s*!==\s*self/);
});

describe.each(sections)("%s", (_name, key, src) => {
  test("reloads when another section changes the roster", () => {
    expect(src).toMatch(new RegExp(`useReloadOnRosterChange\\(\\s*"${key}"`));
    expect(src).toMatch(/sync\?:\s*RosterSync/);
  });
  test("tells the screen when it changes the roster", () => {
    expect(src).toMatch(/onRosterChanged\?:/);
    expect(src).toMatch(new RegExp(`onRosterChanged\\?\\.\\("${key}"\\)`));
  });
});

test("Pending raises the signal after an approve or decline (the observed bug)", () => {
  const p = sections[0][2];
  expect(p).toMatch(/useRequestActions\(shiftId, shift, \(\) => \{[^}]*loadRequests\(\)[^}]*onRosterChanged\?\.\("pending"\)/);
});

test("the screen wires every section to one counter and refetches the shift", () => {
  expect(screen).toMatch(/useState<RosterSync>/);
  expect(screen).toMatch(/onRosterChanged=\{onRosterChanged\}/g);
  expect((screen.match(/sync=\{rosterSync\}/g) ?? []).length).toBe(3);
  const fn = /function onRosterChanged[^{]*\{([\s\S]*?)\n  \}/.exec(screen);
  expect(fn).not.toBeNull();
  expect(fn![1]).toMatch(/setRosterSync/);
  expect(fn![1]).toMatch(/\bload\(\)/);
});
