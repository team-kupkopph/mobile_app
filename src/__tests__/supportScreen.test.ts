/**
 * Review step 7b · Apple 1.2 wants published contact information a person can easily use, and 1.5 an easy in-app way to
 * reach the developer. The support screen used to say "coming soon" as plain text. It must now do something.
 *
 * ⚠️ The project's rule for a source scan: assert it READ something before it asserts anything was or was not there.
 */
import { readFileSync } from "fs";
import { join } from "path";

import { SUPPORT_EMAIL, supportMailto } from "../support";

const SRC = join(__dirname, "..");
const read = (rel: string) => {
  const text = readFileSync(join(SRC, rel), "utf8");
  expect(text.length).toBeGreaterThan(200);
  return text;
};

describe("the support address", () => {
  it("is a real address on the product's domain", () => {
    expect(SUPPORT_EMAIL).toMatch(/^[a-z]+@kupkop\.ph$/);
  });
  it("opens a mail with a subject already written", () => {
    expect(supportMailto()).toBe("mailto:hello@kupkop.ph?subject=Kupkop%20help");
    expect(supportMailto("Account & login")).toBe("mailto:hello@kupkop.ph?subject=Account%20%26%20login");
  });
});

describe("the support screen", () => {
  const screen = read("screens/SupportScreen.tsx");
  it("opens the mail app instead of describing one", () => {
    expect(screen).toContain("Linking.openURL(supportMailto())");
    expect(screen).toContain('testID="btn.support.email"');
  });
  it("still says the address when there is no mail app", () => {
    expect(screen).toContain("No mail app found");
    expect(screen).toContain("{SUPPORT_EMAIL}");
  });
  it("no longer promises support \"coming soon\" anywhere in the app", () => {
    expect(screen.toLowerCase()).not.toContain("coming soon");
    expect(read("navigation/RootNavigator.tsx").toLowerCase()).not.toContain("support is coming soon");
  });
  it("is the screen the navigator shows", () => {
    const nav = read("navigation/RootNavigator.tsx");
    expect(nav).toContain('name="support" component={SupportScreen}');
    expect(nav).not.toContain("PlaceholderSupport");
  });
  it("keeps the address in one place", () => {
    expect(screen).not.toContain("hello@kupkop.ph");
  });
});
