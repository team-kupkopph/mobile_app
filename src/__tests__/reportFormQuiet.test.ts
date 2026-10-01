// C24 · the report form says why it is waiting and why something failed. A source guard,
// like the other screen-wiring guards: the behaviours live in sagip.ts / upload.ts.
import fs from "fs";

test("ReportStray: the pin option shows while locating, and upload failures are said", () => {
  const src = fs.readFileSync("src/screens/ReportStrayScreen.tsx", "utf8");
  expect(src).toContain("withTimeout(Location.getCurrentPositionAsync({}), GPS_TIMEOUT_MS)");
  // PR3-F3 · the last-known fallback is bounded: a fix from yesterday's street is not this one.
  expect(src).toContain(
    "Location.getLastKnownPositionAsync({ maxAge: LAST_KNOWN_MAX_AGE_MS, requiredAccuracy: LAST_KNOWN_MAX_ACCURACY_M })");
  expect(src).not.toContain("getLastKnownPositionAsync()");
  expect(src.match(/testID="btn\.reportStray\.dropPin"/g)?.length).toBe(1);
  expect(src).toContain('locState !== "ready"');       // the pin button's render condition
  expect(src).toContain("uploadErrorMessage(");
  expect(src).toContain("The photo is still uploading");
});

test("RescueUpdate: an outcome photo failure is said", () => {
  expect(fs.readFileSync("src/screens/RescueUpdateScreen.tsx", "utf8")).toContain("uploadErrorMessage(");
});

test("ReportStray: a dropped pin wins over a late GPS fix (every location write is gated)", () => {
  const src = fs.readFileSync("src/screens/ReportStrayScreen.tsx", "utf8");
  expect(src).toContain("pinnedRef.current = true");
  expect(src).toContain("gpsMayApply(pinnedRef.current, cancelled)");
  expect(src).toContain("return () => { cancelled = true; }");
  // the location effect: after the permission await, after the fix await, after the
  // reverse-geocode, before "ready", and in the catch (denied) path
  const effect = src.slice(src.indexOf("const pinnedRef"), src.indexOf("// US-S2"));
  expect(effect.match(/if \(stale\(\)\) return;/g)?.length).toBeGreaterThanOrEqual(5);
  // no state write in the effect that is not preceded by a gate: the denied/ready writes
  expect(effect).not.toMatch(/catch \{\s*setLocState/);
});

test("ReportStray: a photo failure shows under the photo button, not down by Send", () => {
  const src = fs.readFileSync("src/screens/ReportStrayScreen.tsx", "utf8");
  expect(src).toContain("setPhotoError(uploadErrorMessage(");
  expect(src).toContain("setPhotoError(undefined)");
  expect(src.indexOf("{photoError ?")).toBeGreaterThan(src.indexOf("onPress={addPhoto}"));
  expect(src.indexOf("{photoError ?")).toBeLessThan(src.indexOf("{error ?"));
});

test("PR3-F2 · a queued report carries why it queued to the sent screen, which says it", () => {
  const form = fs.readFileSync("src/screens/ReportStrayScreen.tsx", "utf8");
  expect(form).toMatch(/queuedReason: queuedReason\(res\.status, res\.data\?\.error\?\.code\)/);
  const sent = fs.readFileSync("src/screens/ReportSentScreen.tsx", "utf8");
  expect(sent).toContain("queuedReportLine(queuedReason)");
  expect(sent).not.toContain("You're offline. This sends by itself");   // the copy lives in sagip.ts
});

test("PR3-F5 · RescueUpdate: Mark waits for the outcome photo, and a good pick clears its error", () => {
  const src = fs.readFileSync("src/screens/RescueUpdateScreen.tsx", "utf8");
  const submit = src.slice(src.indexOf("async function submit("), src.indexOf("setSubmitting(true)"));
  expect(submit).toContain('if (uploadingPhoto) { setError("The photo is still uploading — one moment."); return; }');
  const pick = src.slice(src.indexOf("async function addOutcomePhoto"), src.indexOf("async function submit("));
  expect(pick).toMatch(/if \(res\?\.ok\) \{ setOutcomePhotoUrl\(res\.fileUrl\); setError\(undefined\); \}/);
});
