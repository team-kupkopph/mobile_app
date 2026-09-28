// Task 9 · moved VERBATIM out of the old ShelterVolunteerRequestsScreen (US-V9). Only the
// rendering moved to PendingSection — every guard here is unchanged:
//   - the double-tap guards (`if (busySignupId) return;` on decline; the confirm modal's own
//     `if (reapprove && !busySignupId)` on both its buttons)
//   - "never approve before the shift's type is known" (IMPORTANT 1 in the old screen) — a
//     walking shift's animal picker could otherwise be silently skipped with no way to attach
//     a listing after the fact
//   - the re-approval re-call: after a 409 `reapproval_required`, "Approve anyway" re-POSTs
//     with the SAME `assignedListingId` the shelter already picked, not a fresh null
//
// The one deliberate change from the original: the old screen tracked a separate
// `shiftLoaded` boolean so a shift-fetch FAILURE (shift stays null, shiftLoaded becomes true)
// would still let Approve through with no listing attached. Task 9's hook signature is
// `(shiftId, shift, onChanged)` — no separate loaded flag — so `shift === null` now blocks
// Approve unconditionally, whether that's "still loading" or "failed to load". That is
// strictly safer for the walking-shift guard this code exists to enforce, at the cost of
// also blocking approval when the (secondary) shift fetch fails — an edge case the header
// already renders its own retry for.
import { useState } from "react";

import { useApi } from "../../api/useApi";
import { ListingCard, ShelterShift } from "../../shelterVolunteer";
import { Reliability } from "../../volunteer";

// The reapprove-confirm dialog's context: which signup, its reliability block (for K11's
// copy), and the listing (if any) already picked for it — carried through so the re-call
// after "Approve anyway" assigns the SAME animal the shelter chose before hitting the 409.
export type ReapproveState = { signupId: string; details: Reliability; assignedListingId: string | null };

export function useRequestActions(
  shiftId: string,
  shift: ShelterShift | null,
  onChanged: () => void
) {
  const api = useApi();

  const [banner, setBanner] = useState<string | null>(null);
  const [busySignupId, setBusySignupId] = useState<string | null>(null);

  const [pickerSignupId, setPickerSignupId] = useState<string | null>(null);
  const [listings, setListings] = useState<ListingCard[]>([]);
  const [listingsLoaded, setListingsLoaded] = useState(false);
  const [listingsError, setListingsError] = useState(false);

  const [reapprove, setReapprove] = useState<ReapproveState | null>(null);

  function loadListingsIfNeeded() {
    if (listingsLoaded) return;
    api.get("/listings?mine=true").then((r) => {
      if (r.ok) {
        setListings(r.data?.results ?? []);
        setListingsError(false);
      } else {
        setListingsError(true);
      }
      setListingsLoaded(true);
    });
  }

  function onPressApprove(signupId: string) {
    // Defense in depth alongside the button's own `loading` — never approve before we know
    // the shift's type, or a walking shift's picker could be silently skipped.
    if (!shift) return;
    setBanner(null);
    if (shift.type === "walking") {
      loadListingsIfNeeded();
      setPickerSignupId(signupId);
      return;
    }
    doApprove(signupId, null);
  }

  function onPickListing(listingId: string | null) {
    const signupId = pickerSignupId;
    setPickerSignupId(null);
    if (signupId) doApprove(signupId, listingId);
  }

  async function doApprove(signupId: string, assignedListingId: string | null, acknowledged = false) {
    setBusySignupId(signupId);
    setBanner(null);
    const body: { assigned_listing_id?: string; acknowledged_reapproval?: boolean } = {};
    if (assignedListingId) body.assigned_listing_id = assignedListingId;
    if (acknowledged) body.acknowledged_reapproval = true;
    const res = await api.post(`/shelter/signups/${signupId}/approve`, body);
    setBusySignupId(null);
    if (res.ok) {
      setReapprove(null);
      onChanged();
      return;
    }
    const code = res.data?.error?.code;
    if (res.status === 409 && code === "reapproval_required") {
      setReapprove({ signupId, details: res.data.error.details, assignedListingId });
      return;
    }
    setReapprove(null);
    if (res.status === 409 && code === "shift_full") {
      setBanner("This activity is already full.");
    } else if (res.status === 409 && code === "not_pending") {
      onChanged();
    } else {
      setBanner(res.data?.error?.message ?? "Couldn't approve this request. Try again.");
    }
  }

  async function doDecline(signupId: string) {
    if (busySignupId) return; // one row at a time
    setBusySignupId(signupId);
    setBanner(null);
    const res = await api.post(`/shelter/signups/${signupId}/decline`);
    setBusySignupId(null);
    if (res.ok) {
      setReapprove(null);
      onChanged();
      return;
    }
    const code = res.data?.error?.code;
    if (res.status === 409 && code === "not_pending") {
      setReapprove(null);
      onChanged();
    } else {
      // Close the reapprove modal on any other failure too — otherwise it stays open on top
      // of the banner and hides the error (a no-op when it wasn't open, i.e. a plain row
      // Decline that failed).
      setReapprove(null);
      setBanner(res.data?.error?.message ?? "Couldn't decline this request. Try again.");
    }
  }

  function dismissReapprove() {
    setReapprove(null);
  }

  return {
    busySignupId, banner, pickerSignupId, listings, listingsLoaded, listingsError,
    reapprove, onPressApprove, doApprove, doDecline, onPickListing, dismissReapprove,
    shiftId
  };
}
