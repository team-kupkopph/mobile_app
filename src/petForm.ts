// AQ8 · the Add-a-pet form and the My pets rows, kept pure so jest pins them.
import { MAX_PHOTOS } from "./listingForm";

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

export function petFormError(code: string | undefined): string | null {
  if (code === "validation_error") return "Give your pet a name and tell us the animal.";
  return petActionError(code);
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
