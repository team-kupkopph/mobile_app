/**
 * Every sign-in path enters the shell for who the person IS (spec 2026-11-04-account-aware-first-screen-design.md §3.2):
 * five files, seven sites, none of which may call `enterOwnerShell` any more. A scan, so it names what it must find and
 * asserts it found it.
 */
import { readFileSync } from "fs";
import { join } from "path";

const read = (f: string) => readFileSync(join(__dirname, "..", "screens", f), "utf8");
const SIGN_IN_FILES = ["SigninScreen.tsx", "OtpScreen.tsx", "AccountTypeScreen.tsx", "ShelterTierScreen.tsx", "RestoreAccountScreen.tsx"];
const code = (s: string) => s.split("\n").filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*")).join("\n");

describe("sign-in screens", () => {
  it("found all five files", () => {
    expect(SIGN_IN_FILES.map(read).filter((s) => s.length > 0)).toHaveLength(5);
  });

  it.each(SIGN_IN_FILES)("%s enters through enterSignedInShell and never enterOwnerShell", (f) => {
    const src = code(read(f));
    expect(src).toMatch(/enterSignedInShell\(/);
    expect(src).not.toMatch(/enterOwnerShell\(/);
  });

  it("finds six sign-in sites in all (the plan said seven; it was one over)", () => {
    const n = SIGN_IN_FILES.map((f) => (code(read(f)).match(/enterSignedInShell\(/g) ?? []).length).reduce((a, b) => a + b, 0);
    expect(n).toBe(6);
  });
});

describe("sign-up records the type it already knows, before it navigates on", () => {
  const before = (src: string, remember: string, nav: string) => {
    const a = src.indexOf(remember);
    expect(a).toBeGreaterThan(-1);
    expect(src.indexOf(nav, a)).toBeGreaterThan(a);
  };

  it("OtpScreen: shelter signup and personal signup", () => {
    const src = code(read("OtpScreen.tsx"));
    before(src, 'setAccountType("shelter")', 'navigation.navigate("shelterSetup"');
    before(src, 'setAccountType("personal")', 'navigation.navigate("signupSuccess")');
  });

  it("AccountTypeScreen: a new social account is personal", () => {
    before(code(read("AccountTypeScreen.tsx")), 'setAccountType("personal")', 'navigation.navigate("signupSuccess")');
  });

  it("ShelterTierScreen: a new social account is a shelter", () => {
    before(code(read("ShelterTierScreen.tsx")), 'setAccountType("shelter")', 'navigation.navigate("shelterSetup"');
  });
});
