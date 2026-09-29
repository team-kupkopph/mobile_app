// Kawang-Gawa · the five K-findings that were fixed in code but pinned by nothing (Run 1 of
// dev/test-plan-volunteer.md, coverage gap §6): K10, K15 (mobile half), K16 (UI half), K20,
// K21 (UI half). The server halves are pinned in backend volunteer/tests; `checkinState`'s
// window is pinned in volunteer.test.ts. What is left is screen wiring — which condition a
// block renders under, which touchable owns which press — so, like accessibility.test.ts,
// these read the source. Every anchor fails loudly when it is not found: a rename must not
// turn a pin into a test that passes by finding nothing.
import { readFileSync } from "fs";
import { join } from "path";

const SRC = join(__dirname, "..");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");

function at(src: string, needle: string): number {
  const i = src.indexOf(needle);
  if (i === -1) throw new Error(`anchor not found: ${needle}`);
  return i;
}

// The JSX element that owns `anchor`: from the nearest `<Tag` before it to its closing tag.
function element(src: string, anchor: string, tag: string): string {
  const i = at(src, anchor);
  const open = src.lastIndexOf(`<${tag}`, i);
  const close = src.indexOf(`</${tag}>`, i);
  if (open === -1 || close === -1) throw new Error(`no <${tag}> around ${anchor}`);
  return src.slice(open, close);
}

// The `{cond && (` guard that directly precedes `anchor` within `window` characters.
function guardBefore(src: string, anchor: string, window = 400): string {
  const i = at(src, anchor);
  const guards = [...src.slice(Math.max(0, i - window), i).matchAll(/\{([^{}]*?)\s*&&\s*\(/g)];
  if (!guards.length) throw new Error(`no {cond && (…)} guard before ${anchor}`);
  return guards[guards.length - 1][1].trim();
}

describe("K10 · the volunteer hears about their no-show record before requesting", () => {
  const src = read("screens/KawangGawaDetailScreen.tsx");
  const LINE = "Shelters can see you've missed your last 3 shifts.";

  it("renders the honesty line only when the server says needs_reapproval", () => {
    expect(guardBefore(src, LINE)).toMatch(/shift\.viewer\?\.needs_reapproval/);
  });

  it("says it as a neutral note, not a warning", () => {
    const i = at(src, LINE);
    const note = src.slice(src.lastIndexOf("<StatusNote", i), src.indexOf("/>", i));
    expect(note).toMatch(/tone="neutral"/);
  });
});

describe("K20 · the waiver link is its own control, not part of the consent checkbox", () => {
  const src = read("screens/KawangGawaDetailScreen.tsx");

  it("the waiver checkbox row neither contains the link nor navigates", () => {
    const row = element(src, 'testID="chk.kawanggawaDetail.waiver"', "TouchableOpacity");
    expect(row).not.toMatch(/lnk\.kawanggawaDetail\.waiver/);
    expect(row).not.toMatch(/navigate\(/);
  });

  it("the link opens the waiver from a touchable of its own", () => {
    const link = element(src, 'testID="lnk.kawanggawaDetail.waiver"', "TouchableOpacity");
    expect(link).toMatch(/navigate\("waiver"\)/);
    expect(link).not.toMatch(/setWaiverChecked/);
  });
});

describe("K21 · the check-in screen does not claim a future shift is today's", () => {
  const src = read("screens/KawangGawaCheckinScreen.tsx");

  it("is titled 'Your shift' and never 'Today's shift'", () => {
    expect(src).toMatch(/<ScreenHeader title="Your shift"/);
    expect(src).not.toMatch(/Today['’]s shift/);
  });

  it("offers Check in only inside the check-in window", () => {
    expect(guardBefore(src, 'label="Check in"')).toMatch(/state\?\.kind === "can_check_in"/);
  });
});

describe("K15 · a closed or ended activity offers no Edit or Cancel", () => {
  const src = read("screens/ShelterVolunteerActivityScreen.tsx");

  it("hides the footer for a closed status and for an ended shift", () => {
    const decl = src.slice(at(src, "const footerHidden ="), src.indexOf(";", at(src, "const footerHidden =")));
    expect(decl).toMatch(/shift\.status === "closed"/);
    expect(decl).toMatch(/hasEnded\(shift\)/);
  });

  it("Edit and Cancel activity live only inside the !footerHidden block", () => {
    for (const label of ['label="Edit"', 'label="Cancel activity"']) {
      expect(src.split(label).length - 1).toBe(1);
      expect(guardBefore(src, label, 1200)).toMatch(/^!footerHidden$/);
    }
  });
});

describe("K16 · attendance is not one-tap and irreversible", () => {
  const src = read("components/shelterVolunteer/AttendanceSection.tsx");

  it("No-show asks first — its press opens the confirm, it does not mark", () => {
    const i = at(src, 'label="No-show"');
    const btn = src.slice(src.lastIndexOf("<Button", i), src.indexOf("/>", i));
    expect(btn).toMatch(/onPress=\{\(\) => setNoShowSignupId\(/);
    expect(btn).not.toMatch(/markAttendance/);
  });

  it("the confirm is what marks the no-show, and says it can be undone", () => {
    const modal = src.slice(at(src, "<ConfirmModal"), src.indexOf("/>", at(src, "<ConfirmModal")));
    expect(modal).toMatch(/onConfirm=\{confirmNoShow\}/);
    expect(modal).toMatch(/undo it for 24 hours/);
    const fn = src.slice(at(src, "function confirmNoShow"), at(src, "async function undo"));
    expect(fn).toMatch(/markAttendance\(signupId, "no_show"\)/);
  });

  it("both No-show and Attended show a loading state", () => {
    for (const label of ['label="No-show"', 'label="Attended"']) {
      const i = at(src, label);
      const btn = src.slice(src.lastIndexOf("<Button", i), src.indexOf("/>", i));
      expect(btn).toMatch(/loading=\{busy\}/);
    }
  });

  it("a marked row offers Undo while the server allows it", () => {
    expect(src).toMatch(/row\.can_undo \? \(/);
    expect(src).toMatch(/\/shelter\/signups\/\$\{signupId\}\/attendance\/undo/);
  });
});
