// The Adopt deck's display and state logic, unit-tested like adoption.ts / sagip.ts.
// Reference: design/mobile-v3/Adopt.dc.html, in its declared default behaviour,
// "Save / Not for me": swipe right saves to a shortlist, swipe left hides the pet from the
// feed, and Undo puts the last card back. The artboard's own reasoning, kept verbatim:
// "Hidden pets stop appearing — in a city with 12 listings that empties fast", which is why
// the end state offers "Show hidden again" and why nothing here is ever unrecoverable.
import { ListingPet } from "./api/types";

export type Dir = 1 | -1; // 1 = saved (right), -1 = hidden (left)

export type DeckState = {
  /** listing_ids in feed order, hidden ones removed. */
  order: string[];
  /** Index into `order` of the top card. `order.length` means the deck is finished. */
  index: number;
  /** History for Undo, most recent last — with what the swipe overwrote, so Undo is exact. */
  gone: Array<{ id: string; dir: Dir; wasSaved: boolean; wasHidden: boolean }>;
  saved: string[];
  hidden: string[];
};

export function buildDeck(ids: string[], saved: string[], hidden: string[]): DeckState {
  const hid = new Set(hidden);
  return { order: ids.filter((id) => !hid.has(id)), index: 0, gone: [], saved: [...saved], hidden: [...hidden] };
}

export function topId(s: DeckState): string | null {
  return s.index < s.order.length ? s.order[s.index] : null;
}

/**
 * A pet is saved OR hidden, never both. "Not for me" on a pet saved last week un-saves it;
 * saving a pet brought back by "Show hidden again" un-hides it. Found on device, where a
 * pet saved in one session and hidden in the next made the end card say "saved 5 and hid 4"
 * of 8 — one animal counted twice.
 */
export function advance(s: DeckState, dir: Dir): DeckState {
  const id = topId(s);
  if (!id) return s;
  const wasSaved = s.saved.includes(id);
  const wasHidden = s.hidden.includes(id);
  const without = (xs: string[]) => xs.filter((x) => x !== id);
  const saved = dir > 0 ? (wasSaved ? s.saved : [...s.saved, id]) : without(s.saved);
  const hidden = dir < 0 ? (wasHidden ? s.hidden : [...s.hidden, id]) : without(s.hidden);
  return { ...s, index: s.index + 1, gone: [...s.gone, { id, dir, wasSaved, wasHidden }], saved, hidden };
}

/** Put the last card back, and restore exactly what the swipe overwrote. */
export function undo(s: DeckState): DeckState {
  const last = s.gone[s.gone.length - 1];
  if (!last) return s;
  const without = (xs: string[]) => xs.filter((x) => x !== last.id);
  return {
    ...s,
    index: Math.max(0, s.index - 1),
    gone: s.gone.slice(0, -1),
    saved: last.wasSaved ? [...without(s.saved), last.id] : without(s.saved),
    hidden: last.wasHidden ? [...without(s.hidden), last.id] : without(s.hidden)
  };
}

/** The end card's "Show hidden again": forget every hide and rebuild from the feed. */
export function showHidden(s: DeckState, ids: string[]): DeckState {
  return buildDeck(ids, s.saved, []);
}

export function endSummary(s: DeckState): string {
  const hid = s.gone.filter((g) => g.dir < 0).length;
  return `You saved ${s.saved.length} and hid ${hid}. Hidden pets stop appearing here — bring them back any time.`;
}

// ---- card copy ------------------------------------------------------------------------------

/** "3 mo", "1 yr", "2 yrs" from an ISO birthdate; null when unknown or in the future. */
export function ageLabel(birthdate: string | null | undefined, now = new Date()): string | null {
  if (!birthdate) return null;
  const b = new Date(birthdate);
  if (Number.isNaN(b.getTime()) || b > now) return null;
  let months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) months -= 1;
  if (months < 12) return `${Math.max(0, months)} mo`;
  const years = Math.floor(months / 12);
  return `${years} ${years === 1 ? "yr" : "yrs"}`;
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** The artboard's "Aspin · 1 yr · Male": breed (or species), age, sex — whichever are known. */
export function cardMeta(pet: ListingPet, now = new Date()): string {
  return [pet.breed || capitalize(pet.species), ageLabel(pet.birthdate, now), pet.sex ? capitalize(pet.sex) : null]
    .filter(Boolean)
    .join(" · ");
}

export function feeLabel(fee: string | undefined | null): string {
  const n = Number(fee);
  return fee && n > 0 ? `₱${n.toLocaleString()} adoption fee` : "No adoption fee";
}

export type FactRow = { label: string; ok: boolean };

/**
 * The "Details" overlay. ⚠️ ONLY WHAT THE LISTING RECORDS AS A BOOLEAN. The artboard shows
 * "Good with children" and "House trained"; the listing has no such fields (temperament is
 * free text), so they are not shown rather than guessed. A null boolean is "not recorded"
 * and is also left out — a grey "Neutered" would read as "no".
 */
export function factRows(pet: ListingPet): FactRow[] {
  const rows: FactRow[] = [];
  if (typeof pet.vaccinated === "boolean") rows.push({ label: "Vaccinated", ok: pet.vaccinated });
  if (typeof pet.spayed_neutered === "boolean") rows.push({ label: "Neutered", ok: pet.spayed_neutered });
  if (typeof pet.walkable === "boolean") rows.push({ label: "Walkable", ok: pet.walkable });
  return rows;
}
