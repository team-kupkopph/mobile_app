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

/**
 * A nudge, not a block: pledging more than the remainder is allowed. When pledges already cover everything
 * that is left (`remaining` is 0) it says so — that is the case where a donor most needs the hint (B2).
 */
export function overPledgeWarning(qty: number, remaining: number): string | null {
  if (qty <= 0) return null;
  if (remaining <= 0) return "Pledges already cover everything they still need — more is welcome, but it may not be needed.";
  return qty > remaining
    ? `They still need ${remaining} — anything extra is welcome, but ${remaining} covers it.`
    : null;
}

/**
 * What to tell a donor whose cancel found the pledge already settled by the shelter (409) or gone (404). The
 * list is refreshed either way; this says why the card changed under them (B4). Null for every other failure.
 */
export function cancelRefusedCopy(status: number): string | null {
  if (status === 409) return "That pledge was already settled — refreshing your list.";
  if (status === 404) return "That pledge is no longer there — refreshing your list.";
  return null;
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
 * "Oct 5" (or "Oct 5, 2025" in another year) — the app's usual short date. "" for a missing or
 * unreadable date, so a caller can leave it out rather than print "Invalid Date".
 */
export function pledgeWhen(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString(undefined, sameYear ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" });
}

/** My donations' second line: "{shelter} · {date}", the date being when the pledge was settled (else made). */
export function pledgeSubtitle(
  shelterName: string, decidedAt: string | null | undefined, createdAt: string | null | undefined, now: Date = new Date()
): string {
  const when = pledgeWhen(decidedAt || createdAt, now);
  return when ? `${shelterName} · ${when}` : shelterName;
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

/** "1 pledge" / "3 pledges". */
export function pledgeCountLabel(n: number): string {
  return `${n} ${n === 1 ? "pledge" : "pledges"}`;
}

/** The amber tag on a wishlist row: "3 to confirm". Nothing when there is nothing to confirm (or an older server sent no count). */
export function awaitingConfirmTag(n: number | null | undefined): string | null {
  return n && n > 0 ? `${n} to confirm` : null;
}

/** Mark complete's dialog body. The cancel line appears only when open pledges will really be cancelled. */
export function completeNeedBody(pledgeCount: number | null | undefined): string {
  const base = "It comes off your wishlist — donors can no longer pledge to it.";
  const n = pledgeCount ?? 0;
  if (n <= 0) return base;
  return n === 1
    ? `${base} 1 open pledge will be cancelled and the donor told.`
    : `${base} ${n} open pledges will be cancelled and the donors told.`;
}

/** Client-side limits on a need's title, details and unit. (The backend has no max_length on the description, so NEED_DETAILS_MAX is ours alone.) */
export const NEED_TITLE_MAX = 120;
export const NEED_DETAILS_MAX = 1000;
export const NEED_UNIT_MAX = 16;
/** Mirrors the backend bound on `PATCH /shelter/profile {donation_instructions}`. */
export const INSTRUCTIONS_MAX = 500;

export type NeedFormErrors = { title?: string; description?: string; quantity?: string };

/** `errors` without `key`; the same object when `key` had no message, so a keystroke does not re-render for nothing (B6). */
export function withoutError(errors: NeedFormErrors, key: keyof NeedFormErrors): NeedFormErrors {
  if (errors[key] === undefined) return errors;
  const { [key]: _dropped, ...rest } = errors;
  return rest;
}

/** Client-side bounds for the need form, each message keyed to the field it belongs under (AW20). */
export function needFormErrors(f: { title: string; description: string; qty: number }): NeedFormErrors {
  const errors: NeedFormErrors = {};
  const title = f.title.trim();
  if (!title) errors.title = "Give the need a short title.";
  else if (title.length > NEED_TITLE_MAX) errors.title = `Keep the title to ${NEED_TITLE_MAX} characters or fewer.`;
  if (f.description.trim().length > NEED_DETAILS_MAX) errors.description = `Keep the details to ${NEED_DETAILS_MAX} characters or fewer.`;
  if (!Number.isInteger(f.qty) || f.qty < 1 || f.qty > MAX_QTY) errors.quantity = `Enter a number from 1 to ${MAX_QTY}.`;
  return errors;
}

/**
 * The words for a failed shelter-side write on a need (confirm received, mark complete). `reload` means what
 * the screen showed is stale and should be re-fetched — a 409/404 is the server saying the state moved, which
 * is not "couldn't confirm, try again".
 */
export function needActionErrorCopy(status: number, code?: string): { message: string; reload: boolean } {
  if (status === 409 && code === "pledge_decided") return { message: "That pledge was already settled — refreshing.", reload: true };
  if (status === 409 || status === 404) return { message: "This need changed while you were looking — refreshing.", reload: true };
  if (status === 422 && code === "total_overflow") {
    return { message: "That would push the received total over the limit. Check the number and try again.", reload: false };
  }
  if (status === 0 || status >= 500) return { message: "Couldn't reach Kupkop. Check your connection and try again.", reload: false };
  return { message: "Couldn't save that. Please try again.", reload: false };
}

/** The words for a failed need save, and which field they belong under (`form` = above the button). */
export function needSaveError(
  status: number, code?: string, details?: { quantity_received?: number } | null
): { field: "quantity" | "form"; message: string } {
  if (status === 422 && code === "below_received") {
    return { field: "quantity", message: `${details?.quantity_received ?? 0} already received — the target can't go lower.` };
  }
  if (status === 409 && code === "need_not_open") {
    return { field: "form", message: "This need is no longer open, so it can't be changed." };
  }
  if (status === 400 && code === "bad_category") {
    return { field: "form", message: "That category isn't available for the wishlist. Pick another." };
  }
  if (status === 0 || status >= 500) {
    return { field: "form", message: "Couldn't reach Kupkop. Check your connection and try again." };
  }
  return { field: "form", message: "Couldn't save. Please try again." };
}

/**
 * `needActions`, but only for a need that has been freshly read from the server. `kind` is `loadState(...).kind` of the
 * `GET /needs/{id}` request: anything but "ready" (still loading, offline, failed, gone) grants nothing, so a placeholder
 * passed in from the list, or a copy from before a failed refresh, can never drive Edit / Mark complete / Mark received.
 */
export function liveNeedActions(kind: string, status: NeedStatus): { edit: boolean; complete: boolean; receive: boolean } {
  return kind === "ready" ? needActions(status) : { edit: false, complete: false, receive: false };
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
