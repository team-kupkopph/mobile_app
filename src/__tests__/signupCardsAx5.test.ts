/**
 * The shelter's volunteer sign-up cards (Pending, Confirmed, Attendance) and the volunteer detail screen at AX5 (seen on `main` at `0cf0e5b`,
 * Run 6 part 14): the Pending card's name row ran off the card ("New volunteer" cut off, with the "Verified Member" and status chips beside the
 * name), and its "Decline" / "Approve" buttons sat half-width side by side and broke mid-word ("Decli / ne", "Appr / ove"). The Confirmed and
 * Attendance cards have the same icon | text | chip row and the same side-by-side buttons ("No-show" / "Attended"); the Remove and Undo links are a
 * fixed `height: 44`; and the detail screen's chips are a fixed `height: 30`.
 *
 * The same fixes as the rest of the AX5 work: a row of avatar | text | chip stacks at `fontScale > 1.5`, cancelling the surviving `flex: 1` with
 * `flex: 0` (#189); a pair of buttons stacks; `minHeight` + padding instead of a fixed `height`. Default-size layout is unchanged.
 *
 * A source scan in the style of needsRowsAx5.test.ts; the device walk is the proof.
 */
import { readFileSync } from "fs";
import { join } from "path";

const comp = (f: string) => readFileSync(join(__dirname, "..", "components", "shelterVolunteer", f), "utf-8");
const pending = comp("PendingSection.tsx");
const confirmed = comp("ConfirmedSection.tsx");
const attendance = comp("AttendanceSection.tsx");
const detail = readFileSync(join(__dirname, "..", "screens", "ShelterVolunteerDetailScreen.tsx"), "utf-8");
const body = (s: string, name: string) => {
  const m = new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*\\{([^{}]*)\\}`).exec(s);
  return m ? m[1] : null;
};
const fixedHeight = /(^|[^a-zA-Z])height\s*:/;
function expectStacked(s: string, rowName: string, copyName: string) {
  const r = body(s, rowName) as string;
  expect(r).toMatch(/flexDirection\s*:\s*"column"/);
  expect(r).toMatch(/alignItems\s*:\s*"flex-start"/);
  const c = body(s, copyName) as string;
  expect(c).toMatch(/\bflex\s*:\s*0\b/);
  expect(c).toMatch(/alignSelf\s*:\s*"stretch"/);
  expect(c).toMatch(/flexGrow\s*:\s*0/);
  expect(c).toMatch(/flexBasis\s*:\s*"auto"/);
}

describe.each([
  ["PendingSection", pending],
  ["ConfirmedSection", confirmed],
  ["AttendanceSection", attendance]
] as const)("%s: the sign-up card", (_n, s) => {
  it("the scan found the styles (a guard that matches nothing proves nothing)", () => {
    for (const n of ["card", "cardTop", "name"]) expect(body(s, n)).not.toBeNull();
  });
  it("reads the large-text flag", () => {
    expect(s).toMatch(/const large = useLargeText\(\)/);
    expect(s).toMatch(/useLargeText\s*\}\s*from\s*"\.\.\/\.\.\/useLargeText"/);
  });
  it("the avatar | text | chip row stacks when large, with the base flex cancelled", () => {
    expect(s).toMatch(/styles\.cardTop,\s*large && styles\.cardTopLarge/);
    expect(s).toMatch(/styles\.cardCopy,\s*large && styles\.cardCopyLarge/);
    expectStacked(s, "cardTopLarge", "cardCopyLarge");
  });
});

describe("the two-button rows stack when large (Decline / Approve, No-show / Attended)", () => {
  it.each([["PendingSection", pending], ["AttendanceSection", attendance]] as const)("%s", (_n, s) => {
    expect(s).toMatch(/styles\.actionsRow,\s*large && styles\.actionsRowLarge/);
    expect(body(s, "actionsRowLarge") as string).toMatch(/flexDirection\s*:\s*"column"/);
    expect(s).toMatch(/styles\.half,\s*large && styles\.halfLarge/);
    const h = body(s, "halfLarge") as string;
    expect(h).toMatch(/flex\s*:\s*0\b/);
    expect(h).toMatch(/alignSelf\s*:\s*"stretch"/);
  });
});

describe("chips and links grow with their text", () => {
  it("the Pending card's chip uses minHeight + padding, not a fixed height", () => {
    const b = body(pending, "chip") as string;
    expect(b).toMatch(/minHeight\s*:\s*30/);
    expect(b).toMatch(/paddingVertical\s*:/);
    expect(b).not.toMatch(fixedHeight);
  });
  it("the detail screen's chip does the same", () => {
    const b = body(detail, "chip") as string;
    expect(b).toMatch(/minHeight\s*:\s*30/);
    expect(b).toMatch(/paddingVertical\s*:/);
    expect(b).not.toMatch(fixedHeight);
  });
  it.each([["ConfirmedSection removeBtn", confirmed, "removeBtn"], ["AttendanceSection undoBtn", attendance, "undoBtn"]] as const)("%s uses minHeight 44", (_n, s, style) => {
    const b = body(s, style) as string;
    expect(b).toMatch(/minHeight\s*:\s*44/);
    expect(b).not.toMatch(fixedHeight);
  });
  it("the Confirmed card's 'Walking {animal} · Change' line wraps", () => {
    expect(body(confirmed, "animalRow") as string).toMatch(/flexWrap\s*:\s*"wrap"/);
  });
});

describe("the 'Assign an animal' / 'Change the assigned animal' picker sheets (found on the device)", () => {
  it.each([["PendingSection", pending], ["ConfirmedSection", confirmed]] as const)("%s: the sheet header wraps, so 'Close' is not pushed off the edge", (_n, s) => {
    expect(body(s, "pickerHeader") as string).toMatch(/flexWrap\s*:\s*"wrap"/);
  });
  it.each([["PendingSection", pending], ["ConfirmedSection", confirmed]] as const)("%s: the skip / clear button uses minHeight + padding, not a fixed height (it clipped 'Skip — approve without…')", (_n, s) => {
    const b = body(s, "skipBtn") as string;
    expect(b).toMatch(/minHeight\s*:\s*50/);
    expect(b).toMatch(/paddingVertical\s*:/);
    expect(b).not.toMatch(fixedHeight);
  });
});
