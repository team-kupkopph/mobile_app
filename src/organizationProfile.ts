// Plan Task 9 · pure helpers for the shelter's Organization profile screen (GET/PATCH
// /shelter/profile, backend#113). Kept out of the screen so the rules that matter — what counts as
// a change, how a server refusal maps to a field — are testable without rendering anything.
import { normalizePhMobile, phoneError } from "./phone";

/** What the form's fields hold. Strings only: a field is never `null`. */
export type OrganizationForm = {
  orgName: string; description: string; hours: string; website: string;
  contactName: string; contactRole: string; phone: string; email: string;
};
export type OrganizationFieldKey = keyof OrganizationForm | "logo";

/** The slice of `GET /shelter/profile` the form reads. Everything may be null (blank on the server). */
export type OrganizationProfile = {
  org_name?: string | null; description?: string | null; logo_url?: string | null;
  operating_hours?: string | null; website_url?: string | null;
  contact_person_name?: string | null; contact_person_role?: string | null;
  official_phone?: string | null; official_email?: string | null;
};

export type LogoChange =
  | { logo: "keep" }
  | { logo: "new"; fileUrl: string }
  | { logo: "remove" };

/** Field -> the key the backend accepts. One table, so the form, the patch and the error map cannot drift. */
const FIELDS: ReadonlyArray<{ form: keyof OrganizationForm; server: keyof OrganizationProfile }> = [
  { form: "orgName", server: "org_name" },
  { form: "description", server: "description" },
  { form: "hours", server: "operating_hours" },
  { form: "website", server: "website_url" },
  { form: "contactName", server: "contact_person_name" },
  { form: "contactRole", server: "contact_person_role" },
  { form: "phone", server: "official_phone" },
  { form: "email", server: "official_email" },
];

const text = (v: unknown): string => (typeof v === "string" ? v : "");

/** The server profile as the strings the fields show. A null is a blank, never the word "null". */
export function organizationFormFrom(profile: OrganizationProfile): OrganizationForm {
  const form = {} as OrganizationForm;
  for (const f of FIELDS) form[f.form] = text(profile[f.server]);
  return form;
}

/** What goes to the server for a field. The phone is sent in the form the server STORES (E.164). */
function outgoing(key: keyof OrganizationForm, value: string): string {
  const trimmed = value.trim();
  return key === "phone" ? (normalizePhMobile(trimmed) ?? trimmed) : trimmed;
}

/**
 * ONLY the fields that changed, under the server's names.
 *
 * A PATCH of the whole form would let an edit screen that loaded slowly (or failed to) overwrite a
 * field with a blank. Sending just the difference means an untouched field can never be clobbered,
 * and "nothing changed" is an empty object the screen can answer without a request. A blank is a
 * real value here: an emptied field clears it.
 */
export function organizationPatch(
  profile: OrganizationProfile, form: OrganizationForm, logo: LogoChange,
): Record<string, string> {
  const patch: Record<string, string> = {};
  for (const f of FIELDS) {
    const next = outgoing(f.form, form[f.form]);
    if (next !== text(profile[f.server])) patch[f.server] = next;
  }
  if (logo.logo === "new") patch.logo_file_url = logo.fileUrl;
  else if (logo.logo === "remove") patch.logo_file_url = "";
  return patch;
}

export const DESCRIPTION_MAX = 1000;
export const HOURS_MAX = 120;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Client-side checks, worded like the rest of the app. The server has the final say. */
export function organizationFieldErrors(form: OrganizationForm): Partial<Record<keyof OrganizationForm, string>> {
  const errors: Partial<Record<keyof OrganizationForm, string>> = {};
  if (form.orgName.trim().length === 0) errors.orgName = "Enter your organization's name.";
  if (form.description.trim().length > DESCRIPTION_MAX) {
    errors.description = `Keep it to ${DESCRIPTION_MAX} characters or fewer.`;
  }
  if (form.hours.trim().length > HOURS_MAX) errors.hours = `Keep it to ${HOURS_MAX} characters or fewer.`;
  if (form.email.trim() && !EMAIL.test(form.email.trim())) errors.email = "Enter a valid email address.";
  if (form.phone.trim()) {
    const bad = phoneError(form.phone);
    if (bad) errors.phone = bad;
  }
  return errors;
}

type Res = { status: number; data?: any };

const SERVER_TO_FIELD: Record<string, OrganizationFieldKey> = {
  org_name: "orgName", description: "description", operating_hours: "hours", website_url: "website",
  contact_person_name: "contactName", contact_person_role: "contactRole",
  official_phone: "phone", official_email: "email", logo_file_url: "logo",
};

/** Why `PATCH /shelter/profile` failed, and which field (if any) the message belongs under. */
export function organizationErrorFrom(res: Res): { field?: OrganizationFieldKey; message: string } {
  const error = res.data?.error;
  if (res.status === 409 && error?.code === "org_name_locked") {
    return { field: "orgName", message: "Your organization's name is what we verified. Contact us to change it." };
  }
  if (res.status === 400 && error?.details && typeof error.details === "object") {
    for (const [server, messages] of Object.entries(error.details as Record<string, unknown>)) {
      const field = SERVER_TO_FIELD[server];
      const first = Array.isArray(messages) ? messages[0] : messages;
      if (field && typeof first === "string") return { field, message: first };
    }
  }
  if (res.status === 0) return { message: "Couldn't connect. Check your connection and try again." };
  return { message: "That didn't work. Try again." };
}
