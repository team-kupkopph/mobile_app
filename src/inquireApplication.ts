// AD8 · the Inquire sheet's quick answers. Kept pure: what the sheet sends, and the closed set of
// keys the server accepts (backend listings.serializers.ApplicationSerializer drops anything else).
export const HOME_TYPES = [
  { code: "house", label: "House" },
  { code: "apartment", label: "Apartment" },
  { code: "condo", label: "Condo" },
  { code: "other", label: "Other" }
] as const;
export type HomeType = (typeof HOME_TYPES)[number]["code"];

export type ApplicationState = {
  homeType: HomeType | null;
  rents: boolean | null;          // null = not answered
  landlordOk: boolean | null;
  otherPets: string; experience: string; schedule: string;
};
export const EMPTY_APPLICATION: ApplicationState = {
  homeType: null, rents: null, landlordOk: null, otherPets: "", experience: "", schedule: ""
};

export const ANSWER_MAX = 500;

/** Selected segment of a No / Yes control: -1 (nothing chosen) while the answer is null, so an untouched control isn't read as "No". */
export const yesNoIndex = (v: boolean | null): number => (v === null ? -1 : v ? 1 : 0);

/** Only what was answered. `landlord_ok` is asked of renters alone, so an owner never sends one. */
export function buildApplication(a: ApplicationState): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  if (a.homeType) out.home_type = a.homeType;
  if (a.rents !== null) out.rents = a.rents;
  if (a.rents === true && a.landlordOk !== null) out.landlord_ok = a.landlordOk;
  if (a.otherPets.trim()) out.other_pets = a.otherPets.trim().slice(0, ANSWER_MAX);
  if (a.experience.trim()) out.experience = a.experience.trim().slice(0, ANSWER_MAX);
  if (a.schedule.trim()) out.schedule = a.schedule.trim().slice(0, ANSWER_MAX);
  return out;
}

export function inquiryBody(message: string, a: ApplicationState) {
  return { message: message.trim() || undefined, application: buildApplication(a) };
}

/** The line under the sheet: what happens to the adopter's phone number. */
export const SHARING_NOTE = "Your phone number is shared only if they accept you for screening.";

/** A poster-side readable line per answer, in the order the sheet asks them. */
const HOME_LABEL: Record<string, string> = Object.fromEntries(HOME_TYPES.map((h) => [h.code, h.label]));
export function applicationRows(app: Record<string, unknown> | null | undefined): { label: string; value: string }[] {
  if (!app) return [];
  const rows: { label: string; value: string }[] = [];
  const yn = (v: unknown) => (v === true ? "Yes" : v === false ? "No" : null);
  if (typeof app.home_type === "string") rows.push({ label: "Home", value: HOME_LABEL[app.home_type] ?? app.home_type });
  const rents = yn(app.rents);
  if (rents) rows.push({ label: "Renting", value: rents });
  const ok = yn(app.landlord_ok);
  if (ok) rows.push({ label: "Landlord allows pets", value: ok });
  if (typeof app.other_pets === "string" && app.other_pets) rows.push({ label: "Other pets", value: app.other_pets });
  if (typeof app.experience === "string" && app.experience) rows.push({ label: "Experience", value: app.experience });
  if (typeof app.schedule === "string" && app.schedule) rows.push({ label: "Schedule", value: app.schedule });
  return rows;
}
