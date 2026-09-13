/**
 * The deck's shortlist, kept on the phone and on the account. See shortlist.ts for the rules;
 * this is the storage and the network around them.
 *
 * Storage is `cache.readPref / writePref` under the cache prefix, as before — so signing out
 * still wipes the phone's copy, and the account's copy is what comes back on the next sign-in.
 * That round trip is the whole point, and the one thing to check on a device.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { useApi } from "./api/useApi";
import { readPref, writePref } from "./cache";
import { EMPTY, PendingOp, Shortlist, coalesce, diff, mergeForFirstSync } from "./shortlist";

type State = {
  list: Shortlist;
  /** False until the account's list has been merged in, or while a flush is owed. */
  synced: boolean;
  loaded: boolean;
  /**
   * Bumps only when the list changed from OUTSIDE the deck — the phone's copy loading, the
   * account's copy merging in. The deck rebuilds on this, never on its own `update`, which
   * would reset its position after every swipe.
   */
  generation: number;
};

export function useShortlist() {
  const api = useApi();
  const [state, setState] = useState<State>({ list: EMPTY, synced: false, loaded: false, generation: 0 });
  const listRef = useRef<Shortlist>(EMPTY);
  const pendingRef = useRef<PendingOp[]>([]);
  const mergedRef = useRef(false);

  const persist = useCallback((list: Shortlist, pending: PendingOp[]) => {
    listRef.current = list;
    pendingRef.current = pending;
    void writePref("adopt.saved", list.saved);
    void writePref("adopt.hidden", list.hidden);
    void writePref("adopt.pending", pending);
  }, []);

  /** Send the queue, coalesced. Whatever fails stays queued; nothing is applied twice. */
  const flush = useCallback(async () => {
    const ops = coalesce(pendingRef.current);
    if (!ops.length) { setState((s) => ({ ...s, synced: mergedRef.current })); return; }
    const failed: PendingOp[] = [];
    for (const op of ops) {
      const res = op.kind === null
        ? await api.del(`/me/shortlist/${op.id}`)
        : await api.put(`/me/shortlist/${op.id}`, { kind: op.kind });
      // A 404 is a listing that no longer exists: nothing to keep retrying for.
      if (!res.ok && res.status !== 404) failed.push(op);
    }
    persist(listRef.current, failed);
    setState((s) => ({ ...s, synced: mergedRef.current && failed.length === 0 }));
  }, [api, persist]);

  // Mount: the phone's copy first, then the account's, merged once.
  useEffect(() => {
    let alive = true;
    (async () => {
      const [saved, hidden, pending] = await Promise.all([
        readPref<string[]>("adopt.saved"), readPref<string[]>("adopt.hidden"), readPref<PendingOp[]>("adopt.pending")
      ]);
      if (!alive) return;
      const local: Shortlist = { saved: saved ?? [], hidden: hidden ?? [] };
      listRef.current = local;
      pendingRef.current = pending ?? [];
      setState((s) => ({ list: local, synced: false, loaded: true, generation: s.generation + 1 }));

      const res = await api.get("/me/shortlist");
      if (!alive) return;
      if (res.ok && Array.isArray(res.data?.saved) && Array.isArray(res.data?.hidden)) {
        const { merged, pushes } = mergeForFirstSync(listRef.current, { saved: res.data.saved, hidden: res.data.hidden });
        mergedRef.current = true;
        persist(merged, [...pendingRef.current, ...pushes]);
        setState((s) => ({ list: merged, synced: pushes.length === 0 && pendingRef.current.length === 0, loaded: true, generation: s.generation + 1 }));
      }
      await flush();
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per mount; the api identity changes only with the session, which remounts the deck
  }, []);

  /** The deck decided something: keep it on the phone now, on the account as soon as it can. */
  const update = useCallback((next: Shortlist) => {
    const ops = diff(listRef.current, next, Date.now());
    persist(next, [...pendingRef.current, ...ops]);
    setState((s) => ({ ...s, list: next, synced: false }));
    void flush();
  }, [persist, flush]);

  return { ...state, update, flush };
}
