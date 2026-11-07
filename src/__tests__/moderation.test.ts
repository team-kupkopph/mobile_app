/**
 * Review step 7 · what a report and a block say to the server, and what the app tells the person before it sends.
 * The two things worth pinning are that a person can be named WITHOUT an account id (the app often has none), and that
 * the reason categories cannot drift from the backend's.
 */
import { existsSync, readFileSync } from "fs";
import { join } from "path";

import {
  REPORT_REASONS, REPORT_TARGET_TYPES, blockBody, blockConfirmCopy, blockExitDepth, blockPerson, reportBody, reportFailure, reportSubject, stillWrong,
  validateReport, waitText,
  type PersonRef, type ReportParams,
} from "../moderation";
import { MESSAGE_MAX } from "../inquireApplication";

describe("what is wrong with a report", () => {
  it("needs a category, and a note only for 'something else'", () => {
    expect(validateReport(null, "")).toEqual({ reason: "Pick what is wrong." });
    expect(validateReport("other", "   ")).toEqual({ note: "Tell us what is wrong." });
    expect(validateReport("other", "x")).toEqual({});
    for (const { code } of REPORT_REASONS.filter((r) => r.code !== "other")) {
      expect(validateReport(code, "")).toEqual({});
    }
  });

  it("lists welfare among the choices, and 'something else' last", () => {
    expect(REPORT_REASONS.map((r) => r.code)).toEqual(["spam_scam", "animal_welfare", "harassment", "misleading", "other"]);
    expect(new Set(REPORT_REASONS.map((r) => r.label)).size).toBe(REPORT_REASONS.length);
    for (const r of REPORT_REASONS) expect(r.label.trim() && r.hint.trim()).toBeTruthy();
  });
});

describe("the request a report makes", () => {
  it("names a thing by its id, with the category and a trimmed note", () => {
    const p: ReportParams = { targetType: "listing", targetId: "L1" };
    expect(reportBody(p, "spam_scam", "  asks for a deposit  ")).toEqual(
      { target_type: "listing", target_id: "L1", reason_code: "spam_scam", reason: "asks for a deposit" });
  });

  it("leaves the note out when there is none, rather than sending an empty one", () => {
    const body = reportBody({ targetType: "story", targetId: "S1" }, "misleading", "   ");
    expect(body).toEqual({ target_type: "story", target_id: "S1", reason_code: "misleading" });
    expect("reason" in body).toBe(false);
  });

  it("names a person by what they posted, with no account id and no target_id", () => {
    const body = reportBody({ targetType: "account", via: { type: "story", id: "S9" } }, "harassment", "");
    expect(body).toEqual({ target_type: "account", via_type: "story", via_id: "S9", reason_code: "harassment" });
    expect("target_id" in body).toBe(false);
  });
});

describe("the request a block makes", () => {
  it("is by account id when the app has one, and by what they posted when it does not", () => {
    expect(blockBody({ name: "Juan", accountId: "A1" })).toEqual({ account_id: "A1" });
    expect(blockBody({ name: "Maria", via: { type: "shift", id: "X1" } })).toEqual({ via_type: "shift", via_id: "X1" });
  });

  it("says what a block does and what it leaves alone, and that the person is not told", () => {
    const copy = blockConfirmCopy("Juan");
    expect(copy.title).toBe("Block Juan?");
    expect(copy.body).toMatch(/not see each other/);
    expect(copy.body).toMatch(/not told/);
    expect(copy.body).toMatch(/already under way/);
    expect(copy.body).toMatch(/undo this in Settings/);
  });

  it("reports a failure in the server's words, or plain ones", async () => {
    const person: PersonRef = { name: "Juan", accountId: "A1" };
    const api = (res: object) => ({ post: jest.fn().mockResolvedValue(res) }) as never;
    expect(await blockPerson(api({ ok: true }), person)).toEqual({ ok: true });
    expect(await blockPerson(api({ ok: false, data: { error: { message: "That's you." } } }), person))
      .toEqual({ ok: false, message: "That's you." });
    expect(await blockPerson(api({ ok: false, data: null }), person))
      .toEqual({ ok: false, message: "Could not block. Try again." });
  });
});

describe("an error goes away once it is fixed (found on the simulator)", () => {
  // On the device: "Tell us what is wrong." stayed red under a note field that now had text in it, until the next Send.
  it("drops the note error as soon as there is a note, and keeps it while there is none", () => {
    const shown = { note: "Tell us what is wrong." };
    expect(stillWrong(shown, "other", "   ")).toEqual({ note: "Tell us what is wrong." });
    expect(stillWrong(shown, "other", "he asked for a deposit")).toEqual({});
  });
  it("drops the category error once one is chosen", () => {
    expect(stillWrong({ reason: "Pick what is wrong." }, null, "")).toEqual({ reason: "Pick what is wrong." });
    expect(stillWrong({ reason: "Pick what is wrong." }, "spam_scam", "")).toEqual({});
  });
  it("drops a note error when the person switches to a category that needs no note", () => {
    expect(stillWrong({ note: "Tell us what is wrong." }, "harassment", "")).toEqual({});
  });
  it("clears a server error the moment they edit, so a retry starts clean", () => {
    expect(stillWrong({ form: "Too many requests" }, "spam_scam", "")).toEqual({});
  });
});

describe("where a block leaves you (found on the simulator)", () => {
  // Blocking from the confirmation screen used to drop you back on the page of the person you had just blocked, still
  // showing their content and a Block button. The page loaded before the block and was never left.
  it("leaves the content page too, unless an adoption under way keeps you on it", () => {
    expect(blockExitDepth(true)).toBe(2);          // confirmation, then the listing / story / shift
    expect(blockExitDepth(false)).toBe(1);         // the applicant screen: the inquiry stays
    expect(blockExitDepth(undefined)).toBe(1);
  });
});

describe("what the screen calls the thing being reported", () => {
  it("uses the name it was given, else a plain word for the kind", () => {
    expect(reportSubject({ targetType: "listing", subject: "Bantay" })).toBe("Bantay");
    expect(reportSubject({ targetType: "listing", subject: "  " })).toBe("this listing");
    expect(reportSubject({ targetType: "account" })).toBe("this person");
  });
});

// ---- parity with the backend ---------------------------------------------------------------
// ⚠️ The same rule as every source scan in this repo: say loudly when it did NOT run, and assert it found something
// before claiming parity, so a zero can never read as a pass.
const BACKEND = [process.env.BACKEND_PATH, join(__dirname, "../../../backend"), join(__dirname, "../../backend")]
  .filter((p): p is string => !!p).find((p) => existsSync(join(p, "moderation/models.py")));

(BACKEND ? describe : describe.skip)("the reason categories match the backend's ReasonCode", () => {
  it("lists the same codes, in the same order", () => {
    const src = readFileSync(join(BACKEND as string, "moderation/models.py"), "utf8");
    const block = /class ReasonCode\(models\.TextChoices\):([\s\S]*?)\n\n\n/.exec(src);
    expect(block).not.toBeNull();                                  // it found the class, or it says so
    const codes = [...(block as RegExpExecArray)[1].matchAll(/^\s+[A-Z_]+ = "([a-z_]+)"/gm)].map((m) => m[1]);
    expect(codes.length).toBeGreaterThan(0);                        // and it found something inside it
    expect(REPORT_REASONS.map((r) => r.code)).toEqual(codes);
  });
});

(BACKEND ? describe : describe.skip)("what can be reported matches the backend", () => {
  const backend = (rel: string) => readFileSync(join(BACKEND as string, rel), "utf8");
  it("lists the same targets as FlagTarget, in the same order", () => {
    const block = /class FlagTarget\(models\.TextChoices\):([\s\S]*?)\n\n\n/.exec(backend("moderation/models.py"));
    expect(block).not.toBeNull();
    const values = [...(block as RegExpExecArray)[1].matchAll(/^\s+[A-Z_]+ = "([a-z_]+)"/gm)].map((m) => m[1]);
    expect(values.length).toBeGreaterThan(0);
    expect([...REPORT_TARGET_TYPES]).toEqual(values);
  });
  it("can name a person by the same things the backend can resolve (VIA_TYPES)", () => {
    const m = /VIA_TYPES = \(([^)]*)\)/.exec(backend("moderation/targets.py"));
    expect(m).not.toBeNull();
    const via = [...(m as RegExpExecArray)[1].matchAll(/FlagTarget\.([A-Z]+)/g)].map((x) => x[1].toLowerCase());
    expect(via.length).toBeGreaterThan(0);
    for (const v of via) expect(REPORT_TARGET_TYPES).toContain(v);
  });
  it("limits an inquiry message to the length the server takes", () => {
    const m = /^MESSAGE_MAX = (\d+)/m.exec(backend("listings/serializers.py"));
    expect(m).not.toBeNull();
    expect(MESSAGE_MAX).toBe(Number((m as RegExpExecArray)[1]));
  });
});

if (!BACKEND) {
  // eslint-disable-next-line no-console
  console.warn("[moderation] backend/ not found: reason-code parity NOT checked. Set BACKEND_PATH to enforce it.");
}

describe("why a report could not be sent (review step 16)", () => {
  it("says when a day-long limit lifts instead of 'try again shortly'", () => {
    expect(reportFailure({ status: 429, data: { error: { details: { retry_after: 3 * 3600 } } } }))
      .toBe("You have sent a lot of reports today. You can send another in about 3 hours.");
    expect(reportFailure({ status: 429, data: { error: { details: { retry_after: 1200 } } } })).toContain("about 20 minutes");
  });
  it("still says something kind when the server gave no wait", () => {
    expect(reportFailure({ status: 429, data: {} })).toBe("You have sent a lot of reports today. Please try again later.");
    expect(reportFailure({ status: 429, data: { error: { details: { retry_after: 0 } } } })).toContain("Please try again later");
  });
  it("lets the server's own sentence stand for anything else, e.g. reporting your own thing", () => {
    expect(reportFailure({ status: 422, data: { error: { message: "That's yours, so there is nothing to report." } } }))
      .toBe("That's yours, so there is nothing to report.");
    expect(reportFailure({ status: 500 })).toBe("Couldn't send the report. Try again.");
  });
  it("words a wait in whole, plannable units", () => {
    expect(waitText(1)).toBe("a minute");
    expect(waitText(60)).toBe("a minute");
    expect(waitText(61)).toBe("about 2 minutes");
    expect(waitText(3600)).toBe("about an hour");
    expect(waitText(3601)).toBe("about 2 hours");
    expect(waitText(86400)).toBe("about 24 hours");
  });
});
