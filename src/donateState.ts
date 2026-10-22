// AT1 · the donor's Donate screen is only reachable from a listing, so the shelter exists. `GET /shelters/{id}/donation-qr` answers 404 for an
// approved org with no verified QR yet (most shelters), and `loadState` reads every 404 as "gone" ("This is no longer available / It may have been
// removed"), which is false here and could cost the shelter a donation. A 404 on this route means "no QR to show yet": the empty state.
import { LoadState, loadState } from "./net";

type Apiish = Parameters<typeof loadState>[0];

export function donateLoadState(res: Apiish, count?: number): LoadState {
  if (res && res.status === 404) return { kind: "empty" };
  return loadState(res, count);
}
