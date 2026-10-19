// AD9 / AD11 / AD12 / AQ8 · the listing form's decisions, kept pure so jest pins them: the photo
// strip, the request bodies, and what a publish refusal says. The screen only renders them.
export const MAX_PHOTOS = 6;
export const SIZES = ["small", "medium", "large"] as const;

/** A three-state answer: the pet's health is "not sure" until the poster says yes or no. */
export type Tri = "unknown" | "yes" | "no";
export const TRI_LABELS = ["Not sure", "Yes", "No"] as const;
const TRI_ORDER: Tri[] = ["unknown", "yes", "no"];
export const triIndex = (t: Tri): number => TRI_ORDER.indexOf(t);
export const triAt = (i: number): Tri => TRI_ORDER[i] ?? "unknown";
export const triFromBool = (b: boolean | null | undefined): Tri => (b === true ? "yes" : b === false ? "no" : "unknown");
export const triToBool = (t: Tri): boolean | null => (t === "yes" ? true : t === "no" ? false : null);

/** The strip, main photo first (the server returns it that way, and sends the first as primary). */
export function addPhoto(photos: string[], url: string): string[] {
  return photos.length >= MAX_PHOTOS || photos.includes(url) ? photos : [...photos, url];
}
export function removePhoto(photos: string[], index: number): string[] {
  return photos.filter((_, i) => i !== index);
}
export function makeMain(photos: string[], index: number): string[] {
  if (index <= 0 || index >= photos.length) return photos;
  return [photos[index], ...photos.filter((_, i) => i !== index)];
}
export const photoPayload = (photos: string[]) =>
  photos.map((file_url, i) => ({ file_url, is_primary: i === 0 }));

export type FormState = {
  name: string; species: string; breed: string; sex: string; birthdate: string;
  description: string; requirements: string; fee: string; city: string;
  size: string; vaccinated: Tri; spayed: Tri; walkable: boolean; temperament: string;
  photos: string[]; petId?: string;
};

export function createBody(s: FormState) {
  return {
    pet: {
      name: s.name.trim(), species: s.species, breed: s.breed.trim() || undefined, sex: s.sex,
      birthdate: s.birthdate.trim() || undefined, size_category: s.size || undefined,
      vaccinated: triToBool(s.vaccinated), spayed_neutered: triToBool(s.spayed),
      walkable: s.walkable, temperament: s.temperament.trim() || undefined
    },
    pet_id: s.petId,
    description: s.description.trim(), requirements: s.requirements.trim(),
    adoption_fee: s.fee || "0", city: s.city.trim(), photos: photoPayload(s.photos)
  };
}

/** PATCH writes only what it names, so an edit sends every field it shows, photos included. */
export function patchBody(s: FormState) {
  return {
    name: s.name.trim(), species: s.species, breed: s.breed.trim(), sex: s.sex,
    birthdate: s.birthdate.trim() || null, size_category: s.size,
    vaccinated: triToBool(s.vaccinated), spayed_neutered: triToBool(s.spayed),
    walkable: s.walkable, temperament: s.temperament.trim(),
    description: s.description.trim(), requirements: s.requirements.trim(),
    adoption_fee: s.fee || "0", city: s.city.trim(), photos: photoPayload(s.photos)
  };
}

/** AD12 · what a refused publish says. `null` = a code we don't special-case. */
export function publishRefusal(code: string | undefined, isShelter: boolean):
  { title: string; body: string; offerVerify: boolean } | null {
  if (code === "verification_required") {
    return {
      title: isShelter ? "Your shelter isn't verified yet" : "Get verified to publish",
      body: isShelter
        ? "Your listing is saved as a draft. You can publish it once your shelter is verified."
        : "Your listing is saved as a draft. You can publish it once you're a Verified Member.",
      offerVerify: !isShelter
    };
  }
  if (code === "listing_removed") {
    return { title: "This listing was removed", body: "Our moderators removed this listing, so it can't be published.", offerVerify: false };
  }
  return null;
}
