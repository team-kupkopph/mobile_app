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
