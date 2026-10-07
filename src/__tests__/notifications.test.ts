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

  it("routes stage_advanced (the adopter's own inquiry moved forward) to that inquiry's ladder (spec §1)", () => {
    expect(notificationTarget({ type: "stage_advanced", data: { inquiry_id: "i1", stage_key: "vet_check" } }))
      .toEqual({ screen: "inquiry", inquiryId: "i1" });
  });

  it("routes the poster's pushes to the Applicant screen (spec §1)", () => {
    for (const type of ["inquiry_received", "inquiry_withdrawn"]) {
      expect(notificationTarget({ type, data: { listing_id: "l1", inquiry_id: "i1", poster_is_shelter: true } }))
        .toEqual({ screen: "applicant", inquiryId: "i1" });
      // without an inquiry_id, PR A's interim routing still applies
      expect(notificationTarget({ type, data: { listing_id: "l1", poster_is_shelter: true } })).toEqual({ screen: "shelterRequests" });
      expect(notificationTarget({ type, data: { listing_id: "l1" } })).toEqual({ screen: "listingDetail", listingId: "l1" });
    }
  });

  it("routes the adopter's pushes to that inquiry's ladder, and the badge push to the upgrade", () => {
    for (const type of ["inquiry_accepted", "inquiry_rejected", "adoption_reserved", "reservation_released",
                        "adoption_completed", "stage_advanced", "listing_withdrawn"]) {
      expect(notificationTarget({ type, data: { inquiry_id: "i1" } })).toEqual({ screen: "inquiry", inquiryId: "i1" });
      expect(notificationTarget({ type, data: {} })).toEqual({ screen: "myInquiries" });
    }
    expect(notificationTarget({ type: "adoption_badge_needed", data: { inquiry_id: "i1" } })).toEqual({ screen: "memberUpgrade" });
    for (const type of ["placement_offered", "placement_withdrawn"]) {
      expect(notificationTarget({ type, data: { inquiry_id: "i1" } })).toEqual({ screen: "myInquiries" });
    }
  });

  it("opens the three new destinations from the bell", () => {
    const src = require("fs").readFileSync(require("path").join(__dirname, "../screens/NotificationsScreen.tsx"), "utf8");
    expect(src).toMatch(/case "applicant":\s*navigation\.navigate\("applicant", \{ inquiryId: target\.inquiryId \}\)/);
    expect(src).toMatch(/case "inquiry":\s*navigation\.navigate\("inquiry", \{ inquiryId: target\.inquiryId \}\)/);
    expect(src).toMatch(/case "memberUpgrade":\s*navigation\.navigate\("memberUpgrade"\)/);
  });

  it("opens the two poster-push fallback destinations from the bell when a push lacks an inquiry id", () => {
    const src = require("fs").readFileSync(require("path").join(__dirname, "../screens/NotificationsScreen.tsx"), "utf8");
    expect(src).toMatch(/case "shelterRequests":\s*navigation\.navigate\("shelterRequests"\)/);
    expect(src).toMatch(/case "listingDetail":\s*navigation\.navigate\("listingDetail", \{ listingId: target\.listingId \}\)/);
  });

  test("volunteer notifications open the hub on My shifts", () => {
    for (const type of ["shift_confirmed", "shift_reminder", "signup_declined", "shift_cancelled_by_shelter"]) {
      expect(notificationTarget({ type, data: { shift_id: "sh1" } })).toEqual({ screen: "kawanggawa", tab: "mine" });
    }
  });

  test("a volunteer's cancel takes the shelter to the Confirmed section — the slot just freed up there", () => {
    expect(notificationTarget({ type: "signup_cancelled_by_volunteer", data: { shift_id: "sh1", signup_id: "s1", was_late: true } }))
      .toEqual({ screen: "shelterVolunteerActivity", shiftId: "sh1", section: "confirmed" });
  });

  it("routes signup_requested (the shelter's own notification) to the timeline's Pending section for that shift", () => {
    expect(notificationTarget({ type: "signup_requested", data: { shift_id: "s", signup_id: "x" } }))
      .toEqual({ screen: "shelterVolunteerActivity", shiftId: "s", section: "pending" });
  });

  it("is a no-op for signup_requested with no shift_id in its payload", () => {
    expect(notificationTarget({ type: "signup_requested", data: { signup_id: "x" } })).toBeNull();
    expect(notificationTarget({ type: "signup_requested", data: null })).toBeNull();
  });

  it("routes attendance_due to the timeline's Attendance section for that shift", () => {
    expect(notificationTarget({ type: "attendance_due", data: { shift_id: "sh2" } }))
      .toEqual({ screen: "shelterVolunteerActivity", shiftId: "sh2", section: "attendance" });
  });

  it("is a no-op for attendance_due with no shift_id in its payload", () => {
    expect(notificationTarget({ type: "attendance_due", data: {} })).toBeNull();
    expect(notificationTarget({ type: "attendance_due", data: null })).toBeNull();
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

// Sagip loop closure (backend: sagip/notices.py). Each routes to the screen that answers the
// question the notification raised.
describe("Sagip loop-closure notifications", () => {
  it("routes case_progress, claim_lapsed and report_nearby (D2) to the report", () => {
    for (const type of ["case_progress", "claim_lapsed", "report_nearby"]) {
      expect(notificationTarget({ type, data: { report_id: "r1", case_id: "c1" } }))
        .toEqual({ screen: "reportDetail", reportId: "r1" });
    }
  });

  it("routes claim_due straight to the claimer's case, where the update is posted", () => {
    expect(notificationTarget({ type: "claim_due", data: { report_id: "r1", case_id: "c1" } }))
      .toEqual({ screen: "rescueUpdate", caseId: "c1", reportId: "r1" });
  });

  it("is a no-op for claim_due missing either id", () => {
    expect(notificationTarget({ type: "claim_due", data: { case_id: "c1" } })).toBeNull();
    expect(notificationTarget({ type: "claim_due", data: { report_id: "r1" } })).toBeNull();
  });

  it("routes placement_decided to the rescuer's cases", () => {
    expect(notificationTarget({ type: "placement_decided", data: { decision: "declined" } }))
      .toEqual({ screen: "myRescues" });
  });

  it("report_removed opens My rescues", () => {
    expect(notificationTarget({ type: "report_removed", data: { report_id: "r" } }))
      .toEqual({ screen: "myRescues" });
  });

  it("routes placement_withdrawn to My inquiries (C14; placements stay there, spec §1)", () => {
    const withdrawn = notificationTarget({ type: "placement_withdrawn", data: { listing_id: "l1", inquiry_id: "i1" } });
    expect(withdrawn).toEqual({ screen: "myInquiries" });
  });

  it("routes listing_withdrawn exactly like stage_advanced (D15)", () => {
    const withdrawn = notificationTarget({ type: "listing_withdrawn", data: { listing_id: "l1", inquiry_id: "i1" } });
    expect(withdrawn).toEqual({ screen: "inquiry", inquiryId: "i1" });
    expect(withdrawn).toEqual(notificationTarget({ type: "stage_advanced", data: { inquiry_id: "i1", stage_key: "vet_check" } }));
  });

  it("an expired placement_decided still opens My rescues", () => {
    expect(notificationTarget({ type: "placement_decided", data: { decision: "expired" } }))
      .toEqual({ screen: "myRescues" });
  });
});
