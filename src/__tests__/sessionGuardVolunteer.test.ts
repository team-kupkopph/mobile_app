/**
 * G13 — guests may browse the Kawang-Gawa hub, a shift's detail and the waiver, read-only.
 * Same source-read pattern as the other AUTH_SCREENS entries (see the G15 comment in
 * SessionGuard.tsx): a signed-in user whose session expires while on one of these should
 * stay put rather than bounce to Welcome, because the screen is legitimately viewable signed
 * out and its GETs keep succeeding.
 */
import fs from "fs";

import { sessionEndAction } from "../auth/SessionGuard";

test("guests may open the volunteer hub, a shift and the waiver", () => {
  const src = fs.readFileSync("src/auth/SessionGuard.tsx", "utf8");
  for (const r of ["kawanggawa", "kawanggawaDetail", "waiver"]) expect(src).toContain(`"${r}"`);
});

// SQ5 follow-up · the hub is a TAB of both shells, and `getCurrentRoute()` returns only the leaf, so a member's `kawanggawa`
// and a guest's look the same. The decision reads the focused ROOT route too (spec 2026-11-04-owner-guest-tab-navigator-design §4.4, P0 §7a item 3).
describe("sessionEndAction", () => {
  it("a visitor in the guest shell stays, on any of its tabs", () => {
    expect(sessionEndAction("guestTabs", "homeGuest")).toBe("stay");
    expect(sessionEndAction("guestTabs", "kawanggawa")).toBe("stay");
  });
  it("a member on the Volunteer hub moves to the guest shell on the hub, never stays in the member shell", () => {
    expect(sessionEndAction("ownerTabs", "kawanggawa")).toBe("guestVolunteer");
  });
  it("a member's other tabs go to Welcome", () => {
    for (const leaf of ["home", "adopt", "profile"]) expect(sessionEndAction("ownerTabs", leaf)).toBe("welcome");
  });
  it("a guest-viewable stack screen stays, a member-only one goes to Welcome (as before)", () => {
    expect(sessionEndAction("kawanggawaDetail", "kawanggawaDetail")).toBe("stay");
    expect(sessionEndAction("waiver", "waiver")).toBe("stay");
    expect(sessionEndAction("signin", "signin")).toBe("stay");
    expect(sessionEndAction("settings", "settings")).toBe("welcome");
  });
  it("no focused route yet: nothing to do (as before)", () => {
    expect(sessionEndAction(undefined, undefined)).toBe("stay");
  });
});
