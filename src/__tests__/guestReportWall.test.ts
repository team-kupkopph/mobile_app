/**
 * A guest (tokens === null) can see "Report this" on a listing and on a Kawang-Gawa shift
 * (test-plan-guest GD-1: the link is present, not hidden). Opening ReportContentScreen as a
 * guest dead-ends: POST /moderation/flags 401s and the screen only says "Couldn't send the
 * report. Try again." Same client-side gate as Inquire / Request (§0 G4, G16): the guest's
 * tap raises the SignupWall and never reaches reportContent.
 */
import fs from "fs";

test.each([
  ["src/screens/ListingDetailScreen.tsx", "listing"],
  ["src/screens/KawangGawaDetailScreen.tsx", "shift"]
])("%s gates Report this behind the signup wall for guests", (file, targetType) => {
  const src = fs.readFileSync(file, "utf8");
  const nav = src.indexOf(`navigation.navigate("reportContent",\n              { targetType: "${targetType}"`);
  expect(nav).toBeGreaterThan(-1);
  // The ternary guarding that navigate must be on the same onPress.
  const onPress = src.lastIndexOf("onPress=", nav);
  expect(src.slice(onPress, nav)).toContain('isGuest ? openWall("account") :');
});

// C6+ · the report-detail screen (a public shared link a guest can open) has four
// signed-in-only taps. Each raises the wall for a guest instead of 401ing.
test("ReportDetailScreen walls every signed-in-only action for guests (C6+)", () => {
  const src = fs.readFileSync("src/screens/ReportDetailScreen.tsx", "utf8");
  expect(src).toContain("const isGuest = tokens === null;");
  expect(src).toMatch(/isGuest \? openWall\("account"\) : navigation\.navigate\("reportContent"/);
  expect(src).toMatch(/isGuest \? openWall\("report"\) : navigation\.navigate\("reportStray"/);
  expect(src).toMatch(/isGuest \? openWall\("report"\) : confirmClaim\(\)/);
  expect(src).toMatch(/isGuest \? openWall\("report"\) : navigation\.navigate\("rescueOffer"/);
  expect(src).toContain("<SignupWall");
});
