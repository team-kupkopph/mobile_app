/**
 * X11 (backend#112) · `GET /me` now returns `location {city, barangay}`.
 *
 * The app caches the city in SecureStore (there used to be no way to read it back), so a new phone
 * or a reinstall showed "Set your city" while the server already had it — seen on a device walk.
 * The cache is still the source the screens read; this seeds it from the server when it is empty.
 */
import { readFileSync } from "fs";
import { join } from "path";

import { cityToCache } from "../auth/cityFromMe";

const read = (...p: string[]) => readFileSync(join(__dirname, "..", ...p), "utf8");

describe("cityToCache", () => {
  it("seeds an empty cache from the server's city", () => {
    expect(cityToCache({ location: { city: "Marikina", barangay: null } }, null)).toBe("Marikina");
  });

  it("never overwrites a city this phone already holds (the person's own, newer choice wins)", () => {
    expect(cityToCache({ location: { city: "Marikina" } }, "Pasig")).toBeNull();
  });

  it.each([
    ["no location", { location: null }],
    ["a missing location", {}],
    ["a blank city", { location: { city: "   " } }],
    ["a non-string city", { location: { city: 7 } }],
    ["an undefined account", undefined],
  ])("does nothing for %s", (_label, me) => {
    expect(cityToCache(me as never, null)).toBeNull();
  });

  it("trims what it caches", () => {
    expect(cityToCache({ location: { city: "  Quezon City " } }, null)).toBe("Quezon City");
  });
});

describe("the wiring", () => {
  it.each(["HomeScreen.tsx", "ProfileScreen.tsx"])("%s seeds the cached city from /me", (file) => {
    const src = read("screens", file);
    // ⚠️ Assert the scan found something before believing it found nothing.
    expect(src.length).toBeGreaterThan(500);
    expect(src).toContain("cityToCache(");
    expect(src).toContain("setCity(");
  });
});
