// DW2 (backend#93) · the shelter's OWN donation QRs, from `GET /shelter/donation-qr`: per provider the live row, a pending replacement, and the latest
// refusal. Pure helpers so the Donate tab, the You row and the form read one rule (AT3: pending vs never uploaded; AT5: "On" only when a QR is live).
export type OwnQrStatus = "pending" | "live" | "refused" | "withdrawn";

export type OwnQr = {
  donation_qr_id: string;
  provider: string;
  account_name: string;
  qr_image_url: string;
  status: OwnQrStatus;
  verified: boolean;
  replaces: string | null;
  decision_note: string;
  created_at: string;
  decided_at: string | null;
  overdue: boolean;
};

export type OwnQrState = "none" | "pending" | "live";

export function ownQrState(rows: OwnQr[] | null): OwnQrState {
  const list = rows ?? [];
  if (list.some((r) => r.status === "live")) return "live";
  if (list.some((r) => r.status === "pending")) return "pending";
  return "none";
}

/** The You → Donation QR row's value. Undefined while loading or gated (the lock glyph stands in): never a false "On" (AT5). */
export function youRowValue(rows: OwnQr[] | null, gated: boolean): string | undefined {
  if (gated || rows === null) return undefined;
  const s = ownQrState(rows);
  return s === "live" ? "On" : s === "pending" ? "Pending" : "Add";
}

/** The Donate tab's QR-card chip. "On" needs the dashboard gate (org approved AND a live QR), not just a live row. */
export function donateChip(rows: OwnQr[] | null, donationsEnabled: boolean):
  { label: string; tone: "success" | "warning" | "neutral"; sub: string } {
  if (donationsEnabled) return { label: "On", tone: "success", sub: "Donations are on" };
  if (ownQrState(rows) === "pending") return { label: "Pending verification", tone: "warning", sub: "Waiting for review" };
  return { label: "Off", tone: "neutral", sub: "Donations are paused" };
}

export function rowsFor(rows: OwnQr[] | null, provider: string): { live?: OwnQr; pending?: OwnQr; refused?: OwnQr } {
  const mine = (rows ?? []).filter((r) => r.provider === provider);
  return {
    live: mine.find((r) => r.status === "live"),
    pending: mine.find((r) => r.status === "pending"),
    refused: mine.find((r) => r.status === "refused"),
  };
}
