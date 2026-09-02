// US-W2/W3 · pure helpers for the Abot-tulong wishlist UI. Kept out of the screens so the
// status/progress logic is unit-testable (the app's jest tests cover modules, not RN renders).

export type PledgeStatus = "pledged" | "delivered" | "cancelled";
export type NeedStatus = "open" | "fulfilled" | "closed";

// Status chips follow the shared mapping (ui-ux-pro-max): green = delivered/done,
// amber = pledged/open (still needs action), grey = cancelled/closed.
export type ChipTone = "ok" | "warn" | "muted";

export function pledgeStatusChip(status: PledgeStatus): { label: string; tone: ChipTone } {
  switch (status) {
    case "delivered":
      return { label: "Delivered", tone: "ok" };
    case "cancelled":
      return { label: "Cancelled", tone: "muted" };
    case "pledged":
    default:
      return { label: "Pledged", tone: "warn" };
  }
}

export function needStatusChip(status: NeedStatus): { label: string; tone: ChipTone } {
  switch (status) {
    case "fulfilled":
      return { label: "Fulfilled", tone: "ok" };
    case "closed":
      return { label: "Closed", tone: "muted" };
    case "open":
    default:
      return { label: "Open", tone: "warn" };
  }
}

// A cancel is honest and always allowed while pledged (D-S6-7); a delivered pledge is a
// recorded fact and shows no action.
export function pledgeIsCancellable(status: PledgeStatus): boolean {
  return status === "pledged";
}

export function needProgressLabel(received: number, needed: number): string {
  return `${received} of ${needed} received`;
}

// Clamped 0..1 for a progress bar; a zero/negative target never divides-by-zero.
export function needProgressFraction(received: number, needed: number): number {
  if (needed <= 0) return 0;
  return Math.max(0, Math.min(1, received / needed));
}
