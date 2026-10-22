/**
 * The giver's side of the Abot-tulong wishlist refactor (Task 7; BA review findings AW8, AW9, AW13, AW14a/b, AW28, DE-14):
 *
 *  - AW13 · each of the three screens refetches on focus (`useFocusEffect`), so a pledge made / cancelled / settled elsewhere shows when you come back.
 *  - AW14a · the wishlist on `DonateScreen` has its OWN load state and renders `LoadStateView` for it; a failed request used to hide the whole section.
 *  - AW14b · a shelter with needs but no verified QR must not read as "donations unavailable".
 *  - AW8 / DE-14 · a guest sees the SignupWall instead of a doomed request; a 401 mid-pledge raises it too.
 *  - AW9 · every pledge failure goes through `pledgeErrorCopy`; the error colour is a theme token, not the hex.
 *  - the pledge form uses `MAX_QTY` and `overPledgeWarning`; My donations uses `pledgeStatusChip` + `quantityLabel`.
 *
 * Source scans in the house style (the app's jest covers modules and file guards, not renders); the rules themselves are unit-tested in community.test.ts.
 */
import { readFileSync } from "fs";
import { join } from "path";

const read = (...p: string[]) => readFileSync(join(__dirname, "..", ...p), "utf-8");
const donate = read("screens", "DonateScreen.tsx");
const pledge = read("screens", "DonatePledgeScreen.tsx");
const mine = read("screens", "MyDonationsScreen.tsx");
const wall = read("components", "SignupWall.tsx");
const intent = read("guestIntent.ts");
const home = read("screens", "HomeScreen.tsx");
const SCREENS: Array<[string, string]> = [["DonateScreen", donate], ["DonatePledgeScreen", pledge], ["MyDonationsScreen", mine]];

describe("the scan found its files (a guard that matches nothing proves nothing)", () => {
  it.each(SCREENS)("%s is a non-trivial source", (_n, src) => {
    expect(src.length).toBeGreaterThan(1500);
    expect(src).toMatch(/export function \w+Screen/);
  });
});

describe("AW13 · refetch on focus", () => {
  it.each(SCREENS)("%s uses useFocusEffect", (_n, src) => {
    expect(src).toMatch(/import \{[^}]*\buseFocusEffect\b[^}]*\} from "@react-navigation\/native"/);
    expect(src).toMatch(/useFocusEffect\(/);
  });
});

describe("AW28 · the error colour is a theme token", () => {
  it.each(SCREENS)("%s does not hard-code #B23B3B", (_n, src) => {
    expect(src.toUpperCase()).not.toContain("#B23B3B");
  });
  it("the pledge error is colors.danger", () => {
    expect(pledge).toMatch(/error:\s*\{[^{}]*color:\s*colors\.danger/);
  });
});

describe("DonatePledgeScreen", () => {
  it("takes its words and rules from community.ts", () => {
    for (const name of ["pledgeErrorCopy", "overPledgeWarning", "MAX_QTY", "remainingAfter", "quantityLabel"]) {
      expect(pledge).toMatch(new RegExp(`import \\{[^}]*\\b${name}\\b[^}]*\\} from "\\.\\./community"`));
    }
  });
  it("AW8: raises the SignupWall for a guest (and for a 401), setting the donate intent", () => {
    expect(pledge).toMatch(/import \{[^}]*\bSignupWall\b[^}]*\} from "\.\.\/components\/SignupWall"/);
    expect(pledge).toMatch(/tokens === null/);
    expect(pledge).toMatch(/<SignupWall/);
    expect(pledge).toMatch(/setIntent\("donate"\)/);
    expect(pledge).toMatch(/action="donate"/);
  });
  it("AW8: a guest never reaches the form (the guest branch replaces the form, ahead of the pledge button)", () => {
    const guestReturn = pledge.indexOf("{isGuest ? (");
    expect(guestReturn).toBeGreaterThan(-1);
    expect(guestReturn).toBeLessThan(pledge.indexOf("Pledge this"));
  });
  it("sends pledge failures through pledgeErrorCopy, reloading the need when it says so", () => {
    expect(pledge).toMatch(/pledgeErrorCopy\(res\.status, res\.data\?\.error\?\.code\)/);
    expect(pledge).toMatch(/copy\.reload/);
    expect(pledge).toMatch(/copy\.wall/);
  });
  it("caps the stepper at MAX_QTY and puts the over-pledge nudge under it", () => {
    expect(pledge).toMatch(/Math\.min\(MAX_QTY,/);
    expect(pledge).toMatch(/overPledgeWarning\(qty, remaining\)/);
  });
  it("has an optional, 280-character note labelled for the shelter", () => {
    expect(pledge).toMatch(/label="Note for the shelter \(optional\)"/);
    expect(pledge).toMatch(/maxLength=\{280\}/);
    expect(pledge).toMatch(/\{ quantity: qty,[^}]*note/);
  });
  it("shows the shelter's drop-off instructions on the form and on the confirmation", () => {
    expect(pledge).toMatch(/api\.get\(`\/needs\/\$\{needId\}`\)/);
    expect(pledge).toMatch(/donation_instructions/);
    expect((pledge.match(/<DropOff\b/g) ?? []).length).toBe(2);
    expect(pledge).toContain("How to drop off");
  });
  it("a 404 on the need (it or its shelter is gone) replaces the form with the shared gone state; other failures do not", () => {
    expect(pledge).toMatch(/loadState\(needRes\)\.kind === "gone"/);
    expect(pledge).toMatch(/<LoadStateView state=\{\{ kind: "gone" \}\}[^>]*onBack=/);
  });
  it("the form's ScrollViews follow the keyboard (it has a text field now)", () => {
    const tags = [...pledge.matchAll(/<ScrollView\b[^>]*>/g)].map((m) => m[0]);
    expect(tags.length).toBe(2);
    for (const t of tags) expect(t).toMatch(/automaticallyAdjustKeyboardInsets/);
  });
  it("keeps the route params the caller passes", () => {
    expect(pledge).toMatch(/const \{ needId, needTitle, shelterName \} = route\.params/);
  });
});

describe("the SignupWall has a donate kind", () => {
  it("is part of the intent type, the wall copy and Home's welcome toast", () => {
    expect(intent).toMatch(/GuestIntentAction = [^;]*"donate"/);
    expect(wall).toMatch(/case "donate":/);
    expect(home).toMatch(/case "donate":/);
  });
});

describe("AW14a · DonateScreen's wishlist load state", () => {
  it("declares a needs load state and records the request's result", () => {
    expect(donate).toMatch(/\[needsRes, setNeedsRes\] = useState<\{ ok: boolean; status: number \} \| null>/);
    expect(donate).toMatch(/setNeedsRes\(\{ ok: r\.ok, status: r\.status \}\)/);
  });
  it("renders LoadStateView for it, with a retry", () => {
    expect(donate).toMatch(/needsState\.kind !== "ready"/);
    expect(donate).toMatch(/<LoadStateView[^>]*state=\{needsState\}[^>]*onRetry=/s);
  });
  it("does not turn a failed request into an empty wishlist", () => {
    expect(donate).not.toMatch(/setNeeds\(r\.ok \? r\.data\.results : \[\]\)/);
  });
  it("shows progress with the unit and pledged count, and the giver's own pledge", () => {
    expect(donate).toMatch(/needProgressLabel\(need\.quantity_received, need\.quantity_needed, need\.unit, need\.quantity_pledged\)/);
    expect(donate).toMatch(/You pledged \{quantityLabel\(need\.my_pledged, need\.unit\)\}/);
    expect(donate).toMatch(/need\.my_pledged \? \(|need\.my_pledged > 0/);
  });
});

describe("AW14b · DonateScreen with needs but no QR", () => {
  it("says so plainly, and points at the wishlist, instead of claiming donations are unavailable", () => {
    expect(donate).toContain("This shelter doesn't take QR donations yet — you can still pledge an item below.");
  });
  it("keeps the QR plan's own states (the card, its image fallback, the load-state copy)", () => {
    expect(donate).toMatch(/emptyTitle="Donations aren't available for this org yet\."/);
    expect(donate).toMatch(/onError=\{/);
  });
});

describe("MyDonationsScreen", () => {
  it("uses the shared chip and quantity wording", () => {
    expect(mine).toMatch(/import \{[^}]*\bpledgeStatusChip\b[^}]*\} from "\.\.\/community"/);
    expect(mine).toMatch(/import \{[^}]*\bquantityLabel\b[^}]*\} from "\.\.\/community"/);
    expect(mine).toMatch(/pledgeStatusChip\(p\.status, p\.cancel_reason\)/);
    expect(mine).not.toMatch(/pledged \{p\.quantity\}/);
  });
  it("pages through `next` with a secondary Load more button", () => {
    expect(mine).toMatch(/Load more/);
    expect(mine).toMatch(/variant="secondary"/);
    expect(mine).toMatch(/\.next/);
  });
  it("a 409 on cancel reloads the list instead of saying it could not cancel", () => {
    expect(mine).toMatch(/res\.status === 409/);
  });
  it("shows the wall to a guest", () => {
    expect(mine).toMatch(/<SignupWall/);
    expect(mine).toMatch(/tokens === null/);
  });
  it("keeps the AX5 stacking", () => {
    expect(mine).toMatch(/useLargeText\(\)/);
    expect(mine).toMatch(/styles\.row, large && styles\.rowLarge/);
  });
});
