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

  it("routes inquiry_received to My inquiries — the only destination for either direction it fires in", () => {
    // Same {listing_id, inquiry_id} payload shape for both a poster told someone inquired and
    // a US-H3 placement recipient told they were offered an animal; myInquiries is a no-op
    // landing for the former and the real destination for the latter (see notifications.ts).
    expect(notificationTarget({ type: "inquiry_received", data: { listing_id: "l1", inquiry_id: "i1" } }))
      .toEqual({ screen: "myInquiries" });
  });

  test("volunteer notifications open the hub on My shifts", () => {
    for (const type of ["shift_confirmed", "shift_reminder", "signup_declined", "shift_cancelled_by_shelter"]) {
      expect(notificationTarget({ type, data: { shift_id: "sh1" } })).toEqual({ screen: "kawanggawa", tab: "mine" });
    }
  });

  test("a volunteer's cancel takes the shelter to that activity", () => {
    expect(notificationTarget({ type: "signup_cancelled_by_volunteer", data: { shift_id: "sh1", signup_id: "s1", was_late: true } }))
      .toEqual({ screen: "shelterVolunteerActivity", shiftId: "sh1" });
  });

  it("routes signup_requested (the shelter's own notification) to its requests screen for that shift", () => {
    expect(notificationTarget({ type: "signup_requested", data: { shift_id: "s", signup_id: "x" } }))
      .toEqual({ screen: "shelterVolunteerRequests", shiftId: "s" });
  });

  it("is a no-op for signup_requested with no shift_id in its payload", () => {
    expect(notificationTarget({ type: "signup_requested", data: { signup_id: "x" } })).toBeNull();
    expect(notificationTarget({ type: "signup_requested", data: null })).toBeNull();
  });

  it("routes the Sprint 6 community notifications to their own screens", () => {
    expect(notificationTarget({ type: "badge_earned", data: { badge_code: "first_shift" } }))
      .toEqual({ screen: "impact" });
    expect(notificationTarget({ type: "pledge_confirmed", data: { need_id: "n", pledge_id: "p" } }))
      .toEqual({ screen: "myDonations" });
    expect(notificationTarget({ type: "pledge_received", data: { need_id: "n", pledge_id: "p" } }))
      .toEqual({ screen: "shelterNeeds" });
    expect(notificationTarget({ type: "match_suggested", data: { report_id: "r" } }))
      .toEqual({ screen: "reportDetail", reportId: "r" });
  });
});
