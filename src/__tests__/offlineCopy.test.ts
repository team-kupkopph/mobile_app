/**
 * F14 · sign-in and signup name an unreachable server.
 *
 * Before this fix, a network failure (res.status === 0 — the app's sentinel for "the request
 * never reached the server") fell through to the same generic "Something went wrong." copy as
 * an actual server error. That's misleading: there's nothing to retry against, and the person
 * can't tell "the server rejected this" from "you're offline". Both screens must special-case
 * res.status === 0 with copy that names the actual problem and suggests the actual fix.
 */
import { readFileSync } from "fs";
import { join } from "path";

const SCREENS = join(__dirname, "..", "screens");
const read = (f: string) => readFileSync(join(SCREENS, f), "utf8");

const OFFLINE_COPY = "Couldn't reach the server. Check your connection and try again.";

const FILES = ["SigninScreen.tsx", "SignupScreen.tsx"];

describe("F14: unreachable-server copy", () => {
  it("has the screens it means to check", () => {
    // A assert the scan found something before trusting that it found nothing.
    expect(FILES.every((f) => read(f).length > 0)).toBe(true);
  });

  it.each(FILES)("%s checks res.status === 0", (file) => {
    expect(read(file)).toMatch(/res\.status === 0/);
  });

  it.each(FILES)("%s names the unreachable-server condition", (file) => {
    expect(read(file)).toMatch(/Couldn't reach the server\. Check your connection and try again\./);
  });

  it("sign-in sets the offline copy via setError", () => {
    const src = read("SigninScreen.tsx");
    const match = src.match(/if \(res\.status === 0\) \{[^}]*\}/);
    expect(match).not.toBeNull();
    expect(match![0]).toContain("setError(");
    expect(match![0]).toContain(OFFLINE_COPY);
  });

  it("signup sets the offline copy via setFormError", () => {
    const src = read("SignupScreen.tsx");
    const match = src.match(/if \(res\.status === 0\) \{[^}]*\}/);
    expect(match).not.toBeNull();
    expect(match![0]).toContain("setFormError(");
    expect(match![0]).toContain(OFFLINE_COPY);
  });
});
