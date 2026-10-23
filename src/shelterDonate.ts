// Task B1 · the Donate tab root's pure derivation. Kept out of the screen — same shape as
// `shelterDashboard.ts`'s `shelterBannerState` / `shelterVerificationCard` — so the QR-state
// rule and the needs → row mapping are testable without React Native at all.
//
// There is no dedicated "my own donation QR status" endpoint. `/shelter/dashboard`'s
// `gates.donations_enabled` (backend `shelter/views.py::ShelterDashboardView.get`) already
// IS the two-key gate — org approved AND the QR reviewer-verified — so "locked" reads
// straight off the dashboard rather than being re-derived here. The QR *content* to preview
// comes from `GET /shelters/{account_id}/donation-qr`, the same public, two-key-gated
// endpoint the donor-facing `DonateScreen` (US-Q2) reads for a stranger's shelter — read
// here with the shelter's own account_id instead. A 404 there just means "nothing to show
// yet" (`ShelterDonationQrPublicView`'s own docstring), never an error.
import { ShelterDashboard } from "./api/types";

export type DonateQrState = "locked" | "missing" | "ready";

/** One donation QR row, the same shape `DonateScreen` renders for a donor. */
export type ShelterOwnDonationQr = { provider: string; account_name: string; qr_image_url: string };

/** What `GET /shelters/{account_id}/donation-qr` returns on success. */
export type ShelterOwnDonationQrResponse = { donation_qrs: ShelterOwnDonationQr[] };

/**
 * A wishlist need as `GET /shelters/{account_id}/needs` sends it. Both totals ride on the row
 * (`quantity_pledged` is the sum of its still-open pledges), so the screen makes ONE request —
 * the per-need `/needs/{id}/pledges` fan-out it used to do is gone. `quantity_pledged` is optional
 * only because a server older than the wishlist refactor does not send it (read as 0).
 */
export type DonateNeedInput = {
  need_id: string;
  title: string;
  quantity_received: number;
  quantity_pledged?: number;
};

export type DonateNeedRow = { id: string; title: string; pledged: number; received: number };

export type DonateSections = { qr: DonateQrState; needs: DonateNeedRow[] };

export function donateSections(
  dashboard: Pick<ShelterDashboard, "gates"> | null,
  qr: ShelterOwnDonationQrResponse | null,
  needs: DonateNeedInput[] | null
): DonateSections {
  const enabled = dashboard?.gates.donations_enabled ?? false;
  const hasQr = !!qr && qr.donation_qrs.length > 0;
  const qrState: DonateQrState = !enabled ? "locked" : hasQr ? "ready" : "missing";

  return {
    qr: qrState,
    needs: (needs ?? []).map((n) => ({
      id: n.need_id,
      title: n.title,
      pledged: n.quantity_pledged ?? 0,
      received: n.quantity_received
    }))
  };
}
