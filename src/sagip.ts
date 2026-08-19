import { StrayStatus } from "./api/types";

// Sagip's shared display logic, unit-tested (like shelterDashboard.ts / verifications.ts).

// Rule 5: only unclaimed is amber. Reported (amber = someone must still act) · Claimed
// (teal, being helped) · Rescued/Safe (green, resolved-ish) · Resolved (grey).
export type StrayTone = "amber" | "teal" | "green" | "grey";

export function strayChip(status: StrayStatus): { label: string; tone: StrayTone } {
  switch (status) {
    case "reported":
      return { label: "Reported", tone: "amber" };
    case "claimed":
      return { label: "Claimed", tone: "teal" };
    case "rescued":
      return { label: "Rescued", tone: "green" };
    case "safe":
      return { label: "Safe", tone: "green" };
    default:
      return { label: "Resolved", tone: "grey" };
  }
}

function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export function sagipTitle(species: string, condition: string): string {
  return `${cap(species)} · ${cap(condition)}`;
}

export function relTime(iso: string, nowMs: number = Date.now()): string {
  const mins = Math.max(0, Math.floor((nowMs - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
