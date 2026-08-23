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

// A tracker row: one card in "Needs your attention". Same-type IN-REVIEW files collapse into a
// single row with a count (3 rescue_photos → one "Photos of rescue space · 3 photos" card, matching
// the reviewer's grouped view). REJECTED files stay separate — each carries its own reason and is
// replaced on its own (a rejected photo is fixed while the rest stay approved), so it can't be
// folded into a count.
export type DocGroup = {
  key: string;
  docType: string;
  status: DocStatus;
  count: number;
  doc: MeVerificationDoc; // representative (the rejected file itself, or the first in-review one)
};

export function groupAttention(attention: MeVerificationDoc[]): DocGroup[] {
  const groups: DocGroup[] = [];
  const inReviewByType = new Map<string, DocGroup>();
  for (const d of attention) {
    if (d.status === "rejected") {
      groups.push({ key: d.document_id, docType: d.doc_type, status: d.status, count: 1, doc: d });
      continue;
    }
    const existing = inReviewByType.get(d.doc_type);
    if (existing) {
      existing.count += 1;
    } else {
      const group: DocGroup = {
        key: `${d.doc_type}:in-review`, docType: d.doc_type, status: d.status, count: 1, doc: d
      };
      inReviewByType.set(d.doc_type, group);
      groups.push(group);
    }
  }
  return groups;
}
