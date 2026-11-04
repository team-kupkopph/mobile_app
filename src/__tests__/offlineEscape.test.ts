/**
 * A screen that can be LEFT when it loads must be leavable when it FAILS.
 *
 * ⚠️ FOUND ON A REAL DEVICE, DURING US-PF3, BY SOMEONE WHO COULD NOT GET PAST IT. With the
 * backend unreachable, tapping "You" landed on Profile's offline state — "You're offline", a
 * "Try again" that cannot succeed while the server is down, and NOTHING ELSE. No tab bar, no
 * back button. The walk stopped there.
 *
 * ⚠️ IT IS ESCAPABLE, WHICH IS WHY IT SURVIVED REVIEW. The iOS edge-swipe still pops the
 * screen, so nothing is technically stuck and every automated check passed. But the only exit
 * is an invisible gesture, and a person looking at the screen sees a dead end. "Recoverable by
 * a gesture you cannot see" is not the same as "has a way out".
 *
 * ⚠️ THE SHAPE IS THE ONE #40 ALREADY VISITED AND I ONLY HALF-FIXED. These same four branches
 * replace the entire screen body. #40 noticed they dropped the safe-area inset and added it.
 * It did not notice they were also dropping the navigation chrome, because it was looking at
 * padding. Same branches, same asymmetry — correct when it loads, wrong when it fails — and a
 * second pass was needed to see the rest of it.
 *
 * The working shape is already in the codebase: ListingDetailScreen renders its ScreenHeader
 * OUTSIDE the conditional and switches only the body. Chrome does not depend on the data, so
 * it must not live inside the branch that has none.
 */
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const SCREENS = join(__dirname, "..", "screens");
const files = readdirSync(SCREENS).filter((f) => f.endsWith(".tsx"));
const read = (f: string) => readFileSync(join(SCREENS, f), "utf8");

/** Anything that gives a person a visible way off this screen. */
const EXIT = /<OwnerTabs|<ShelterTabs|<ScreenHeader|testID="btn\.back"/;

/**
 * ⚠️ A branch may render its exit through a HOISTED CONST rather than inline, and that is the
 * shape worth encouraging, not punishing: sharing one `const header = (...)` between both
 * returns is exactly how a screen stops being able to drop its chrome on one path. So a branch
 * containing `{header}` resolves to the const's own JSX and is judged on that.
 *
 * The first version of this scan did not do this and failed StoryDetailScreen AFTER it was
 * correctly fixed — it was reading for a literal `testID="btn.back"` that had moved four lines
 * up into a shared const. A guard that forces chrome to be inlined would push screens back
 * toward the duplication that caused this bug.
 */
function resolveExits(branch: string, src: string): string {
  let resolved = branch;
  for (const m of branch.matchAll(/\{(\w+)\}/g)) {
    const decl = new RegExp("const\\s+" + m[1] + "\\s*=\\s*\\(([\\s\\S]*?)\\n\\s*\\);", "m").exec(src);
    if (decl) resolved += decl[1];
  }
  return resolved;
}

/**
 * The full-screen failure branches, keyed on the signature of the bug: a `<LoadStateView>`
 * whose nearest enclosing element is the screen's own root. Same scan as
 * safeAreaOnFailure.test.ts — that shape is precisely "this replaces the whole body", and it
 * never matches the inline section placeholders that make up most LoadStateView call sites.
 */
function fullScreenBranches(src: string): string[] {
  const out: string[] = [];
  let i = src.indexOf("<LoadStateView");
  while (i !== -1) {
    const before = src.slice(0, i);
    const openIdx = before.lastIndexOf("<View");
    if (openIdx !== -1) {
      const tag = src.slice(openIdx, src.indexOf(">", openIdx) + 1);
      if (tag.includes("styles.screen")) {
        // The branch runs from its root <View> to the matching close after the LoadStateView.
        const end = src.indexOf("</View>", i);
        out.push(src.slice(openIdx, end === -1 ? src.length : end));
      }
    }
    i = src.indexOf("<LoadStateView", i + 1);
  }
  return out;
}

/**
 * SQ5 · the five shelter tab roots get their exit from the TAB NAVIGATOR, which renders the one bar around every tab, failed or
 * not. They draw no `<ShelterTabs>` themselves any more, so the EXIT scan below would silently drop them (a shrinking
 * subject list that still prints green is how scans here have under-reported before). They are judged by their own rule:
 * registered in the navigator, which renders the bar; and still carrying the full-screen failure branch the bar protects.
 */
const SHELL_ROOTS = ["ShelterDashboardScreen.tsx", "ShelterAnimalsScreen.tsx", "ShelterDonateScreen.tsx", "ShelterRequestsScreen.tsx", "ShelterProfileScreen.tsx"];
// SQ5 follow-up · the personal member's and the guest shell's roots get their exit from THEIR navigators the same way. The owner
// You tab (`ProfileScreen`) used to carry a second bar in its failure branch; it is the only one of these with a full-screen
// failure branch, and this guard would have silently dropped it from SUBJECTS when the bar left the screen.
const OWNER_GUEST_ROOTS = ["HomeScreen.tsx", "AdoptScreen.tsx", "KawangGawaScreen.tsx", "ProfileScreen.tsx", "HomeGuestScreen.tsx"];
const navigatorSrc = readFileSync(join(__dirname, "..", "navigation", "ShelterTabNavigator.tsx"), "utf8");

/** Screens that have a full-screen failure branch AND an exit on their happy path. */
const SUBJECTS = files.filter((f) => {
  const src = read(f);
  return !SHELL_ROOTS.includes(f) && !OWNER_GUEST_ROOTS.includes(f) && fullScreenBranches(src).length > 0 && EXIT.test(src);
});

describe("a failed screen still has a way out", () => {
  it("found screens with a full-screen failure branch to judge", () => {
    // Guard the guard: a broken scan would make the assertion below vacuously green, which is
    // how a scan in this repo has reported "all clear" more than once.
    expect(SUBJECTS.length).toBeGreaterThan(3);
  });

  it.each(SUBJECTS)("%s keeps a visible exit when it fails", (f) => {
    const src = read(f);
    const offenders = fullScreenBranches(src).filter((branch) => !EXIT.test(resolveExits(branch, src)));
    expect(offenders).toEqual([]);
  });
});

describe("the shelter shell supplies its own exit (SQ5)", () => {
  it("the navigator renders the bar", () => {
    expect(navigatorSrc).toMatch(/<ShelterTabs\b/);
    expect(navigatorSrc).toMatch(/tabBar=\{\(props\) => <ShelterTabBar/);
  });
  it.each(SHELL_ROOTS)("%s is a tab of that navigator", (f) => {
    expect(navigatorSrc).toContain(`component={${f.replace(".tsx", "")}}`);
  });
  it("the roots that fail as a whole screen are Dashboard, Donate and You (the three US-PF3 found)", () => {
    const failing = SHELL_ROOTS.filter((f) => fullScreenBranches(read(f)).length > 0);
    expect(failing).toEqual(["ShelterDashboardScreen.tsx", "ShelterDonateScreen.tsx", "ShelterProfileScreen.tsx"]);
  });
});

describe("the owner and guest shells supply their own exit (SQ5 follow-up)", () => {
  const owner = readFileSync(join(__dirname, "..", "navigation", "OwnerTabNavigator.tsx"), "utf8");
  const guest = readFileSync(join(__dirname, "..", "navigation", "GuestTabNavigator.tsx"), "utf8");
  it("the navigators render the bar", () => {
    expect(owner).toMatch(/<OwnerTabs\b/);
    expect(guest).toMatch(/<GuestTabs\b/);
  });
  it.each(OWNER_GUEST_ROOTS)("%s is a tab of a navigator that draws the bar", (f) => {
    const name = f.replace(".tsx", "");
    expect(owner.includes(`component={${name}}`) || guest.includes(`component={${name}}`)).toBe(true);
  });
  it("the one root that fails as a whole screen is the owner You tab", () => {
    const failing = OWNER_GUEST_ROOTS.filter((f) => fullScreenBranches(read(f)).length > 0);
    expect(failing).toEqual(["ProfileScreen.tsx"]);
  });
});
