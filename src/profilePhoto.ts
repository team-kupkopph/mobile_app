// A person's own avatar: pick -> upload as `profile_photo` -> `PATCH /me { photo_file_url }`.
// Kept out of the screen so the sequence (and what each failure says) is testable without a device.
// The backend only accepts this account's own `profile_photo` upload, so a link can never be typed in.
import { Me } from "./api/types";
import { UploadResult, uploadErrorMessage } from "./upload";

type Api = { patch: (p: string, b?: any) => Promise<{ ok: boolean; status: number; data: any }> };

export type PhotoOutcome =
  | { kind: "saved"; me: Me }
  | { kind: "cancelled" }
  | { kind: "failed"; message: string };

const CONNECT = "Couldn't connect. Check your connection and try again.";
const SAVE_FAILED = "Couldn't save your photo. Try again.";

async function save(api: Api, photoFileUrl: string): Promise<PhotoOutcome> {
  const res = await api.patch("/me", { photo_file_url: photoFileUrl });
  if (res.ok) return { kind: "saved", me: res.data };
  return { kind: "failed", message: res.status === 0 ? CONNECT : SAVE_FAILED };
}

/** `pick` is the shared picker+uploader; `null` from it means the person cancelled or declined. */
export async function changeProfilePhoto(api: Api, pick: () => Promise<UploadResult | null>): Promise<PhotoOutcome> {
  const uploaded = await pick();
  if (uploaded === null) return { kind: "cancelled" };
  if (!uploaded.ok) return { kind: "failed", message: uploadErrorMessage(uploaded.reason) };
  return save(api, uploaded.fileUrl);
}

/** A blank address removes the photo (and the server deletes the stored object). */
export function removeProfilePhoto(api: Api): Promise<PhotoOutcome> {
  return save(api, "");
}
