/**
 * Flow 70 taps `btn.home.rescueMap` with the backend STOPPED. When every Home panel is offline the
 * screen collapses its sections into one notice, and the map header used to collapse with them, so
 * the flow could never reach the screen it exists to check. The header now renders in BOTH branches.
 */
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(__dirname, "..", "screens", "HomeScreen.tsx"), "utf8");

describe("Home keeps the rescue map reachable when it is fully offline", () => {
  it("defines the header once, with the selector flow 70 taps", () => {
    expect(src.match(/testID="btn\.home\.rescueMap"/g)).toHaveLength(1);
  });

  it("renders it in the all-offline branch, before the offline notice", () => {
    const start = src.indexOf("{allOffline ? (");
    expect(start).toBeGreaterThan(-1);
    const offlineBranch = src.slice(start, src.indexOf(") : (", start));
    expect(offlineBranch).toMatch(/rescueMapHeader\(/);
    expect(offlineBranch.indexOf("rescueMapHeader(")).toBeLessThan(offlineBranch.indexOf('kind: "offline"'));
  });

  it("renders it in the normal branch too", () => {
    const normal = src.slice(src.indexOf(") : (", src.indexOf("{allOffline ? (")));
    expect(normal).toMatch(/rescueMapHeader\(/);
  });
});
