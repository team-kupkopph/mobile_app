import { readFileSync } from "fs";
import { join } from "path";
import { activitySection, attendanceSuggestion, blastRadiusCopy, reapprovalCopy, reliabilityChip } from "../shelterVolunteer";

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
