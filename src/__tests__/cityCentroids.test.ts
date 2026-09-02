import { centroidFor, DEFAULT_CENTROID } from "../cityCentroids";

describe("centroidFor", () => {
  it("returns the centroid for a known city", () => {
    expect(centroidFor("Marikina")).toEqual({ lat: 14.6507, lng: 121.1029 });
    expect(centroidFor("Quezon City")).toEqual({ lat: 14.676, lng: 121.0437 });
  });

  it("is case- and whitespace-insensitive", () => {
    expect(centroidFor("  makati ")).toEqual(centroidFor("Makati"));
    expect(centroidFor("MANILA")).toEqual(centroidFor("manila"));
  });

  it("accepts accented and unaccented spellings", () => {
    expect(centroidFor("Parañaque")).toEqual(centroidFor("Paranaque"));
    expect(centroidFor("Las Piñas")).toEqual(centroidFor("Las Pinas"));
  });

  it("falls back to the default centroid for unknown or empty cities", () => {
    expect(centroidFor("Cebu")).toEqual(DEFAULT_CENTROID);
    expect(centroidFor("")).toEqual(DEFAULT_CENTROID);
    expect(centroidFor(null)).toEqual(DEFAULT_CENTROID);
    expect(centroidFor(undefined)).toEqual(DEFAULT_CENTROID);
  });

  it("never returns null-island (0,0) as a fallback", () => {
    const c = centroidFor("nowhere");
    expect(c.lat).not.toBe(0);
    expect(c.lng).not.toBe(0);
  });
});
