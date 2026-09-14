// src/__tests__/otpResend.test.ts
import { resendOutcome } from "../otpResend";

describe("resendOutcome", () => {
  it("reports success only on 2xx", () => {
    expect(resendOutcome({ status: 202, data: {} })).toEqual({ ok: true, notice: "We sent a new code.", cooldown: 60 });
  });
  it("turns a 429 into a wait, using retry_after when present", () => {
    expect(resendOutcome({ status: 429, data: { error: { details: { retry_after: 45 } } } }))
      .toEqual({ ok: false, notice: "Too many codes requested. Try again in about 1 minute.", cooldown: 45 });
  });
  it("names an unreachable server", () => {
    expect(resendOutcome({ status: 0, data: {} }).notice).toBe("Couldn't reach the server. Check your connection and try again.");
  });
});
