// AT7 · the shelter's QR form used to print the server's own sentence ("Ensure this field has no more than 120 characters.", `"bank" is not a valid
// choice.`) under the button. This maps a failed save to plain copy: a name problem goes on the name field, anything else is "Couldn't save".
export const NAME_MAX = 120; // backend `DonationQrUploadSerializer.account_name` max_length

type Failed = { ok: boolean; status: number; data: any };

export function donationQrSaveError(res: Failed): { field: "name" | null; message: string } {
  if (res.status === 0) return { field: null, message: "You're offline — we couldn't reach the server. Try again when you're back online." };
  const err = res.data?.error;
  if (err?.field === "account_name") {
    return /blank|required/i.test(String(err.message))
      ? { field: "name", message: "Enter the name on the receiving account." }
      : { field: "name", message: `Keep the name to ${NAME_MAX} characters or fewer.` };
  }
  return { field: null, message: "Couldn't save. Try again." };
}
