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
  return code === "validation_error" ? "Give your pet a name and tell us the animal." : null;
}
