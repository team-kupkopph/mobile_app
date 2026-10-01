import fs from "fs";

// C16 · D14 — Log out with unsent reports asks "Keep for next time / Discard" first.
test.each(["src/screens/SettingsScreen.tsx", "src/screens/ProfileScreen.tsx"])(
  "%s asks about unsent reports before logging out", (file) => {
    expect(fs.readFileSync(file, "utf8")).toContain("confirmSignOutWithQueue(");
  });
