import { shiftFormBody, validateShiftForm, revealLocationOnError, type ShiftFormValue } from "../components/ShiftFormFields";

const base: ShiftFormValue = {
  type: "walking", title: "Morning dog walk", description: "", meetingPoint: "Front gate",
  day: "2026-10-04", start: "09:00", durationMins: 120, capacity: "3",
  useShelterAddress: true, addressLine1: "", barangay: "", city: "", province: ""
};

test("a complete form has no errors and builds an offset-aware body", () => {
  expect(validateShiftForm(base)).toEqual({});
  const body = shiftFormBody(base)!;
  expect(body.title).toBe("Morning dog walk");
  expect(String(body.starts_at)).toMatch(/^2026-10-04T09:00:00[+-]\d{2}:\d{2}$/);
  expect(body).not.toHaveProperty("city");     // shelter address: server fills it
});

test("each problem lands on its own field", () => {
  expect(validateShiftForm({ ...base, title: " " })).toEqual({ title: "Give the activity a short name." });
  expect(validateShiftForm({ ...base, capacity: "0" })).toEqual({ capacity: "At least 1 volunteer." });
  expect(validateShiftForm({ ...base, day: "" })).toEqual({ when: "Pick a day and a start time." });
  expect(validateShiftForm({ ...base, useShelterAddress: false, city: "" }))
    .toEqual({ location: "Enter the city where this happens." });
});

test("a custom location is sent in full", () => {
  const body = shiftFormBody({ ...base, useShelterAddress: false, addressLine1: "Rizal Park", city: "Pasig" })!;
  expect(body).toMatchObject({ address_line1: "Rizal Park", city: "Pasig" });
});

// Fix round 1 · Finding 2: a `location_required` 422 says "...or enter one here" — that only
// makes sense once the address fields are visible. Both screens' submit() run the form
// through revealLocationOnError before setting the error, so the toggle flips off and the
// fields reappear under the message instead of the copy pointing at hidden controls.
test("a location_required error reveals the address fields", () => {
  const withToggleOn: ShiftFormValue = { ...base, useShelterAddress: true };
  const revealed = revealLocationOnError(withToggleOn);
  expect(revealed.useShelterAddress).toBe(false);
  // the rest of the form is untouched
  expect(revealed).toMatchObject({ title: base.title, capacity: base.capacity });
});
