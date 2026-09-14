import { emailError, nameError } from "../signupRules";
describe("signup field rules", () => {
  it.each(["ana@x.ph", "a.b+c@kupkop.invalid"])("accepts %s", (e) => expect(emailError(e)).toBeUndefined());
  it.each(["ana", "ana@", "@x.ph", "ana x@y.ph"])("refuses %s", (e) => expect(emailError(e)).toBe("Enter a valid email, e.g. ana@example.com"));
  it("wants at least two characters of name", () => {
    expect(nameError("A")).toBe("Enter your name (at least 2 characters).");
    expect(nameError("Al")).toBeUndefined();
  });
});
