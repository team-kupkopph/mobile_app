import { readFileSync } from "fs";
import { join } from "path";
import {
  activitySection, attendanceSuggestion, blastRadiusCopy, reapprovalCopy, reliabilityChip, shiftStatusChip, spotsFilledLabel
} from "../shelterVolunteer";

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

test("reapprovalCopy (K11) names the consequence, not the reliability breakdown", () => {
  expect(reapprovalCopy("Juana Dela Cruz", { consecutive_no_shows: 3 })).toEqual({
    title: "Approve Juana anyway?",
    body: "Juana has missed their last 3 shifts. If they don't show, this slot goes unfilled."
  });
  expect(reapprovalCopy("Mark", { consecutive_no_shows: 4 })).toEqual({
    title: "Approve Mark anyway?",
    body: "Mark has missed their last 4 shifts. If they don't show, this slot goes unfilled."
  });
});

test("blastRadiusCopy names the count", () => {
  expect(blastRadiusCopy(4)).toMatch(/4 volunteers/);
  expect(blastRadiusCopy(1)).toMatch(/1 volunteer\b/);
  expect(blastRadiusCopy(0)).toMatch(/No volunteers/i);
});

// F-R2-9 · the picker's Close (and Android back) MUST NOT approve — a 2026-09 device walk
// found Close was wired to the same `onPickListing(null)` as Skip, silently approving the
// volunteer with no animal instead of dismissing the sheet. Skip stays deliberate. This is
// a source-scan (the suite is helper-only, no RTL) that pins the wiring the bug touched.
test("F-R2-9 · picker Close dismisses, does not approve (Skip stays the approve-without-animal path)", () => {
  const src = readFileSync(join(__dirname, "..", "components", "shelterVolunteer", "PendingSection.tsx"), "utf8");
  const hook = readFileSync(join(__dirname, "..", "components", "shelterVolunteer", "useRequestActions.ts"), "utf8");

  // The hook exposes a dedicated dismissPicker that only clears pickerSignupId — no approve.
  expect(hook).toMatch(/function dismissPicker\(\)\s*{\s*setPickerSignupId\(null\);\s*}/);
  expect(hook).toMatch(/return\s*{[^}]*dismissPicker/);

  // The Modal's onRequestClose (Android back / backdrop dismiss on OS) uses dismissPicker.
  expect(src).toMatch(/onRequestClose=\{actions\.dismissPicker\}/);
  // The Close button uses dismissPicker (not onPickListing).
  expect(src).toMatch(/onPress=\{actions\.dismissPicker\}[\s\S]{0,200}styles\.pickerClose/);

  // Skip is unchanged — a deliberate "approve without assigning an animal" still routes
  // through onPickListing(null), which fires doApprove(signupId, null).
  expect(src).toMatch(/onPress=\{\(\) => actions\.onPickListing\(null\)\}[\s\S]{0,200}Skip — approve without assigning an animal/);

  // The regression pattern the bug had: Close previously called onPickListing(null). No
  // arrow-wrapped onPickListing(null) call may remain anywhere near the Close label.
  const closeIdx = src.indexOf("styles.pickerClose");
  const closeContext = src.slice(Math.max(0, closeIdx - 300), closeIdx + 60);
  expect(closeContext).not.toMatch(/onPickListing\(null\)/);
});

// F-R2-13 · the four per-row action buttons must announce the volunteer they act on. Without
// this, VoiceOver on a card list reads every button as just "Approve, button" — you cannot
// tell which row you are approving. The visible label stays the bare verb; only the a11y
// label carries the name.
describe("per-row action buttons name the volunteer (F-R2-13)", () => {
  const SECTIONS = join(__dirname, "..", "components", "shelterVolunteer");
  const pending = readFileSync(join(SECTIONS, "PendingSection.tsx"), "utf8");
  const attendance = readFileSync(join(SECTIONS, "AttendanceSection.tsx"), "utf8");

  /**
   * Return the `<Button …/>` block whose props include `label="<verb>"`. `[^>]*` cannot span
   * these props — inline arrow handlers (`onPress={() => …}`) put a literal `>` inside — so
   * this walks brace depth to find the tag's real self-closing `/>`.
   */
  function buttonWithLabel(src: string, verb: string): string | null {
    const openRe = /<Button\b/g;
    let m: RegExpExecArray | null;
    while ((m = openRe.exec(src))) {
      let depth = 0;
      for (let i = m.index + m[0].length; i < src.length - 1; i++) {
        const c = src[i];
        if (c === "{") depth++;
        else if (c === "}") depth--;
        else if (c === "/" && src[i + 1] === ">" && depth === 0) {
          const block = src.slice(m.index, i + 2);
          if (block.includes(`label="${verb}"`)) return block;
          break;
        }
      }
    }
    return null;
  }

  it.each([
    ["PendingSection", pending, "Decline"],
    ["PendingSection", pending, "Approve"],
    ["AttendanceSection", attendance, "No-show"],
    ["AttendanceSection", attendance, "Attended"],
  ])("%s's %s button carries an accessibilityLabel with the volunteer name", (_file, src, verb) => {
    const block = buttonWithLabel(src, verb);
    expect(block).not.toBeNull();
    // The label must be a non-empty template string that interpolates the row's display_name,
    // so the announcement disambiguates the row.
    expect(block).toMatch(/accessibilityLabel=\{`[^`]*\$\{row\.volunteer\.display_name\}[^`]*`\}/);
  });
});

describe("shiftStatusChip · an ended activity never reads Open (F-R3-9)", () => {
  const END = "2026-09-29T12:00:00Z";
  const before = new Date("2026-09-29T11:59:00Z").getTime();
  const after = new Date("2026-09-29T12:00:00Z").getTime();

  it("reads the booking state while the activity is still ahead", () => {
    expect(shiftStatusChip({ status: "open", ends_at: END }, before)).toEqual({ label: "Open", tone: "success" });
    expect(shiftStatusChip({ status: "full", ends_at: END }, before)).toEqual({ label: "Full", tone: "neutral" });
  });

  it("says Ended once ends_at has passed, whether it was open or full", () => {
    expect(shiftStatusChip({ status: "open", ends_at: END }, after)).toEqual({ label: "Ended", tone: "neutral" });
    expect(shiftStatusChip({ status: "full", ends_at: END }, after)).toEqual({ label: "Ended", tone: "neutral" });
  });

  it("keeps a cancelled activity Closed on either side of ends_at", () => {
    expect(shiftStatusChip({ status: "closed", ends_at: END }, before)).toEqual({ label: "Closed", tone: "neutral" });
    expect(shiftStatusChip({ status: "closed", ends_at: END }, after)).toEqual({ label: "Closed", tone: "neutral" });
  });
});

test("spotsFilledLabel counts filled spots from capacity − slots_left (F-R2-7)", () => {
  expect(spotsFilledLabel({ capacity: 5, slots_left: 2 })).toBe("3 of 5 spots filled");
  expect(spotsFilledLabel({ capacity: 4, slots_left: 4 })).toBe("0 of 4 spots filled");
  expect(spotsFilledLabel({ capacity: 3, slots_left: 0 })).toBe("3 of 3 spots filled");
});
