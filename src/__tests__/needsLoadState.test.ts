/**
 * Found on the device (Run 6 part 12, the shelter Wishlist at AX5): the Wishlist screen sat on its loading spinner for ever, although
 * `GET /shelters/{id}/needs` had answered 200 with an empty list. The screen declared `const [res, setRes] = useState<...>(null)` and
 * rendered from `loadState(res, ...)`, but never called `setRes`, so `res` stayed `null` and `loadState(null)` is "loading" for ever.
 * The result was thrown away, so the shelter could never see a need it had posted, whether or not any existed.
 *
 * `loadStateScreens.test.ts` (US-O1) checks that a result is not DISCARDED (`r.ok && setX(...)`) and that lists do not start as `[]`;
 * this is the third way the same bug hides: the state is declared and read but nothing ever sets it. The scan below is derived from a
 * directory walk (as US-G1 requires) and asserts that it found the declarations before asserting that none is orphaned.
 */
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

const SCREENS = join(__dirname, "..", "screens");
const needs = readFileSync(join(SCREENS, "ShelterNeedsScreen.tsx"), "utf-8");

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? tsxFiles(p) : p.endsWith(".tsx") ? [p] : [];
  });
}

describe("a load-state hook that is declared must be set", () => {
  const DECL = /const \[(\w+), (set\w+)\] = useState<\{ ok: boolean; status: number \} \| null>/g;
  const found: Array<{ file: string; setter: string; src: string }> = [];
  for (const file of tsxFiles(join(__dirname, ".."))) {
    if (file.includes("__tests__")) continue;
    const src = readFileSync(file, "utf-8");
    for (const m of src.matchAll(DECL)) found.push({ file: file.split("src/")[1], setter: m[2], src: src.replace(m[0], "") });
  }

  it("the scan found the declarations (a guard that matches nothing proves nothing)", () => {
    expect(found.length).toBeGreaterThanOrEqual(40);
    expect(found.map((f) => f.file)).toContain("screens/ShelterNeedsScreen.tsx");
  });

  it("every one is called somewhere in its file", () => {
    const orphans = found.filter((f) => !new RegExp(`${f.setter}\\(`).test(f.src)).map((f) => `${f.file}: ${f.setter}`);
    expect(orphans).toEqual([]);
  });
});

describe("the Wishlist (ShelterNeedsScreen) load", () => {
  it("records the needs request's result, so the screen can leave 'loading'", () => {
    expect(needs).toMatch(/setRes\(\{ ok: r\.ok, status: r\.status \}\)/);
  });
  it("records a failed /me too, so a failed first request is an error state and not a spinner", () => {
    const load = needs.slice(needs.indexOf("const load"), needs.indexOf("useFocusEffect(load)"));
    expect(load).toMatch(/if \(!me\.ok\)[\s\S]*setRes\(/);
  });
  it("does not turn a failure into an empty list (US-O1)", () => {
    expect(needs).not.toMatch(/setNeeds\(r\.ok \? r\.data\.results : \[\]\)/);
  });
});
