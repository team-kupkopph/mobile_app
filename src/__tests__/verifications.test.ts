import { MeVerificationDoc } from "../api/types";
import { docChip, docLabel, groupAttention, splitDocs } from "../verifications";

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

describe("groupAttention (collapse in-review files of a type into one card)", () => {
  it("folds multiple in-review rescue_photos into a single row with a count", () => {
    const groups = groupAttention([
      doc({ document_id: "p1", doc_type: "rescue_photos", status: "pending" }),
      doc({ document_id: "p2", doc_type: "rescue_photos", status: "pending" }),
      doc({ document_id: "p3", doc_type: "rescue_photos", status: "pending" })
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].docType).toBe("rescue_photos");
    expect(groups[0].count).toBe(3);
  });

  it("keeps rejected files separate so each can be replaced on its own", () => {
    const groups = groupAttention([
      doc({ document_id: "r1", doc_type: "rescue_photos", status: "rejected" }),
      doc({ document_id: "r2", doc_type: "rescue_photos", status: "rejected" })
    ]);
    expect(groups.map((g) => g.count)).toEqual([1, 1]);
    expect(groups.map((g) => g.doc.document_id)).toEqual(["r1", "r2"]);
  });

  it("groups by type — a distinct type is its own row", () => {
    const groups = groupAttention([
      doc({ document_id: "g", doc_type: "gov_id", status: "pending" }),
      doc({ document_id: "p1", doc_type: "rescue_photos", status: "pending" }),
      doc({ document_id: "p2", doc_type: "rescue_photos", status: "pending" })
    ]);
    expect(groups.map((g) => [g.docType, g.count])).toEqual([
      ["gov_id", 1], ["rescue_photos", 2]
    ]);
  });
});
