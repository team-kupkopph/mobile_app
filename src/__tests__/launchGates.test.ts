/**
 * M4 launch gates — engineering-side check.
 *
 * Default mode: prints the state of every gate, always passes. The five gates are legitimately
 * open during development, and a suite that turns red because launch is not ready would train
 * everyone to ignore it.
 *
 * Strict mode (env `KUPKOP_LAUNCH_GATES=strict`): fails when any gate whose engineering
 * scaffolding is in place is still open. Wire this into a `launch-gates` CI job on the release
 * branch — NOT on every-branch CI.
 *
 * See library/dev/launch-gates.md for the ledger, and src/launchGates.ts for the module the
 * status is derived from.
 */
import { launchGateStatus, engineeringGatesClosed } from "../launchGates";

const strict = process.env.KUPKOP_LAUNCH_GATES === "strict";

describe("M4 launch gates", () => {
  const status = launchGateStatus();

  it("prints the state of every gate", () => {
    // eslint-disable-next-line no-console
    console.log("\n[launch-gates] M4 status:");
    for (const gate of status) {
      const badge = gate.ownerOnly ? "owner-only" : (gate.closedFromCode ? "CLOSED" : "open");
      // eslint-disable-next-line no-console
      console.log(`  ${gate.id}. ${gate.name} — ${badge}`);
      // eslint-disable-next-line no-console
      console.log(`     ${gate.note}`);
    }
    // eslint-disable-next-line no-console
    console.log(strict
      ? "[launch-gates] strict mode: engineering gates MUST be closed."
      : "[launch-gates] non-strict mode: engineering gates are advisory.");
    expect(status.length).toBe(5);
  });

  it("has five gates with stable ids 1..5", () => {
    expect(status.map((g) => g.id)).toEqual([1, 2, 3, 4, 5]);
  });

  it("marks the three owner-only gates as such", () => {
    // Gates 2 (dev accounts), 3 (partner shelter), 5 (NPC + DPO) are paperwork the owner owns
    // and have no code representation. If someone adds engineering scaffolding to one of these
    // later, this expectation is what forces them to reconsider WHICH pile it belongs in.
    const ownerOnly = status.filter((g) => g.ownerOnly).map((g) => g.id);
    expect(ownerOnly).toEqual([2, 3, 5]);
  });

  (strict ? it : it.skip)("(strict) every engineering-representable gate is closed", () => {
    const open = status.filter((g) => !g.ownerOnly && !g.closedFromCode);
    if (open.length > 0) {
      // eslint-disable-next-line no-console
      console.error("[launch-gates] strict mode failed — open engineering gates:");
      for (const gate of open) {
        // eslint-disable-next-line no-console
        console.error(`  ${gate.id}. ${gate.name}: ${gate.note}`);
      }
    }
    expect(engineeringGatesClosed()).toBe(true);
  });
});

describe("privacyPolicyUrl()", () => {
  const original = process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL;
  afterEach(() => {
    if (original === undefined) delete process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL;
    else process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL = original;
    jest.resetModules();
  });

  it("returns null when unset", () => {
    delete process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL;
    jest.resetModules();
    const { privacyPolicyUrl } = require("../launchGates");
    expect(privacyPolicyUrl()).toBeNull();
  });

  it("returns the URL when set to an https address", () => {
    process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL = "https://kupkop.ph/privacy";
    jest.resetModules();
    const { privacyPolicyUrl } = require("../launchGates");
    expect(privacyPolicyUrl()).toBe("https://kupkop.ph/privacy");
  });

  it("refuses a non-http scheme so a rogue env var cannot inject javascript:", () => {
    process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL = "javascript:alert(1)";
    jest.resetModules();
    const { privacyPolicyUrl } = require("../launchGates");
    expect(privacyPolicyUrl()).toBeNull();
  });
});
