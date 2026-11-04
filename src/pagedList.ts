import { ApiResult } from "./api/client";

// SH3 / SH6 (shelter home review) · a server-paged list ({results, next}) that reads every page and never shows a stale
// answer. The same R1-F1 shape as ListingsByStatus (a generation counter bumped on every page-1 load, "Load more" while
// `next` is set), kept pure so the paging and the race are testable without rendering.
//
// - `reset(path)` loads page 1 of `path` and drops any answer still in flight for an earlier path (a segment switch).
// - `more()` appends page `next`. One at a time: a second tap while a page is in flight asks for nothing.
//   A failed page keeps the rows already shown and the same `next`, and sets `moreFailed` for an inline retry;
//   it never turns a list that loaded into a failed load.
// - `refresh()` (SQ5) re-reads the pages already loaded for the same path and swaps the rows in one step, so a tab that stays
//   mounted keeps its rows, its "Load more" progress and its place on screen while it updates. A failed or superseded
//   refresh leaves what is showing alone and resolves false.
// - Nothing pages on its own, so an empty page with a non-null `next` cannot loop.
export type PagedState<T> = {
  items: T[] | null;
  next: number | null;
  /** Page 1's outcome, for loadState(); null while it is in flight. */
  res: { ok: boolean; status: number } | null;
  moreFailed: boolean;
  /** The server's total for the query (page 1's `count`), or null when it sends none. Never `items.length`. */
  count: number | null;
};

export const EMPTY_PAGED: PagedState<never> = { items: null, next: null, res: null, moreFailed: false, count: null };

function withPage(path: string, page: number): string {
  return `${path}${path.includes("?") ? "&" : "?"}page=${page}`;
}

export function createPagedList<T>(
  get: (path: string) => Promise<ApiResult>,
  onChange: (state: PagedState<T>) => void
) {
  let generation = 0;
  let base = "";
  let loadingMore = false;
  let refreshing = false;
  /** Pages read for `base` so far (1 after a reset, the last appended page after a "Load more"). */
  let pages = 0;
  let state: PagedState<T> = EMPTY_PAGED;
  const set = (patch: Partial<PagedState<T>>) => {
    state = { ...state, ...patch };
    onChange(state);
  };

  return {
    /** Resolves true when page 1 loaded, false when it failed or a later reset/refresh superseded it. */
    reset(path: string): Promise<boolean> {
      const gen = ++generation;
      base = path;
      loadingMore = false;
      refreshing = false;
      pages = 0;
      set({ ...EMPTY_PAGED });
      return get(withPage(path, 1)).then((r) => {
        if (gen !== generation) return false;
        pages = r.ok ? 1 : 0;
        set({
          res: { ok: r.ok, status: r.status },
          items: r.ok ? (r.data?.results ?? []) : null,
          next: r.ok ? (r.data?.next ?? null) : null,
          count: r.ok && typeof r.data?.count === "number" ? r.data.count : null
        });
        return r.ok;
      });
    },
    more(): Promise<void> {
      const page = state.next;
      if (!page || loadingMore || refreshing) return Promise.resolve();
      const gen = generation;
      loadingMore = true;
      set({ moreFailed: false });
      return get(withPage(base, page)).then((r) => {
        if (gen !== generation) return;
        loadingMore = false;
        if (!r.ok) {
          set({ moreFailed: true });
          return;
        }
        pages = page;
        set({ items: [...(state.items ?? []), ...(r.data?.results ?? [])], next: r.data?.next ?? null });
      });
    },
    async refresh(): Promise<boolean> {
      if (!base || pages === 0) return false;
      const gen = ++generation;
      loadingMore = false;
      refreshing = true;
      const items: T[] = [];
      let next: number | null = null;
      let count: number | null = null;
      let last = 0;
      for (let page = 1; page <= pages; page++) {
        const r = await get(withPage(base, page));
        if (gen !== generation) return false;
        if (!r.ok) { refreshing = false; return false; }
        items.push(...(r.data?.results ?? []));
        next = r.data?.next ?? null;
        if (page === 1) count = typeof r.data?.count === "number" ? r.data.count : null;
        last = page;
        if (next === null) break;
      }
      refreshing = false;
      pages = last;
      set({ res: { ok: true, status: 200 }, items, next, count, moreFailed: false });
      return true;
    }
  };
}
