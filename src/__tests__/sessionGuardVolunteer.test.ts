/**
 * G13 — guests may browse the Kawang-Gawa hub, a shift's detail and the waiver, read-only.
 * Same source-read pattern as the other AUTH_SCREENS entries (see the G15 comment in
 * SessionGuard.tsx): a signed-in user whose session expires while on one of these should
 * stay put rather than bounce to Welcome, because the screen is legitimately viewable signed
 * out and its GETs keep succeeding.
 */
import fs from "fs";

test("guests may open the volunteer hub, a shift and the waiver", () => {
  const src = fs.readFileSync("src/auth/SessionGuard.tsx", "utf8");
  for (const r of ["kawanggawa", "kawanggawaDetail", "waiver"]) expect(src).toContain(`"${r}"`);
});
