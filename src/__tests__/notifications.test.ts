import { notificationTarget } from "../notifications";

describe("notificationTarget", () => {
  it("routes every verification decision type to the document tracker", () => {
    for (const type of ["verification_approved", "verification_rejected", "verification_needs_info"]) {
      expect(notificationTarget({ type, data: { verification_id: "v1", type: "shelter_org" } }))
        .toEqual({ screen: "verifyDocuments" });
    }
  });

  it("routes every report-linked type to that report's detail screen", () => {
    for (const type of ["offer_matched", "report_claimed", "offer_received", "report_escalated", "case_reopened"]) {
      expect(notificationTarget({ type, data: { report_id: "r1" } }))
        .toEqual({ screen: "reportDetail", reportId: "r1" });
    }
  });

  it("is a no-op for a report-linked type with no report_id in its payload", () => {
    expect(notificationTarget({ type: "report_claimed", data: {} })).toBeNull();
    expect(notificationTarget({ type: "report_claimed", data: null })).toBeNull();
  });

  it("is a no-op for an unrecognized type", () => {
    expect(notificationTarget({ type: "something_new", data: { report_id: "r1" } })).toBeNull();
  });

  it("routes stage_advanced (the adopter's own inquiry moved forward) to their inquiries list", () => {
    expect(notificationTarget({ type: "stage_advanced", data: { inquiry_id: "i1", stage_key: "vet_check" } }))
      .toEqual({ screen: "myInquiries" });
  });

  it("is a no-op for inquiry_received — no poster-side inquiry screen exists yet", () => {
    expect(notificationTarget({ type: "inquiry_received", data: { listing_id: "l1", inquiry_id: "i1" } }))
      .toBeNull();
  });
});
