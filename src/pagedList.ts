import { ApiResult } from "./api/client";

// SH3 / SH6 (shelter home review) · a server-paged list ({results, next}) that reads every page and never shows a stale
// answer. The same R1-F1 shape as ListingsByStatus (a generation counter bumped on every page-1 load, "Load more" while
// `next` is set), kept pure so the paging and the race are testable without rendering.
//
// - `reset(path)` loads page 1 of `path` and drops any answer still in flight for an earlier path (a segment switch).
// - `more()` appends page `next`. One at a time: a second tap while a page is in flight asks for nothing.
//   A failed page keeps the rows already shown and the same `next`, and sets `moreFailed` for an inline retry;
//   it never turns a list that loaded into a failed load.
// - Nothing pages on its own, so an empty page with a non-null `next` cannot loop.
export type PagedState<T> = {
  items: T[] | null;
  next: number | null;
  /** Page 1's outcome, for loadState(); null while it is in flight. */
  res: { ok: boolean; status: number } | null;
  moreFailed: boolean;
};

export const EMPTY_PAGED: PagedState<never> = { items: null, next: null, res: null, moreFailed: false };

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
  let state: PagedState<T> = EMPTY_PAGED;
  const set = (patch: Partial<PagedState<T>>) => {
    state = { ...state, ...patch };
    onChange(state);
  };

  return {
    reset(path: string): Promise<void> {
      const gen = ++generation;
      base = path;
      loadingMore = false;
      set({ ...EMPTY_PAGED });
      return get(withPage(path, 1)).then((r) => {
        if (gen !== generation) return;
        set({
          res: { ok: r.ok, status: r.status },
          items: r.ok ? (r.data?.results ?? []) : null,
          next: r.ok ? (r.data?.next ?? null) : null
        });
      });
    },
    more(): Promise<void> {
      const page = state.next;
      if (!page || loadingMore) return Promise.resolve();
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
        set({ items: [...(state.items ?? []), ...(r.data?.results ?? [])], next: r.data?.next ?? null });
      });
    }
  };
}
