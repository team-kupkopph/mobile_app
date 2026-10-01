// C24 · the report form says why it is waiting and why something failed. A source guard,
// like the other screen-wiring guards: the behaviours live in sagip.ts / upload.ts.
import fs from "fs";

test("ReportStray: the pin option shows while locating, and upload failures are said", () => {
  const src = fs.readFileSync("src/screens/ReportStrayScreen.tsx", "utf8");
  expect(src).toContain("withTimeout(Location.getCurrentPositionAsync({}), GPS_TIMEOUT_MS)");
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
