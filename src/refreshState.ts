// SQ5 follow-up (spec §4.5) · a tab that stays mounted refreshes IN PLACE, so a refresh that fails must not turn a panel that
// had loaded into a failure panel. The result a panel keeps is the last good one; a panel that never loaded takes whatever came.
export type ResState = { ok: boolean; status: number } | null;

export function keepGoodRes(prev: ResState, next: { ok: boolean; status: number }): ResState {
  return prev?.ok && !next.ok ? prev : { ok: next.ok, status: next.status };
}
