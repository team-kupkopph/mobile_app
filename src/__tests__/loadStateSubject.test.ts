/**
 * O6-6 · PL-9 — Your listing's applicants fetch failing read "Couldn't load this applicants".
 * `loadStateCopy`'s contract is a BARE SINGULAR NOUN, and the sentences add "this" (net.ts, US-R2).
 * Four callers broke it with a plural or a possessive: "applicants", "shifts", "requests" and
 * "your pets" (which would have read "Couldn't load this your pets"). Seen on the device in Run 6
 * part 6 at PL-9; the other three were found by reading every caller.
 *
 * Two parts: a guard over every `subject="…"` in src (so a fifth cannot arrive), and the exact copy.
 */
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { loadStateCopy } from "../net";

const SRC = join(__dirname, "..");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "__tests__") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith(".tsx")) out.push(p);
  }
  return out;
}

const subjects: Array<{ file: string; subject: string }> = [];
for (const file of walk(SRC)) {
  for (const m of readFileSync(file, "utf-8").matchAll(/\bsubject="([^"]+)"/g)) {
    subjects.push({ file: file.slice(SRC.length + 1), subject: m[1] });
  }
}

/** The noun the sentence hangs on: "list of applicants" → "list", "settings page" → "settings page". */
const head = (s: string) => s.split(" of ")[0].trim();
const looksPlural = (noun: string) => /s$/.test(noun) && !/(us|ss)$/.test(noun);
const looksPossessive = (s: string) => /^(your|my|the|this|a|an)\s/i.test(s);

describe("every LoadStateView subject is a bare singular noun (O6-6)", () => {
  it("the scan found the callers (a guard that matches nothing proves nothing)", () => {
    expect(subjects.length).toBeGreaterThanOrEqual(20);
    expect(subjects.map((s) => s.subject)).toEqual(expect.arrayContaining(["listing", "report", "applicant"]));
  });

  it("none is a plural", () => {
    const bad = subjects.filter((s) => looksPlural(head(s.subject)));
    expect(bad).toEqual([]);
  });

  it("none starts with a determiner or possessive (the sentence adds 'this')", () => {
    const bad = subjects.filter((s) => looksPossessive(s.subject));
    expect(bad).toEqual([]);
  });

  it("the four former offenders are now 'list of …'", () => {
    const by = (file: string) => subjects.filter((s) => s.file.endsWith(file)).map((s) => s.subject);
    expect(by("PosterListingScreen.tsx")).toContain("list of applicants");
    expect(by("KawangGawaScreen.tsx")).toContain("list of shifts");
    expect(by("PendingSection.tsx")).toContain("list of requests");
    expect(by("ReportStrayScreen.tsx")).toContain("list of pets");
  });
});

describe("the copy reads as a sentence with the new subjects (O6-6)", () => {
  const err = { kind: "error", retryable: true } as const;
  it("error", () => {
    expect(loadStateCopy(err, undefined, undefined, "list of applicants").title).toBe("Couldn't load this list of applicants");
    expect(loadStateCopy(err, undefined, undefined, "list of pets").title).toBe("Couldn't load this list of pets");
  });
  it("gone", () => {
    expect(loadStateCopy({ kind: "gone" }, undefined, undefined, "list of shifts").title).toBe("This list of shifts is no longer available");
  });
  it("a singular subject is untouched", () => {
    expect(loadStateCopy(err, undefined, undefined, "listing").title).toBe("Couldn't load this listing");
  });
});
