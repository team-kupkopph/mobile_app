// C14/C15/C25 · the mobile side of backend#66. Source guards, like the other screen guards:
// these screens are thin, and what matters is which endpoint they hit and where they go next.
import fs from "fs";
import path from "path";

const ROOT = path.join(__dirname, "..", "..");
const file = (p: string) => path.join(ROOT, p);
const read = (p: string) => fs.readFileSync(file(p), "utf8");

test("List for adoption continues into the listing form with the new draft", () => {
  const src = read("src/screens/RescueListScreen.tsx");
  expect(src).toContain('navigation.replace("listingForm", { listingId: res.data.listing_id })');
});

test("List and Place reopen an unfinished draft on already_handed_off, via the pure helper", () => {
  for (const f of ["RescueListScreen", "RescuePlaceConfirmScreen"]) {
    const src = read(`src/screens/${f}.tsx`);
    expect(src).toContain("handoffConflictAction(");
    expect(src).toContain('navigation.replace("listingForm", { listingId: action.listingId })');
  }
});

test("The false 'Listed for adoption' confirmation is gone", () => {
  expect(fs.existsSync(file("src/screens/RescueListedScreen.tsx"))).toBe(false);
  expect(read("src/navigation/types.ts")).not.toContain("rescueListed");
  expect(read("src/navigation/RootNavigator.tsx")).not.toContain("rescueListed");
});

test("The case screen can take a handoff back", () => {
  const src = read("src/screens/RescueUpdateScreen.tsx");
  expect(src).toContain("/handoff/cancel");
  expect(src).toContain('testID="btn.rescueUpdate.cancelHandoff"');
  expect(src).toContain("handoffCancelMessage(");
});

test("Place request loads the one inquiry by id, not page 1 of the list", () => {
  const src = read("src/screens/PlaceRequestScreen.tsx");
  expect(src).toContain("api.get(`/inquiries/${inquiryId}`)");
  expect(src).not.toContain('api.get("/me/inquiries")');
});

test("A withdrawn or expired offer has no Accept/Decline", () => {
  const src = read("src/screens/PlaceRequestScreen.tsx");
  expect(src).toContain("This offer is no longer open.");
  expect(src).not.toContain("withdrawn by the rescuer");
});

test("A 409 already_decided refetches, so a mid-view withdrawal shows as closed", () => {
  const src = read("src/screens/PlaceRequestScreen.tsx");
  expect(src).toMatch(/already_decided[\s\S]*?load\(\)/);
});

test("A refused Take back is an Alert, not a line far down the form; the link shows it is busy", () => {
  const src = read("src/screens/RescueUpdateScreen.tsx");
  expect(src).toContain('Alert.alert("Couldn\'t take that back", handoffCancelMessage(');
  expect(src).not.toContain("setError(handoffCancelMessage(");
  expect(src).toContain("accessibilityState={{ disabled: cancelBusy, busy: cancelBusy }}");
});

test("Take back on a listing people asked about confirms, then resends close_inquiries (D15)", () => {
  const src = read("src/screens/RescueUpdateScreen.tsx");
  expect(src).toContain("has_active_inquiries");
  expect(src).toContain("active_inquiries");
  expect(src).toContain("closeInquiriesPrompt(");
  expect(src).toContain("closedInquiriesDone(");
  expect(src).toContain("close_inquiries: true");
});

test("The inquire POST shows the unavailable message and refetches the listing (D15)", () => {
  const src = read("src/screens/ListingDetailScreen.tsx");
  expect(src).toContain("inquireRefusalMessage(");
  expect(src).toMatch(/inquireRefusalMessage\([\s\S]*?load\(\)/);
});

test("A withdrawn inquiry chip comes from inquiryStatusLabel, not a 'Withdrawn' literal (D15)", () => {
  const src = read("src/components/InquiryList.tsx");
  expect(src).toContain("inquiryStatusLabel(");
  expect(src).not.toContain('"Withdrawn"');
});

test("The ladder says a closed inquiry is closed and drops the progress chrome (D15)", () => {
  const src = read("src/screens/InquiryScreen.tsx");
  expect(src).toContain("inquiryClosedNote(");
  expect(src).toContain("inquiryStatusLabel(");
  expect(src).toContain("inquiryIsClosed(");
  expect(src).toMatch(/closed \? \([\s\S]*?\) : \([\s\S]*?header\.label/);
  expect(src).toMatch(/!closed[\s\S]*?Tap any step to see what it involves\./);
});

test("A closed inquiry's ladder neither auto-opens nor marks a stage current; the pet card names the status (D15)", () => {
  const src = read("src/screens/InquiryScreen.tsx");
  expect(src).toContain("ladderStageTone(");
  expect(src).toMatch(/!inquiryIsClosed\(found\.status\)[\s\S]*?setOpen\(/);
  expect(src).toMatch(/current = tone === "active"/);
  expect(src).toContain("View ${pet}'s listing, ${inquiryStatusLabel(inquiry.status)}");
});

test("A closed inquiry card shows no stage progress, and chip labels are derived (D15)", () => {
  const src = read("src/components/InquiryList.tsx");
  expect(src).toContain("inquiryIsClosed(iq.status)");
  expect(src).not.toMatch(/label: "(Active|Adopted|Declined|Withdrawn)"/);
});

test("Inquire shows only on an available listing; otherwise 'No longer available for adoption.' (D15)", () => {
  const src = read("src/screens/ListingDetailScreen.tsx");
  expect(src).toContain('listing.status !== "available"');
  expect(src).toContain("No longer available for adoption.");
  expect(src).toContain("Reserved for an applicant.");
  // Spec §3 · the draft's Publish moved to PosterListingScreen; listingDetail hands the poster over.
  expect(read("src/screens/PosterListingScreen.tsx")).toContain('testID="btn.posterListing.publish"');
});

test("Place confirm tells the person about the draft before opening it", () => {
  const src = read("src/screens/RescuePlaceConfirmScreen.tsx");
  expect(src).toContain('Alert.alert("You already started a listing"');
  expect(src).toContain("Finish it or take it back before placing them with someone.");
  expect(src).toContain('{ text: "Open the listing", onPress: () => navigation.replace("listingForm", { listingId: action.listingId }) }');
});

test("A draft listing's note says it is a draft", () => {
  const src = read("src/screens/ListingFormScreen.tsx");
  expect(src).toContain("This is a draft — only you can see it until you publish it.");
});
