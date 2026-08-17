import { MeVerificationDoc } from "../api/types";
import { docChip, docLabel, splitDocs } from "../verifications";

function doc(p: Partial<MeVerificationDoc>): MeVerificationDoc {
  return {
    document_id: "d", doc_type: "gov_id", status: "pending",
    review_note: null, superseded_by: null, ...p
  };
}

describe("docLabel", () => {
  it("maps known doc types to friendly names", () => {
    expect(docLabel("proof_billing")).toBe("Proof of billing");
    expect(docLabel("rescue_photos")).toBe("Photos of rescue space");
  });
  it("prettifies an unknown type rather than showing a raw slug", () => {
    expect(docLabel("some_new_doc")).toBe("Some new doc");
  });
});

describe("docChip (per-file status → labelled tone)", () => {
  it("maps each status", () => {
    expect(docChip("approved")).toEqual({ label: "Approved", tone: "ok" });
    expect(docChip("rejected")).toEqual({ label: "Needs a new copy", tone: "danger" });
    expect(docChip("pending")).toEqual({ label: "In review", tone: "review" });
  });
});

describe("splitDocs (US-V2 — outstanding first, approved collapses)", () => {
  it("puts rejected before pending, keeps approved separate", () => {
    const { attention, approved } = splitDocs([
      doc({ document_id: "a", status: "approved" }),
      doc({ document_id: "p", status: "pending" }),
      doc({ document_id: "r", status: "rejected" })
    ]);
    expect(attention.map((d) => d.document_id)).toEqual(["r", "p"]);
    expect(approved.map((d) => d.document_id)).toEqual(["a"]);
  });

  it("hides superseded (already-replaced) documents", () => {
    const { attention } = splitDocs([
      doc({ document_id: "old", status: "rejected", superseded_by: "new" }),
      doc({ document_id: "new", status: "pending" })
    ]);
    expect(attention.map((d) => d.document_id)).toEqual(["new"]);
  });
});
