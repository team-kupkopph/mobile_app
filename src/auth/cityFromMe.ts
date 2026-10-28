// X11 · seed the cached city from `GET /me`'s `location` (backend#112).

/**
 * The city to put in the cache, or null to leave it alone.
 *
 * Only ever fills an EMPTY cache: a city this phone already holds is the person's own, possibly
 * newer, choice, and the server copy must not silently replace it. City only — `/me` never carries
 * a street address or coordinates (§12.5), and this reads nothing else.
 */
export function cityToCache(
  me: { location?: { city?: unknown; barangay?: unknown } | null } | undefined,
  cached: string | null,
): string | null {
  if (cached) return null;
  const city = me?.location?.city;
  if (typeof city !== "string") return null;
  const trimmed = city.trim();
  return trimmed.length > 0 ? trimmed : null;
}
