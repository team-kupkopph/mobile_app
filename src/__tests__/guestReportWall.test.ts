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
