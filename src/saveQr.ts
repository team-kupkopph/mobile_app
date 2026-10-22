// DW1 · "Save QR" on the donor's Donate screen. A donor with one phone cannot scan the code on the screen they are reading, but GCash and Maya both scan a
// SAVED image. The code is downloaded to the cache and handed to the iOS share sheet ("Save Image" puts it in Photos), the same File + Sharing style as
// calendarShare.ts: no new native module and no Photos permission prompt.
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

export type SaveQrResult = { ok: true } | { ok: false; reason: "download" | "unavailable" };

export async function saveQrImage(url: string, provider: string): Promise<SaveQrResult> {
  const dest = new File(Paths.cache, `kupkop-qr-${provider}.jpg`);
  try {
    if (dest.exists) dest.delete();
    const file = await File.downloadFileAsync(url, dest);
    if (!(await Sharing.isAvailableAsync())) return { ok: false, reason: "unavailable" };
    try {
      await Sharing.shareAsync(file.uri, { mimeType: "image/jpeg", UTI: "public.jpeg" });
    } catch {
      // The donor dismissed the sheet (or it failed after the code was ready): nothing for them to act on.
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: "download" };
  }
}
