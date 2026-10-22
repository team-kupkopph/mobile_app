/**
 * The shelter's side of the Abot-tulong wishlist refactor (Task 8; BA review findings AW10, AW11, AW17, AW20, WD8, WD9, US-W3):
 *
 *  - AW10 · NeedPledgesScreen loads the need by id (`GET /needs/{id}`) on focus and after every write. A bell/push tap opens it with ONLY a
 *    `needId`, so a read of `route.params.need.` would crash that entry; the Task 6 stop-gap narrowing is gone.
 *  - AW11 · its actions come from `needActions(status)`; WD8 · "Mark received" is a ConfirmModal with the actual-quantity preview.
 *  - WD9 · NeedForm / NeedPledges / DonationInstructions are V3: ScreenBackdrop, Card, Chip, Button, no local `card` / `CHIP` constants.
 *  - AW17 · the Donate tab no longer fans out `/needs/{id}/pledges` per need, tells a failed request from an empty wishlist, and gates "Add a need".
 *  - US-W3 · the dashboard has a Wishlist line, tapping through to the wishlist.
 *
 * Source scans in the house style (the app's jest covers modules and file guards, not renders); the rules themselves are unit-tested in
 * community.test.ts, shelterDonate.test.ts and shelterDashboard.test.ts.
 */
import { readFileSync } from "fs";
import { join } from "path";

import { V3_SCOPE } from "./v3Scope";

const read = (...p: string[]) => readFileSync(join(__dirname, "..", ...p), "utf-8");
/** Comments blanked: a guard that says "no X" must not be tripped by a sentence explaining why X is gone. */
const code = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const pledges = read("screens", "NeedPledgesScreen.tsx");
const form = read("screens", "NeedFormScreen.tsx");
const needs = read("screens", "ShelterNeedsScreen.tsx");
const instr = read("screens", "DonationInstructionsScreen.tsx");
const donate = read("screens", "ShelterDonateScreen.tsx");
const dash = read("screens", "ShelterDashboardScreen.tsx");
const nav = read("navigation", "RootNavigator.tsx");
const navTypes = read("navigation", "types.ts");
const modal = read("components", "ConfirmModal.tsx");
const stepper = read("components", "QuantityStepper.tsx");
const V3_SHELTER: Array<[string, string]> = [
  ["NeedPledgesScreen", pledges], ["NeedFormScreen", form], ["DonationInstructionsScreen", instr]
];

describe("the scan found its files (a guard that matches nothing proves nothing)", () => {
  it.each([...V3_SHELTER, ["ShelterNeedsScreen", needs], ["ShelterDonateScreen", donate], ["ShelterDashboardScreen", dash]] as Array<[string, string]>)(
    "%s is a non-trivial source", (_n, src) => {
      expect(src.length).toBeGreaterThan(1500);
      expect(src).toMatch(/export function \w+Screen/);
    }
  );
});

describe("WD9 · the three screens are V3", () => {
  it.each(V3_SHELTER)("%s is in V3_SCOPE", (name) => {
    expect(V3_SCOPE).toContain(name);
  });
  it.each(V3_SHELTER)("%s renders ScreenBackdrop and has no local card / CHIP constant", (_n, src) => {
    expect(src).toMatch(/<ScreenBackdrop\b/);
    expect(src).not.toMatch(/\bconst card\s*=/);
    expect(src).not.toMatch(/\bconst CHIP\b/);
  });
  it("NeedPledgesScreen uses the shared Card, Chip and Button", () => {
    expect(pledges).toMatch(/import \{[^}]*\bButton\b[^}]*\bCard\b[^}]*\bChip\b[^}]*\} from "\.\.\/components\/ui"/);
    expect(pledges).toMatch(/<Card\b/);
    expect(pledges).toMatch(/<Chip\b/);
    expect(pledges).toMatch(/<Button\b/);
  });
});

describe("AW10 · NeedPledgesScreen loads the need by id", () => {
  it("never reads a field off route.params.need (a notification opens it with only needId)", () => {
    expect(pledges).not.toMatch(/route\.params\.need\./);
    expect(pledges).not.toMatch(/route\.params as \{/);
  });
  it("the Task 6 stop-gap is gone, comment and all", () => {
    expect(pledges).not.toMatch(/TEMPORARY/);
  });
  it("fetches GET /needs/{id} and its pledges, on focus", () => {
    expect(pledges).toMatch(/api\.get\(`\/needs\/\$\{needId\}`\)/);
    expect(pledges).toMatch(/api\.get\(`\/needs\/\$\{needId\}\/pledges`\)/);
    expect(pledges).toMatch(/useFocusEffect\(load\)/);
  });
  it("route.params.need is at most a first-paint placeholder", () => {
    expect(pledges).toMatch(/useState<[^>]*>\(route\.params\.need/);
  });
  it("reloads after every write", () => {
    expect((pledges.match(/\bload\(\)/g) ?? []).length).toBeGreaterThanOrEqual(4);
    expect(pledges).toMatch(/if \(res\.ok\) \{ setError\(null\); load\(\); return; \}/);
  });
  it("a 404 on the need (it is gone) shows the shared gone state, even over a placeholder", () => {
    expect(pledges).toMatch(/needState\.kind === "gone"/);
    expect(pledges).toMatch(/<LoadStateView state=\{needState\} subject="need" onRetry=\{retry\} onBack=/);
  });
});

describe("AW11 · actions follow the need's state", () => {
  it("comes from needActions", () => {
    expect(pledges).toMatch(/import \{[^}]*\bneedActions\b[^}]*\} from "\.\.\/community"/);
    expect(pledges).toMatch(/needActions\(need\.status\)/);
    expect(pledges).toMatch(/actions\.edit/);
    expect(pledges).toMatch(/actions\.complete/);
    expect(pledges).toMatch(/actions\.receive/);
  });
  it("Close need is replaced by Mark complete, which calls POST /needs/{id}/complete", () => {
    expect(pledges).not.toMatch(/Close need/);
    expect(pledges).not.toMatch(/status: "closed"/);
    expect(pledges).toContain("Mark complete");
    expect(pledges).toMatch(/api\.post\(`\/needs\/\$\{needId\}\/complete`/);
    expect(pledges).toMatch(/completeNeedBody\(/);
  });
});

describe("WD8 · Mark received confirms the ACTUAL quantity", () => {
  it("opens the shared ConfirmModal with the preview line and the can't-be-undone sentence", () => {
    expect(pledges).toMatch(/import \{ ConfirmModal \} from "\.\.\/components\/ConfirmModal"/);
    expect((pledges.match(/<ConfirmModal\b/g) ?? []).length).toBe(2);
    expect(pledges).toMatch(/receivedPreview\(/);
    expect(pledges).toContain("Can't be undone — confirm only what's actually arrived.");
  });
  it("sends the stepper's quantity, not the pledged one, to /received", () => {
    expect(pledges).toMatch(/api\.post\(`\/needs\/\$\{needId\}\/received`/);
    expect(pledges).toMatch(/quantity_received: recvQty/);
    expect(pledges).toMatch(/<QuantityStepper value=\{recvQty\} onChange=\{setRecvQty\}/);
    expect(stepper).toMatch(/max = MAX_QTY/);
    expect(stepper).toMatch(/Math\.min\(max, value \+ 1\)/);
  });
  it("the stepper defaults to what was pledged", () => {
    expect(pledges).toMatch(/setRecvQty\(p\.quantity\)/);
  });
  it("a 409 reloads the screen instead of a dead 'Couldn't confirm'", () => {
    expect(pledges).toMatch(/res\.status === 409/);
    expect(pledges).not.toMatch(/Couldn't confirm/);
  });
  it("ConfirmModal takes an optional children slot, and its existing props are unchanged", () => {
    expect(modal).toMatch(/children\?: ReactNode/);
    expect(modal).toMatch(/\{children\}/);
    for (const p of ["visible", "title", "body", "confirmLabel", "tone", "onConfirm", "onCancel", "secondaryLabel", "onSecondary"]) {
      expect(modal).toMatch(new RegExp(`\\b${p}\\??:`));
    }
  });
});

describe("pledge rows", () => {
  it("show the donor's note, decided_at ?? created_at, and the shared chip with the cancel reason", () => {
    expect(pledges).toMatch(/p\.note/);
    expect(pledges).toMatch(/pledgeWhen\(p\.decided_at \?\? p\.created_at\)/);
    expect(pledges).toMatch(/pledgeStatusChip\(p\.status, p\.cancel_reason\)/);
  });
});

describe("AW20 · NeedFormScreen", () => {
  it("no longer offers `funds` (the backend refuses it)", () => {
    const cats = form.slice(form.indexOf("const CATEGORIES"), form.indexOf("] as const") + 10);
    expect(cats.length).toBeGreaterThan(20);
    expect(cats).not.toContain("funds");
  });
  it("lets the category change on edit (the picker is not behind `!editing`)", () => {
    const groupLabel = form.indexOf('<Text style={styles.groupLabel}>Category</Text>');
    expect(groupLabel).toBeGreaterThan(-1);
    expect(form.slice(Math.max(0, groupLabel - 60), groupLabel)).not.toMatch(/editing/);
  });
  it("has a unit field capped at 16 characters", () => {
    expect(form).toMatch(/label="Unit \(optional\)"/);
    expect(form).toMatch(/maxLength=\{NEED_UNIT_MAX\}/);
  });
  it("validates through needFormErrors, and keeps each error under its own field", () => {
    expect(form).toMatch(/needFormErrors\(/);
    expect(form).toMatch(/error=\{errors\.title\}/);
    expect(form).toMatch(/error=\{errors\.description\}/);
    expect(form).toMatch(/errors\.quantity/);
  });
  it("maps a failed save through needSaveError (below_received lands under the quantity)", () => {
    expect(form).toMatch(/needSaveError\(res\.status, res\.data\?\.error\?\.code, res\.data\?\.error\?\.details\)/);
  });
  it("steps the quantity with the shared QuantityStepper, which caps at MAX_QTY", () => {
    expect(form).toMatch(/<QuantityStepper value=\{qty\} onChange=\{setQty\}/);
    expect(stepper).toMatch(/max = MAX_QTY/);
  });
  it("still refuses to submit on a failed prefill", () => {
    expect(form).toMatch(/PREFILL_FAILED/);
    expect(form).toMatch(/!editing && !myId/);
  });
});

describe("ShelterNeedsScreen", () => {
  it("shows the pledge count and an amber 'to confirm' tag", () => {
    expect(needs).toMatch(/awaitingConfirmTag\(need\.awaiting_confirm\)/);
    expect(needs).toMatch(/pledgeCountLabel\(need\.pledge_count/);
    expect(needs).toMatch(/tone="warning"/);
  });
  it("passes the id (the screen loads the need itself)", () => {
    expect(needs).toMatch(/navigate\("needPledges", \{ needId: need\.need_id/);
  });
  it("links to Drop-off instructions, and pages with Load more", () => {
    expect(needs).toContain("Drop-off instructions");
    expect(needs).toMatch(/navigate\("donationInstructions"/);
    expect(needs).toContain("Load more");
    expect(needs).toMatch(/\.next/);
  });
});

describe("DonationInstructionsScreen", () => {
  it("is registered in the navigator and its param list", () => {
    expect(nav).toMatch(/name="donationInstructions" component=\{DonationInstructionsScreen\}/);
    expect(navTypes).toMatch(/donationInstructions: undefined/);
  });
  it("edits one multiline Field and PATCHes /shelter/profile, refusing to save over a failed prefill", () => {
    expect(instr).toMatch(/<Field\b[\s\S]*?multiline/);
    expect(instr).toMatch(/maxLength=\{INSTRUCTIONS_MAX\}/);
    expect(instr).toMatch(/api\.patch\("\/shelter\/profile", \{ donation_instructions/);
    expect(instr).toMatch(/<PrefillWarning\b/);
    expect(instr).toMatch(/if \(prefillFailed \|\| !loaded\)/);
  });
});

describe("AW17 · ShelterDonateScreen", () => {
  it("does not fan out a pledges request per need", () => {
    // The scan found the screen's requests (a guard that matches nothing proves nothing)...
    expect(code(donate)).toMatch(/api\.get\(`\/shelters\/\$\{accountId\}\/needs`\)/);
    // ...and none of them is a per-need pledges call.
    expect(code(donate)).not.toMatch(/\/pledges/);
    expect(code(donate)).not.toMatch(/Promise\.all/);
  });
  it("reads pledged from the list rows", () => {
    expect(donate).toMatch(/donateSections\(dash, qr, needs\)/);
  });
  it("tells a failed wishlist request from an empty one, with a retry", () => {
    expect(donate).toMatch(/needsRes/);
    expect(donate).toMatch(/<LoadStateView state=\{needsState\} onRetry=\{retryNeeds\}/);
    expect(donate).not.toMatch(/setNeeds\(\[\]\)/);
  });
  it("a failed /me does not leave the wishlist on a spinner", () => {
    expect(donate).toMatch(/if \(!me\.ok\)[\s\S]*setNeedsRes\(/);
  });
  it("each row opens that need's pledges", () => {
    expect(donate).toMatch(/navigate\("needPledges", \{ needId: /);
  });
  it("'Add a need' follows the profile's approval gate (/me is_verified_rescuer): no action for a gated shelter", () => {
    expect(donate).toMatch(/is_verified_rescuer/);
    expect(donate).toMatch(/const gated = verifiedRescuer !== true/);
    expect(donate).toMatch(/actionLabel=\{gated \? undefined : "Add a need"\}/);
  });
});

describe("US-W3 · the dashboard's Wishlist line", () => {
  it("comes from wishlistSummary and opens the wishlist", () => {
    expect(dash).toMatch(/import \{[^}]*\bwishlistSummary\b[^}]*\} from "\.\.\/shelterDashboard"/);
    expect(dash).toMatch(/wishlistSummary\(dash\.wishlist\)/);
    expect(dash).toMatch(/>Wishlist</);
    expect(dash).toMatch(/navigate\("shelterNeeds"\)/);
  });
});
