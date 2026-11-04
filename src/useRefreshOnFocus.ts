// SQ5 (spec §5.3) · when a mounted shelter tab refetches. `useFocusEffect(load)` fires on EVERY focus of a mounted tab,
// so on a real tab navigator it would refetch on every switch and, on Requests, throw away "Load more" progress.
// The rule: load on first focus; after that load only when the data is older than `staleMs`, or when the shell has just
// come back from a pushed screen (that is where the shelter changes things). Adopted by the five shelter tab roots (PR 4).
import { useFocusEffect } from "@react-navigation/native";
import { createContext, useCallback, useContext, useRef } from "react";

/** Bumped by ShelterTabNavigator each time the shell regains focus after a pushed screen covered it. */
export const ShelterReturnContext = createContext(0);

export const DEFAULT_STALE_MS = 30_000;

export type RefreshInput = {
  /** When the last load that did not fail began; null before the first, or after a failed one. */
  lastLoadAt: number | null;
  now: number;
  staleMs: number;
  returns: number;
  /** `returns` as it was when the last load ran. */
  returnsAtLastLoad: number;
};

export function shouldRefresh({ lastLoadAt, now, staleMs, returns, returnsAtLastLoad }: RefreshInput): boolean {
  if (lastLoadAt === null) return true;
  if (returns !== returnsAtLastLoad) return true;
  return now - lastLoadAt >= staleMs;
}

/** `load` may return a promise resolving to `false` when it failed: the next focus then loads again. */
export function useRefreshOnFocus(load: () => void | Promise<boolean | void>, staleMs: number = DEFAULT_STALE_MS) {
  const returns = useContext(ShelterReturnContext);
  const lastLoadAt = useRef<number | null>(null);
  const returnsAtLastLoad = useRef(returns);
  // The latest `load`, read through a ref: a screen's `load` changes identity with its segment, and a changed callback
  // must not make the focus effect fire again. A segment change loads itself; this hook only decides about FOCUS.
  const loadRef = useRef(load);
  loadRef.current = load;

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (!shouldRefresh({ lastLoadAt: lastLoadAt.current, now, staleMs, returns, returnsAtLastLoad: returnsAtLastLoad.current })) return;
      lastLoadAt.current = now;
      returnsAtLastLoad.current = returns;
      const done = loadRef.current();
      if (done && typeof (done as Promise<unknown>).then === "function") {
        (done as Promise<boolean | void>).then((ok) => { if (ok === false) lastLoadAt.current = null; });
      }
    }, [returns, staleMs])
  );
}
