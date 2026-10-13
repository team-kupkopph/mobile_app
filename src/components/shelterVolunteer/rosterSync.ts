// The activity screen keeps its Pending, Confirmed and Attendance sections mounted side by side, and each fetched only when the screen gained focus.
// A change in one (approve, remove, mark attended) left the others stale until the screen was re-entered. The screen holds one `RosterSync`; a
// section that changes the roster reports itself via `onRosterChanged(source)`, and every OTHER section refetches when the counter moves.
import { useEffect } from "react";

export type RosterSection = "pending" | "confirmed" | "attendance";
export type RosterSync = { n: number; from: RosterSection | null };

export const NO_ROSTER_SYNC: RosterSync = { n: 0, from: null };

export function useReloadOnRosterChange(self: RosterSection, sync: RosterSync | undefined, reload: () => void) {
  useEffect(() => {
    if (sync && sync.n > 0 && sync.from !== self) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the counter moving should refetch
  }, [sync?.n]);
}
