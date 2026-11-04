// NT-4 (shelter home test plan; owner decision 2026-11-04) · a per-load generation counter, as a wrapper. A screen
// that refetches on every focus calls `begin()` at the start of each load and wraps each answer's handler with the
// function it returns; an answer applies only if no later load has begun since. Requests has the same rule inside
// createPagedList (R1-F1, SH6); this is it for screens that fire several independent requests.
export function createLatestOnly() {
  let generation = 0;
  return {
    begin() {
      const mine = ++generation;
      return <A extends unknown[]>(handle: (...args: A) => void) =>
        (...args: A) => {
          if (mine === generation) handle(...args);
        };
    }
  };
}
