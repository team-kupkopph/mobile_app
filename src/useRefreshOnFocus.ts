// SQ5 (spec §5.3) · when a mounted shelter tab refetches. `useFocusEffect(load)` fires on EVERY focus of a mounted tab,
// so on a real tab navigator it would refetch on every switch and, on Requests, throw away "Load more" progress.
// The rule: load on first focus; after that load only when the data is older than `staleMs`, or when the shell has just
// come back from a pushed screen (that is where the shelter changes things). Adopted by the five shelter tab roots (PR 4).
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { MutableRefObject, createContext, useCallback, useContext, useEffect, useRef } from "react";

/** Bumped by ShelterTabNavigator each time the shell regains focus after a pushed screen covered it. */
export const ShelterReturnContext = createContext(0);

export const DEFAULT_STALE_MS = 30_000;

/**
 * Coming back from a pushed screen fires TWO triggers a moment apart: the tab's own focus (which loads if the data is stale)
 * and then the shell's "returned" count. The second would repeat the first's request (the walk saw two identical requests
 * and two overlapping refreshes). A load that began this recently, on this focus, is as fresh as the pop, so the count alone
 * does not start another.
 */
export const COALESCE_MS = 2_000;

export type RefreshInput = {
  /** When the last load that did not fail began; null before the first, or after a failed one. */
  lastLoadAt: number | null;
  now: number;
  staleMs: number;
  returns: number;
  /** `returns` as it was when the last load ran. */
  returnsAtLastLoad: number;
  /** A load that was due while the tab was not focused (a key change): the next focus loads whatever the window says. */
  invalidated?: boolean;
};

export function shouldRefresh({ lastLoadAt, now, staleMs, returns, returnsAtLastLoad, invalidated }: RefreshInput): boolean {
  if (lastLoadAt === null || invalidated) return true;
  if (returns !== returnsAtLastLoad) return now - lastLoadAt >= COALESCE_MS;
  return now - lastLoadAt >= staleMs;
}

/** `load` may return a promise resolving to `false` when it failed: the next focus then loads again. */
export function useRefreshOnFocus(
  load: () => void | boolean | Promise<boolean | void>,
  staleMs: number = DEFAULT_STALE_MS,
  invalidated?: MutableRefObject<boolean>
) {
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
      const stale = invalidated?.current ?? false;
      if (invalidated) invalidated.current = false;
      if (!shouldRefresh({ lastLoadAt: lastLoadAt.current, now, staleMs, returns, returnsAtLastLoad: returnsAtLastLoad.current, invalidated: stale })) {
        returnsAtLastLoad.current = returns; // counted: a skipped return must not trigger on the next, unrelated focus
        return;
      }
      lastLoadAt.current = now;
      returnsAtLastLoad.current = returns;
      const done = loadRef.current();
      if (done === false) lastLoadAt.current = null; // not ready / nothing was asked: try again at the next focus
      else if (done && typeof (done as Promise<unknown>).then === "function") {
        (done as Promise<boolean | void>).then((ok) => { if (ok === false) lastLoadAt.current = null; });
      }
    }, [returns, staleMs])
  );
}

/**
 * `useRefreshOnFocus` for a load that depends on something that can change while the tab is mounted: the filters of a feed, the
 * cached city landing after a cold start. `key` identifies those inputs; `null` means "not ready yet".
 * - the FOCUS load reports failure while `key` is null, so it retries on the next focus instead of waiting out the window;
 * - a CHANGE of `key` loads by itself while the tab is focused (the focus policy only decides about focus, and reads `load`
 *   through a ref), and invalidates it otherwise (see below); the key a screen first mounts with does not load: its first focus does.
 */
export function useRefreshWithKey(load: () => void | boolean | Promise<boolean | void>, key: string | null, staleMs: number = DEFAULT_STALE_MS) {
  const loadRef = useRef(load);
  loadRef.current = load;
  const keyRef = useRef(key);
  keyRef.current = key;
  // NT-O3 · a key change while the tab is NOT focused (a picker pushed over it, another tab) loads nothing in the background:
  // it invalidates, and the next focus loads once. Loading at once AND again on return sent every city-scoped request twice.
  const focused = useIsFocused();
  const invalid = useRef(false);
  useRefreshOnFocus(() => {
    if (keyRef.current === null) return false;
    return loadRef.current();
  }, staleMs, invalid);
  const prevKey = useRef(key);
  useEffect(() => {
    if (prevKey.current !== key) {
      prevKey.current = key;
      if (key !== null) {
        if (focused) loadRef.current();
        else invalid.current = true;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `focused` is read when the key changes, not a trigger
  }, [key]);
}
