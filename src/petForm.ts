// AQ8 · the Add-a-pet form and the My pets rows, kept pure so jest pins them.
import { MAX_PHOTOS } from "./listingForm";
import { isOffline } from "./net";

export const MY_PETS_EMPTY = "Your pets will appear here. Add one, or adopt through Kupkop.";

export type PetFormState = {
  name: string; species: string; breed: string; sex: string; birthdate: string;
  size: string; spayed: boolean | null; temperament: string; medical: string; vet: string;
  photos: string[];
};

export function petBody(s: PetFormState) {
  return {
    name: s.name.trim(), species: s.species, breed: s.breed.trim() || undefined, sex: s.sex,
    birthdate: s.birthdate.trim() || undefined, size_category: s.size || undefined,
    spayed_neutered: s.spayed, temperament: s.temperament.trim() || undefined,
    medical_conditions: s.medical.trim() || undefined, vet_contact: s.vet.trim() || undefined,
    photos: s.photos.slice(0, MAX_PHOTOS).map((file_url, i) => ({ file_url, is_primary: i === 0 }))
  };
}

/** A pet row's action: only a pet that came with an owner can be rehomed by that owner, and any
 *  pet in My pets is one, so the action is always offered; the server enforces one live listing. */
export const LIST_PET_LABEL = "List for adoption";

/** A refusal that isn't about one field (the pet is listed, gone, or this is a shelter). */
export function petFormError(code: string | undefined): string | null {
  return petActionError(code);
}

// ── PP9 (My Pets review 2026-10-28) · errors that say what is wrong, under the field that is wrong ──
//
// The backend's validation refusal is `{code: "invalid", details: {field: [message]}}` (a listing's
// animal nests under `pet`). The old mapper keyed on a "validation_error" code the server never
// sends, so every refusal fell through to one server sentence with no field named.

/** The form fields an error can sit under, across the pet form and the listing form. */
export type FormField =
  | "name" | "species" | "breed" | "sex" | "birthdate" | "size" | "spayed" | "temperament"
  | "medical" | "vet" | "markings" | "photos" | "fee" | "city" | "description" | "requirements";
export type FieldErrors = Partial<Record<FormField, string>>;

const SERVER_FIELD: Record<string, FormField> = {
  name: "name", species: "species", breed: "breed", sex: "sex", birthdate: "birthdate",
  size_category: "size", spayed_neutered: "spayed", temperament: "temperament",
  medical_conditions: "medical", vet_contact: "vet", color_markings: "markings", photos: "photos",
  adoption_fee: "fee", city: "city", description: "description", requirements: "requirements"
};

export const BIRTHDATE_FORMAT = "Use the date format YYYY-MM-DD, like 2023-03-01.";
export const BIRTHDATE_FUTURE = "A birthdate can't be in the future.";
export const BIRTHDATE_NO_SUCH_DAY = "That date doesn't exist. Check the month and day.";

/** Checked before saving, so a bad date is caught without a round trip. A blank date is fine. */
export function birthdateError(value: string, today: Date = new Date()): string | null {
  const v = value.trim();
  if (!v) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return BIRTHDATE_FORMAT;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return BIRTHDATE_NO_SUCH_DAY;
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return date > startOfToday ? BIRTHDATE_FUTURE : null;
}

/** The first sentence anywhere in a details value (a list, a nested object, a list of objects). */
function firstMessage(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (const v of value) { const m = firstMessage(v); if (m) return m; }
    return null;
  }
  if (value && typeof value === "object") {
    for (const v of Object.values(value)) { const m = firstMessage(v); if (m) return m; }
  }
  return null;
}

/** Our words for the refusals people actually hit; anything else keeps the server's sentence. */
function friendly(field: FormField, message: string): string {
  if (field === "birthdate") return /future/i.test(message) ? BIRTHDATE_FUTURE : BIRTHDATE_FORMAT;
  if (field === "name" && /blank|required|empty/i.test(message)) return "Give your pet a name.";
  if (field === "photos" && /uploaded/i.test(message)) return "One of the photos can't be used. Remove it and add it again.";
  if (field === "fee" && /valid number|decimal/i.test(message)) return "Enter the fee as a number, like 250.";
  return message;
}

type Res = { ok: boolean; status: number; data?: any };

/** A refused save, split into the messages that belong under fields and one that belongs to the form. */
export function serverFieldErrors(res: Res): { fields: FieldErrors; form: string | null } {
  const error = res.data?.error;
  const details = error?.details;
  const fields: FieldErrors = {};
  let form: string | null = null;
  const walk = (obj: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(obj)) {
      if (key === "pet") {                   // a listing's animal: POST /listings nests it
        const inner = Array.isArray(value) ? value[0] : value;
        if (inner && typeof inner === "object") { walk(inner as Record<string, unknown>); continue; }
      }
      const message = firstMessage(value);
      if (!message) continue;
      const field = SERVER_FIELD[key];
      if (field && !fields[field]) fields[field] = friendly(field, message);
      else if (!field && !form) form = message;
    }
  };
  if (details && typeof details === "object" && error?.code === "invalid") walk(details);
  if (!Object.keys(fields).length && !form) {
    form = petActionError(error?.code) ?? error?.message ?? (isOffline(res) ? "You're offline. Try again when you're connected." : "Couldn't save. Try again.");
  }
  return { fields, form };
}

/** PP12 · an edit's body. Unlike `petBody` it sends a blank as "" (and a cleared birthdate as
 *  null), because on a PATCH a missing key means "leave it" and the owner may be clearing it. */
export function petPatchBody(s: PetFormState) {
  return {
    name: s.name.trim(), species: s.species, breed: s.breed.trim(), sex: s.sex,
    birthdate: s.birthdate.trim() || null, spayed_neutered: s.spayed, temperament: s.temperament.trim(),
    medical_conditions: s.medical.trim(), vet_contact: s.vet.trim(),
    photos: s.photos.slice(0, MAX_PHOTOS).map((file_url, i) => ({ file_url, is_primary: i === 0 }))
  };
}

/** "3 years", "8 months", "Under a month". Null when there is no birthdate or it is in the future
 *  (a typo, not a pet that isn't born yet). */
export function ageLabel(birthdate: string | null | undefined, today: Date = new Date()): string | null {
  if (!birthdate || !/^\d{4}-\d{2}-\d{2}$/.test(birthdate)) return null;
  const [y, m, d] = birthdate.split("-").map(Number);
  let months = (today.getFullYear() - y) * 12 + (today.getMonth() + 1 - m);
  if (today.getDate() < d) months -= 1;
  if (months < 0) return null;
  if (months === 0) return "Under a month";
  if (months < 12) return `${months} month${months === 1 ? "" : "s"}`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? "" : "s"}`;
}

/** PQ1 · the reasons an owner gives when removing a pet. The server archives it; nothing is erased. */
export const REMOVE_REASONS = [
  { value: "passed_away", label: "Passed away" },
  { value: "given_away", label: "Given away" },
  { value: "other", label: "Other" }
] as const;
export type RemoveReason = (typeof REMOVE_REASONS)[number]["value"];

export const REMOVE_PET_BODY = "It leaves My pets. Its details stay in your data export, and any lost report "
  + "you filed for it stays up.";

/** The pet screen's refusals, in words that say what to do next. */
export function petActionError(code: string | undefined): string | null {
  switch (code) {
    case "pet_listed": return "This pet has a listing. Withdraw the listing first.";
    case "not_found": return "This pet isn't in My pets any more.";
    case "not_for_shelters": return "A shelter's animals live in its Animals tab, not My pets.";
    default: return null;
  }
}

export const REHOMED_TITLE = "Rehomed";
export function rehomedLine(isoDate: string): string {
  const d = new Date(isoDate);
  return `Found a new home · ${d.toLocaleDateString("en-PH", { month: "short", year: "numeric" })}`;
}


// ── PP14 (My Pets review 2026-10-28) · what a pet is in the middle of, on its card and its screen ──

export type PetChip = { label: string; tone: "info" | "warning" | "neutral" | "danger" };

/** The chips a pet shows, listing first. Tones follow the shared status mapping (Chip.tsx). */
export function petChips(p: { open_listing: { status: string; removed: boolean } | null; lost_report_id: string | null }): PetChip[] {
  const chips: PetChip[] = [];
  const l = p.open_listing;
  if (l) {
    if (l.removed) chips.push({ label: "Listing removed", tone: "danger" });
    else if (l.status === "draft") chips.push({ label: "Listing draft", tone: "neutral" });
    else if (l.status === "pending") chips.push({ label: "Adoption pending", tone: "warning" });
    else chips.push({ label: "Listed for adoption", tone: "info" });
  }
  if (p.lost_report_id) chips.push({ label: "Reported lost", tone: "warning" });
  return chips;
}

export const VIEW_LISTING_LABEL = "View listing";

/** The card's one action: its listing if it has one, else the way to make one. */
export function petCardAction(p: { pet_id: string; open_listing: { listing_id: string } | null }):
  { label: string; route: "posterListing"; params: { listingId: string } }
  | { label: string; route: "listingForm"; params: { petId: string } } {
  return p.open_listing
    ? { label: VIEW_LISTING_LABEL, route: "posterListing", params: { listingId: p.open_listing.listing_id } }
    : { label: LIST_PET_LABEL, route: "listingForm", params: { petId: p.pet_id } };
}

/** The Profile row's hint (the You artboard: "2 listed for adoption"). A draft isn't listed yet. */
export function myPetsHint(pets: { open_listing: { status: string; removed: boolean } | null }[]): string {
  const listed = pets.filter((p) => p.open_listing && !p.open_listing.removed
    && (p.open_listing.status === "available" || p.open_listing.status === "pending")).length;
  if (listed) return `${listed} listed for adoption`;
  if (pets.length) return `${pets.length} ${pets.length === 1 ? "pet" : "pets"}`;
  return "Add your pets";
}


// ── Step 11 · the pet screen's words, shared with the parity guard against the Pet artboard ──

export const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** The pet screen's actions, in order (the second follows the listing: VIEW_LISTING_LABEL or
 *  LIST_PET_LABEL; the third follows a lost report: viewLost or reportLost). */
export const PET_ACTIONS = {
  edit: "Edit details", viewLost: "View lost report", reportLost: "Report lost", remove: "Remove from My pets"
} as const;

type PetFactsSource = {
  breed: string | null; sex: string | null; size_category: string | null; color_markings: string | null;
  spayed_neutered: boolean | null; temperament: string | null; medical_conditions: string | null; vet_contact: string | null;
};

/** The facts the owner entered, in reading order; a blank one is left out rather than shown empty.
 *  The age is not one of them: it already sits under the name. */
export function petFactRows(p: PetFactsSource): [string, string][] {
  const rows: [string, string | null][] = [
    ["Breed", p.breed],
    ["Sex", p.sex && p.sex !== "unknown" ? capitalize(p.sex) : null],
    ["Size", p.size_category ? capitalize(p.size_category) : null],
    ["Colour and markings", p.color_markings],
    ["Spayed / neutered", p.spayed_neutered === null ? null : p.spayed_neutered ? "Yes" : "No"],
    ["Temperament", p.temperament],
    ["Medical notes", p.medical_conditions],
    ["Vet", p.vet_contact]
  ];
  return rows.filter((r): r is [string, string] => !!r[1]);
}
