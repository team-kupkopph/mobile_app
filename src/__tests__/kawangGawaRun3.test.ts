// Kawang-Gawa · Run 3 polish (dev/test-plan-volunteer.md): F-R3-2, F-R3-5, and the two Run 2
// leftovers F-R2-2 and F-R2-3. F-R3-3 (upcoming/requested order) is server-side and pinned in
// backend volunteer/tests/test_my_signups.py. `historyLateNote` is pure and tested directly;
// the rest is screen wiring, so — like kawangGawaPins.test.ts — these read the source, and every
// anchor fails loudly when it is not found.
import { readFileSync } from "fs";
import { join } from "path";

import { historyLateNote } from "../volunteer";

const SRC = join(__dirname, "..");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");

function at(src: string, needle: string): number {
  const i = src.indexOf(needle);
  if (i === -1) throw new Error(`anchor not found: ${needle}`);
  return i;
}

// The source of the function component `name`, up to the next top-level function.
function fn(src: string, name: string): string {
  const i = at(src, `function ${name}(`);
  const end = src.indexOf("\nfunction ", i + 1);
  const endExport = src.indexOf("\nexport function ", i + 1);
  const stops = [end, endExport].filter((n) => n !== -1);
  return src.slice(i, stops.length ? Math.min(...stops) : undefined);
}

describe("F-R2-2 · a late cancel is visible in the volunteer's own history", () => {
  it("historyLateNote reads the server's was_late, on cancelled rows only", () => {
    expect(historyLateNote({ status: "cancelled", was_late: true })).toBe("Late cancel · under 12 hours' notice");
    expect(historyLateNote({ status: "cancelled", was_late: false })).toBeNull();
    // was_late is only meaningful on a cancel; never annotate anything else.
    expect(historyLateNote({ status: "completed", was_late: true })).toBeNull();
    expect(historyLateNote({ status: "no_show", was_late: true })).toBeNull();
  });

  it("HistoryRow renders the note", () => {
    const row = fn(read("components/volunteer/MyShifts.tsx"), "HistoryRow");
    expect(row).toContain("historyLateNote(item)");
    expect(row).toMatch(/\{lateNote && <Text[^>]*>\{lateNote\}<\/Text>\}/);
  });
});

describe("F-R2-3 · a brand-new account's My shifts still has its stats card", () => {
  const my = fn(read("components/volunteer/MyShifts.tsx"), "MyShifts");

  it("there is no early return on isEmpty — the stats card is unconditional", () => {
    expect(my).not.toMatch(/if \(isEmpty\)/);
    // The stats card is the first thing the returned tree draws.
    const ret = my.slice(at(my, "return ("));
    expect(ret.indexOf("styles.statsCard")).toBeGreaterThan(-1);
    expect(ret.indexOf("styles.statsCard")).toBeLessThan(ret.indexOf("Awaiting approval"));
  });

  it("the empty copy renders beneath the stats card, under isEmpty", () => {
    const stats = at(my, "styles.statsCard");
    const copy = at(my, "No shifts yet.");
    expect(copy).toBeGreaterThan(stats);
    expect(my.slice(0, copy)).toMatch(/\{isEmpty && \(\s*<View style=\{styles\.emptyWrap\}>\s*<Text[^>]*>$/);
  });
});

describe("KawangGawaScreen", () => {
  const screen = read("screens/KawangGawaScreen.tsx");

  it("F-R3-5 · the Next strip opens check-in on My shifts instead of a no-op setTabIndex(1)", () => {
    const strip = screen.slice(at(screen, "style={styles.impactNext}"), at(screen, "styles.impactNextCopy"));
    expect(strip).toMatch(
      /tabIndex === 1\s*\?\s*navigation\.navigate\("kawanggawaCheckin", \{ signupId: next\.signup_id \}\)\s*:\s*setTabIndex\(1\)/
    );
    expect(strip).not.toMatch(/onPress=\{\(\) => setTabIndex\(1\)\}/);
  });

  it("F-R3-2 · Browse Retry reloads /me/signups as well as the feed", () => {
    const browse = screen.slice(at(screen, "emptyTitle={"));
    const retry = browse.slice(at(browse, "onRetry="), at(browse, "/>"));
    expect(retry).toContain("load();");
    expect(retry).toContain("if (!isGuest) loadMine();");
  });
});
