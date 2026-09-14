/**
 * F10 (dev/test-plan-auth.md) — the 5th wrong OTP showed "0 tries left" with the code input
 * still enabled instead of locking the screen. `attempts_left: 0` means the *next* attempt is
 * already refused by the server, so printing "0 tries left" and leaving the input live reads
 * as a bug, not a limit — the same judgement `passwordReset.ts:38-40` already applies for the
 * reset flow. The fix: when `attemptsLeft === 0`, route straight to `otpLocked` (the shape
 * `OtpScreen.tsx:110-112` already uses for the server's own 423 lockout) instead of rendering
 * a "0 tries left" message.
 */
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(__dirname, "..", "screens", "OtpScreen.tsx"), "utf8");

test("a 400 with attemptsLeft === 0 navigates to otpLocked", () => {
  expect(src).toMatch(/attemptsLeft === 0[\s\S]*navigation\.replace\("otpLocked"/);
});

test('the "N tries left" message is only reachable once the zero-tries guard has already returned', () => {
  // The 400-status branch: it must contain the attemptsLeft === 0 guard, with an early
  // `return`, BEFORE the "${attemptsLeft} tries left" message — never an unguarded message.
  const block = src.match(/if \(res\.status === 400\) \{[\s\S]*?\n {6}\}/)?.[0] ?? "";
  expect(block).toMatch(/attemptsLeft === 0[\s\S]*?return;[\s\S]*\$\{attemptsLeft\} tries left/);
});
