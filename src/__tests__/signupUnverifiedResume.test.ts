import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(__dirname, "..", "screens", "SignupScreen.tsx"), "utf8");

describe("F4 · signup with an existing-but-unverified email resumes verification", () => {
  it("branches on the server's email_unverified code before the generic 409", () => {
    expect(src).toMatch(/error\?\.code === "email_unverified"/);
    expect(src.indexOf('"email_unverified"')).toBeLessThan(src.indexOf("That email is already registered."));
  });
  it("navigates to otp in signup mode with the tier", () => {
    expect(src).toMatch(/navigation\.navigate\("otp", \{ email: email\.trim\(\), mode: "signup", tier \}\)/);
  });
});
