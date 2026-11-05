import { shellRouteFor } from "../entryShell";

describe("shellRouteFor", () => {
  it("sends a shelter to its own shell", () => {
    expect(shellRouteFor("shelter")).toBe("shelterTabs");
  });

  it("sends a personal account, and an unknown one, to the owner shell", () => {
    expect(shellRouteFor("personal")).toBe("ownerTabs");
    expect(shellRouteFor(null)).toBe("ownerTabs");
  });
});
