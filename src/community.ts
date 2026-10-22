// US-W2/W3 · pure helpers for the Abot-tulong wishlist UI. Kept out of the screens so the
// status/progress logic is unit-testable (the app's jest tests cover modules, not RN renders).

export type PledgeStatus = "pledged" | "delivered" | "cancelled";
export type NeedStatus = "open" | "fulfilled" | "closed";

// Status chips follow the shared mapping (ui-ux-pro-max): green = delivered/done,
// amber = pledged/open (still needs action), grey = cancelled/closed.
export type ChipTone = "ok" | "warn" | "muted";

export type CancelReason = "donor" | "need_closed";

/** Mirrors the backend bound on a need's quantity, a pledge's quantity and a received count. */
export const MAX_QTY = 100_000;

// `cancelReason` is only read on a cancelled pledge: a cancel the shelter's closing caused
// reads "Need closed" so the donor can tell it from one they made themselves.
export function pledgeStatusChip(
  status: PledgeStatus,
  cancelReason?: CancelReason | null
): { label: string; tone: ChipTone } {
  switch (status) {
    case "delivered":
      return { label: "Delivered", tone: "ok" };
    case "cancelled":
      return cancelReason === "need_closed"
        ? { label: "Need closed", tone: "muted" }
        : { label: "Cancelled", tone: "muted" };
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

/** A need's category as the API sends it is lower-case ("food"); only its first letter is capitalised. */
export function needCategoryLabel(category: string): string {
  return category ? category.charAt(0).toUpperCase() + category.slice(1) : category;
}

/** "10 kg", or just "3" when the need has no unit. */
export function quantityLabel(n: number, unit?: string): string {
  return unit ? `${n} ${unit}` : `${n}`;
}

/** "8 of 20 kg received · 5 pledged" — the pledged clause is omitted at 0. */
export function needProgressLabel(received: number, needed: number, unit?: string, pledged?: number): string {
  const base = `${received} of ${quantityLabel(needed, unit)} received`;
  return pledged && pledged > 0 ? `${base} · ${pledged} pledged` : base;
}

/** What is still unspoken for: needed less what has arrived and what is already promised. Never negative. */
export function remainingAfter(needed: number, received: number, pledged: number): number {
  return Math.max(0, needed - received - pledged);
}

/** A nudge, not a block: pledging more than the remainder is allowed. */
export function overPledgeWarning(qty: number, remaining: number): string | null {
  return remaining > 0 && qty > remaining
    ? `They still need ${remaining} — anything extra is welcome, but ${remaining} covers it.`
    : null;
}

/** The shelter's received-confirm preview: "8 → 14 of 20 kg received". */
export function receivedPreview(received: number, needed: number, add: number, unit?: string): string {
  return `${received} → ${received + add} of ${quantityLabel(needed, unit)} received`;
}

/**
 * The words for a failed pledge call. `reload` means the screen's data is stale and should be
 * re-fetched; `wall` means the caller is signed out (show the sign-in wall, not a message).
 * Anything outside the table gets a generic line rather than a misleading connection error.
 */
export function pledgeErrorCopy(status: number, code?: string): { message: string; reload: boolean; wall: boolean } {
  const row = (message: string, reload = false, wall = false) => ({ message, reload, wall });
  if (status === 401) return row("Sign in to pledge.", false, true);
  if (status === 403 && code === "own_need") return row("You can't pledge to your own wishlist.");
  if (status === 404) return row("This shelter's wishlist isn't available right now.", true);
  if (status === 409 && code === "need_not_open") return row("This need is no longer open for pledges.", true);
  if (status === 409 && code === "pledge_decided") return row("This pledge was already settled — refreshing.", true);
  if (status === 429) return row("You've made a lot of pledges today. Try again tomorrow.");
  if (status === 0 || status >= 500) return row("Couldn't reach Kupkop. Check your connection and try again.");
  return row("Couldn't save that. Please try again.");
}

/**
 * What a shelter may do to a need in each state. `fulfilled` keeps `receive` because an
 * over-pledge can still be delivered after the target flips; `closed` is final.
 */
export function needActions(status: NeedStatus): { edit: boolean; complete: boolean; receive: boolean } {
  switch (status) {
    case "open":
      return { edit: true, complete: true, receive: true };
    case "fulfilled":
      return { edit: false, complete: false, receive: true };
    case "closed":
    default:
      return { edit: false, complete: false, receive: false };
  }
}

// Clamped 0..1 for a progress bar; a zero/negative target never divides-by-zero.
export function needProgressFraction(received: number, needed: number): number {
  if (needed <= 0) return 0;
  return Math.max(0, Math.min(1, received / needed));
}

// US-B2 · the four impact aggregates as labelled stat tiles, in a stable display order.
export type Impact = {
  shifts_completed: number; rescues_helped: number; pets_rehomed: number;
  pledges_delivered: number;
};

export function impactTiles(i: Impact): { label: string; value: number }[] {
  return [
    { label: "Shifts", value: i.shifts_completed },
    { label: "Rescues", value: i.rescues_helped },
    { label: "Rehomed", value: i.pets_rehomed },
    { label: "Donations", value: i.pledges_delivered }
  ];
}

// US-T2 · a story-type chip. Colours: adoption=green (a completed rehoming), rescue=teal
// (brand action), general=grey. Type auto-derives from the linked object on compose.
export type StoryType = "adoption" | "rescue" | "general";
export type StoryTone = "ok" | "teal" | "muted";

export function storyTypeChip(type: StoryType): { label: string; tone: StoryTone } {
  switch (type) {
    case "adoption":
      return { label: "Adoption", tone: "ok" };
    case "rescue":
      return { label: "Rescue", tone: "teal" };
    case "general":
    default:
      return { label: "General", tone: "muted" };
  }
}

// US-L3 · turn the §11 per-signal sub-scores (each 0..1) into human reasons — the UI shows WHY
// two reports matched, never a raw percentage (that was the whole point of transparent scoring).
export type MatchSignals = { geo: number; time: number; breed: number; color: number; size_sex: number };

export function matchReasons(sig: MatchSignals): string[] {
  const r: string[] = [];
  if (sig.geo >= 0.85) r.push("Very close by");
  else if (sig.geo >= 0.5) r.push("Nearby");
  if (sig.time >= 0.85) r.push("around the same time");
  else if (sig.time >= 0.4) r.push("similar dates");
  if (sig.breed >= 0.3 || sig.color >= 0.3) r.push("description matches");
  if (sig.size_sex >= 0.5) r.push("same size & sex");
  return r.length ? r : ["a possible match"];
}

// A qualitative strength label from the overall [0,1] score — softer than a number, and never
// overclaims a certainty the heuristic doesn't have.
export function matchStrength(score: number): { label: string; tone: "ok" | "warn" } {
  return score >= 0.8 ? { label: "Very likely", tone: "ok" } : { label: "Possible", tone: "warn" };
}
