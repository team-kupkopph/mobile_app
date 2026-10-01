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
