// C14/C15/C25 · the mobile side of backend#66. Source guards, like the other screen guards:
// these screens are thin, and what matters is which endpoint they hit and where they go next.
import fs from "fs";

const read = (p: string) => fs.readFileSync(p, "utf8");

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
  expect(fs.existsSync("src/screens/RescueListedScreen.tsx")).toBe(false);
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
