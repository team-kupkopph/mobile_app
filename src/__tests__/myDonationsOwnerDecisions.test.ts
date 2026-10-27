/**
 * D2 and D3 (owner, 2026-10-27) on My donations, against `screen-my-donations` / `screen-my-donations-cancel`.
 *
 *  - D3 · **Cancel pledge** asks in the shared `ConfirmModal`, like Mark received and Mark complete — not the
 *    phone's alert. The modal closes before the request goes, and `doCancel`'s `busyId` guard still stops a
 *    second request.
 *  - D2 · a still-pledged card says "Deliver, then the shelter confirms" above its **Cancel pledge**: the answer
 *    to "why does it still say Pledged?". No stat tiles: the impact screen already has those numbers.
 */
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(__dirname, "..", "screens", "MyDonationsScreen.tsx"), "utf8");
const modal = /<ConfirmModal\b[\s\S]*?\/>/.exec(src)?.[0] ?? "";
const cancellable = /\{pledgeIsCancellable\(p\.status\) \? \(([\s\S]*?)\) : null\}/.exec(src)?.[1] ?? "";

describe("My donations · Cancel pledge in the shared modal (D3)", () => {
  it("the scan found the cancellable branch (a guard that matches nothing proves nothing)", () => {
    expect(cancellable).toMatch(/confirmCancel\(p\)/);
  });

  it("uses ConfirmModal, not the native alert", () => {
    expect(src).toMatch(/import \{ ConfirmModal \} from "\.\.\/components\/ConfirmModal";/);
    expect(src).not.toMatch(/Alert\.alert\("Cancel this pledge\?"/);
    expect(modal).toMatch(/title="Cancel this pledge\?"/);
    expect(modal).toMatch(/tone="danger"/);
    expect(modal).toMatch(/confirmLabel="Yes, cancel pledge"/);
    // "Keep pledge" is the safe way out, so it is the modal's quiet cancel, not its red secondary action (which
    // exists for a destructive alternative like "Decline instead"). Seen red on the simulator; fixed with cancelLabel.
    expect(modal).toMatch(/cancelLabel="Keep pledge"/);
    expect(modal).not.toMatch(/secondaryLabel=/);
    expect(modal).toMatch(/cancelPledgeBody\(/);
  });

  it("closes the modal before the request goes", () => {
    expect(modal).toMatch(/onConfirm=\{\(\) => \{[^}]*setCancelTarget\(null\);[^}]*doCancel\(/);
  });
});

describe("My donations · the delivery hint (D2)", () => {
  it("a still-pledged card says it, above Cancel pledge", () => {
    const hint = cancellable.indexOf("{PLEDGE_DELIVERY_HINT}");
    expect(hint).toBeGreaterThan(-1);
    expect(hint).toBeLessThan(cancellable.indexOf("confirmCancel(p)"));
  });
});

describe("ConfirmModal's cancel label", () => {
  const confirm = readFileSync(join(__dirname, "..", "components", "ConfirmModal.tsx"), "utf8");
  it("can be named by the caller, and still reads \"Never mind\" for everyone else", () => {
    expect(confirm).toMatch(/cancelLabel\?: string;/);
    expect(confirm).toMatch(/cancelLabel = "Never mind"/);
    expect(confirm).toMatch(/<Text style=\{styles\.cancelText\}>\{cancelLabel\}<\/Text>/);
  });
});
