// City-level centroids for the rescue map (US-S4). The backend deliberately withholds each
// report's precise `geom` (§12.5 / decision 11) — the public map is city-scoped, never the
// reporter's exact spot. So the client centres the map on the *city*, not on any report, using
// these approximate Metro Manila centroids. No per-report coordinate is ever plotted.
export type LatLng = { lat: number; lng: number };

// Approximate city centroids (WGS84). Keys are lowercased city names.
const CENTROIDS: Record<string, LatLng> = {
  marikina: { lat: 14.6507, lng: 121.1029 },
  "quezon city": { lat: 14.676, lng: 121.0437 },
  manila: { lat: 14.5995, lng: 120.9842 },
  makati: { lat: 14.5547, lng: 121.0244 },
  pasig: { lat: 14.5764, lng: 121.0851 },
  taguig: { lat: 14.5176, lng: 121.0509 },
  caloocan: { lat: 14.6577, lng: 120.9836 },
  "parañaque": { lat: 14.4793, lng: 121.0198 },
  paranaque: { lat: 14.4793, lng: 121.0198 },
  "las piñas": { lat: 14.4499, lng: 120.9833 },
  "las pinas": { lat: 14.4499, lng: 120.9833 },
  muntinlupa: { lat: 14.4081, lng: 121.0415 },
  mandaluyong: { lat: 14.5794, lng: 121.0359 },
  "san juan": { lat: 14.6019, lng: 121.0355 },
  pasay: { lat: 14.5378, lng: 121.0014 },
  valenzuela: { lat: 14.7011, lng: 120.983 },
  malabon: { lat: 14.657, lng: 120.9567 },
  navotas: { lat: 14.6667, lng: 120.9417 },
  pateros: { lat: 14.5443, lng: 121.0699 }
};

// The app's default city (see RescueMapScreen) — also the fallback when the city is unknown,
// so the map always has a sensible Metro Manila centre rather than defaulting to (0,0).
export const DEFAULT_CENTROID: LatLng = CENTROIDS.marikina;

export function centroidFor(city?: string | null): LatLng {
  if (!city) return DEFAULT_CENTROID;
  return CENTROIDS[city.trim().toLowerCase()] ?? DEFAULT_CENTROID;
}
