/**
 * Form inputs are the `Field` primitive — the canvas's filled pill with the label inside.
 *
 * ⚠️ WHAT THIS FOUND. Two screens rendered `<Field>`; twenty-two drew their own: a `label`
 * Text above a bare `TextInput` in a white pill (or, on four screens, a hand-rolled box with a
 * small caption inside — the primitive re-implemented locally). The canvas draws one field,
 * label inside, on SignIn and the Components panel, and the primitive already drew it. 31
 * inputs are converted, and Field gained `multiline` for the seven notes and descriptions.
 *
 * ⚠️ THREE KINDS OF TEXTINPUT ARE NOT FIELDS, AND ARE NAMED RATHER THAN COUNTED:
 *   · the OTP digit boxes on Otp, ResetOtp, VerifyPhone and ShelterPhoneVerify — a six-cell
 *     control with its own focus choreography, not a labelled field;
 *   · LocationPicker's search bar — a search input with an icon, not a form field;
 *   · Profile's inline name edit — a text run that becomes editable in place.
 * A new `<TextInput` anywhere else fails this list.
 */
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const SCREENS = join(__dirname, "..", "screens");
const files = readdirSync(SCREENS).filter((f) => f.endsWith(".tsx"));
const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

const rawInputs = files
  .map((f) => ({ f, n: (strip(readFileSync(join(SCREENS, f), "utf8")).match(/<TextInput\b/g) ?? []).length }))
  .filter(({ n }) => n > 0)
  .map(({ f, n }) => `${f.replace(/\.tsx$/, "")}:${n}`)
  .sort();

describe("form inputs are the Field primitive", () => {
  it("found fields at all", () => {
    const consumers = files.filter((f) => /<Field[\s/>]/.test(strip(readFileSync(join(SCREENS, f), "utf8"))));
    expect(consumers.length).toBeGreaterThan(15);
  });

  it("draws a raw TextInput only where it is not a field", () => {
    expect(rawInputs).toEqual([
      "LocationPickerScreen:1",        // the city search bar
      "OtpScreen:2",                   // six-cell code entry: the cells and a hidden input
      "ProfileScreen:1",               // inline name edit
      "ResetOtpScreen:2",
      "ShelterPhoneVerifyScreen:2",
      "VerifyPhoneScreen:2"
    ]);
  });
});
