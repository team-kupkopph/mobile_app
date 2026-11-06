/**
 * Review step 7 · what a report and a block say to the server, and what the app tells the person before it sends.
 * The two things worth pinning are that a person can be named WITHOUT an account id (the app often has none), and that
 * the reason categories cannot drift from the backend's.
 */
import { existsSync, readFileSync } from "fs";
import { join } from "path";

import {
  REPORT_REASONS, blockBody, blockConfirmCopy, blockExitDepth, blockPerson, reportBody, reportSubject, stillWrong, validateReport,
  type PersonRef, type ReportParams,
} from "../moderation";

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

if (!BACKEND) {
  // eslint-disable-next-line no-console
  console.warn("[moderation] backend/ not found: reason-code parity NOT checked. Set BACKEND_PATH to enforce it.");
}
