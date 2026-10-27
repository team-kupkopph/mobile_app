// US-W4 · Ways to help — the words and the list rules behind the Home section and WaysToHelpScreen. The rows come from
// `GET /shelters/ways-to-help?city=` (backend community/reads.py `ways_to_help_rows`): verified shelters with an open need
// or a live QR, the viewer's city first. Design: library docs/superpowers/specs/2026-10-27-us-w4-ways-to-help-design.md.

export type HelpShelter = {
  account_id: string;
  org_name: string;
  city: string;          // "" when the shelter has no address — such a shelter is listed, never near
  near: boolean;
  open_needs: number;
  need_titles: string[]; // the two newest open needs
  takes_qr: boolean;
};

export const WAYS_TO_HELP_EMPTY = "No shelters are asking for help right now.";
export const WAYS_TO_HELP_INTRO = "Verified shelters asking for help. Pledge an item from their wishlist, or give through their QR.";
export const TAKES_QR = "Takes QR donations";

export function needCountLabel(n: number): string {
  return n === 1 ? "1 need" : `${n} needs`;
}

/** The Home row's line: "Marikina City · 4 needs", or "Takes QR donations" for a shelter with only a QR. */
export function helpRowMeta(s: HelpShelter): string {
  return [s.city, s.open_needs > 0 ? needCountLabel(s.open_needs) : TAKES_QR].filter(Boolean).join(" · ");
}

/**
 * The list's headed groups. The server sends near shelters first, so "Near {city}" then "Other shelters" — headings only
 * when there is something near to set apart; otherwise one unheaded list (a guest with no city, or nothing nearby).
 */
export function helpGroups(rows: HelpShelter[], viewerCity: string | null): { title: string | null; rows: HelpShelter[] }[] {
  if (rows.length === 0) return [];
  const near = rows.filter((r) => r.near);
  if (!viewerCity || near.length === 0) return [{ title: null, rows }];
  const other = rows.filter((r) => !r.near);
  return other.length > 0
    ? [{ title: `Near ${viewerCity}`, rows: near }, { title: "Other shelters", rows: other }]
    : [{ title: `Near ${viewerCity}`, rows: near }];
}

/** Load more. A shelter whose ranking moved between two fetches can come back on the next page; keep the first copy. */
export function appendShelters(prev: HelpShelter[] | null, more: HelpShelter[]): HelpShelter[] {
  const shown = new Set((prev ?? []).map((s) => s.account_id));
  return [...(prev ?? []), ...more.filter((s) => !shown.has(s.account_id))];
}
