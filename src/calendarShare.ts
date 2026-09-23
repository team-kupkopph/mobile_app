// G5 · "Add to calendar" — shared by the check-in screen and MyShifts' Upcoming cards, so the
// write-then-share sequence has one implementation instead of two copies drifting apart.
// Matches ExportDataScreen's `File`/`Paths` (expo-file-system v19) style, not the older
// `FileSystem.cacheDirectory` + `writeAsStringAsync` free functions — one style per repo.
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { buildIcs, MySignupItem } from "./volunteer";

export async function addToCalendar(item: MySignupItem): Promise<void> {
  const file = new File(Paths.cache, `kupkop-shift-${item.signup_id}.ics`);
  file.create({ overwrite: true });
  file.write(buildIcs(item));
  await Sharing.shareAsync(file.uri, { mimeType: "text/calendar", UTI: "com.apple.ical.ics" });
}
