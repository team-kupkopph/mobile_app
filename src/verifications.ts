import { DocStatus, MeVerificationDoc } from "./api/types";

// US-V2 — the document tracker's pure logic, kept out of the screen so it's unit-tested
// (matching shelterDashboard.ts). Labels, the per-file status chip, and the ordering that
// makes the screen a to-do list rather than an archive.

const DOC_LABELS: Record<string, string> = {
  gov_id: "Government-issued ID",
  proof_billing: "Proof of billing",
  rescue_photos: "Photos of rescue space",
  sec_dti: "SEC / DTI registration",
  bai_cert: "BAI certificate"
};

export function docLabel(docType: string): string {
  if (DOC_LABELS[docType]) return DOC_LABELS[docType];
  // Unknown type: turn "some_new_doc" into "Some new doc" rather than showing a raw slug.
  const words = docType.replace(/_/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

// Tones map to the design-system status palette in the screen: ok=green, danger=red,
// review=amber ("In review" = a pending file waiting on a reviewer).
export type DocChip = { label: string; tone: "ok" | "danger" | "review" };

export function docChip(status: DocStatus): DocChip {
  switch (status) {
    case "approved":
      return { label: "Approved", tone: "ok" };
    case "rejected":
      return { label: "Needs a new copy", tone: "danger" };
    default:
      return { label: "In review", tone: "review" };
  }
}

const ATTENTION_RANK: Record<DocStatus, number> = { rejected: 0, pending: 1, approved: 2 };

export function splitDocs(docs: MeVerificationDoc[]): {
  attention: MeVerificationDoc[];
  approved: MeVerificationDoc[];
} {
  // A superseded file is an old version already replaced on resubmit — the tracker shows
  // the current set only.
  const current = docs.filter((d) => !d.superseded_by);
  const attention = current
    .filter((d) => d.status !== "approved")
    .sort((a, b) => ATTENTION_RANK[a.status] - ATTENTION_RANK[b.status]); // rejected before pending
  const approved = current.filter((d) => d.status === "approved");
  return { attention, approved };
}
