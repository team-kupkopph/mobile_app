// Canonical PH mobile-number rule (dev/onboarding-validation.md rule 5, and the verify-phone /
// shelter-setup-contact tables): 10 digits after +63, the first of them a 9; `0917 123 4567`,
// `+63 917 123 4567` and `63 917 123 4567` are the same number and normalise to E.164
// `+639171234567` BEFORE anything is checked or sent. Landlines (`02…`) never normalise — an
// SMS to one goes nowhere. The SAME string the server raises (backend common/phone.py) so the
// two never disagree. F12: the screens used to send whatever was typed, so `0281234567` got a
// code "sent" and was stored verbatim.
export const PH_MOBILE_RULE = "Enter a Philippine mobile number, e.g. 0917 123 4567";

const PH_MOBILE_REQUIRED = "Enter a mobile number.";

/** What is sent as `phone` / `official_phone`: the E.164 form, or undefined when the text is
 *  not a PH mobile in any accepted spelling (09…, 9…, +639…, 639…, with spaces/dashes/parens). */
export function normalizePhMobile(raw: string): string | undefined {
  const digits = raw.replace(/\D/g, "");
  let national: string;
  if (digits.startsWith("63") && digits.length === 12) national = digits.slice(2);
  else if (digits.startsWith("0") && digits.length === 11) national = digits.slice(1);
  else if (digits.length === 10) national = digits;
  else return undefined;
  return national.startsWith("9") ? `+63${national}` : undefined;
}

/** The field error, or undefined when the number is acceptable. Empty says what to enter;
 *  anything else that doesn't normalise names the rule and gives the example. */
export function phoneError(raw: string): string | undefined {
  if (raw.trim().length === 0) return PH_MOBILE_REQUIRED;
  return normalizePhMobile(raw) === undefined ? PH_MOBILE_RULE : undefined;
}
