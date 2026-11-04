// U12 / NT-3 (shelter home test plan) · "5 min ago", "3h ago", "2d ago", then a short date. One helper for the Requests
// rows and the volunteer Pending section, which each had a private copy. A future timestamp (clock skew) is "just now";
// an unparseable one is "" — the copies fell through to `toLocaleDateString` and printed "Invalid Date" on the row.
export function timeAgo(iso: string, nowMs: number = Date.now()): string {
  const at = new Date(iso).getTime();
  if (Number.isNaN(at)) return "";
  const mins = Math.max(0, Math.floor((nowMs - at) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
