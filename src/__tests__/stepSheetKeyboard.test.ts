/**
 * R6-F2 · AP-S7 — With the keyboard up, the step sheet was hidden. Observed on the simulator on
 * 2026-10-11, Run 6: after tapping the Interview sheet's note field, nothing of the sheet (title,
 * note field, Start / Mark done / Skip) was visible above the keyboard, and one tap on the
 * backdrop closed the keyboard and the sheet together, losing the note. Root cause:
 * `StepSheet` is a bottom `Modal` around a `TextInput`, and no `KeyboardAvoidingView` existed
 * anywhere in `src/`, so the keyboard simply covered the sheet.
 *
 * A source scan, as dynamicType.test.ts and buttonDynamicType.test.ts are: it pins the invariant
 * so the fix can be confirmed without a device walk. The device walk is still the proof.
 */
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(__dirname, "..", "components", "applicant", "StepSheet.tsx"), "utf-8");
const at = (needle: string) => src.indexOf(needle);

describe("the step sheet rides above the keyboard (R6-F2)", () => {
  it("the scan found what it is scanning (a guard that matches nothing proves nothing)", () => {
    expect(at("<Modal")).toBeGreaterThan(-1);
    expect(at('testID="sheet.applicant.step"')).toBeGreaterThan(-1);
    expect(at('testID="input.step.note"')).toBeGreaterThan(-1);
    expect(at('accessibilityLabel="Close"')).toBeGreaterThan(-1);
  });

  it("imports KeyboardAvoidingView from react-native", () => {
    expect(src).toMatch(/import\s*\{[^}]*\bKeyboardAvoidingView\b[^}]*\}\s*from\s*"react-native"/);
  });

  it("wraps the backdrop and the sheet, inside the Modal", () => {
    const modal = at("<Modal");
    const open = at("<KeyboardAvoidingView");
    const backdrop = at('accessibilityLabel="Close"');
    const sheet = at('testID="sheet.applicant.step"');
    const input = at('testID="input.step.note"');
    const close = at("</KeyboardAvoidingView>");
    expect(open).toBeGreaterThan(modal);
    expect(backdrop).toBeGreaterThan(open);
    expect(sheet).toBeGreaterThan(backdrop);
    expect(input).toBeGreaterThan(sheet);
    expect(close).toBeGreaterThan(input);
    expect(close).toBeLessThan(at("</Modal>"));
  });

  it("gives the avoiding view a behavior and the full screen to work in", () => {
    const tag = /<KeyboardAvoidingView[^>]*>/.exec(src);
    expect(tag).not.toBeNull();
    expect((tag as RegExpExecArray)[0]).toMatch(/\bbehavior=/);
    expect((tag as RegExpExecArray)[0]).toMatch(/\bstyle=/);
    expect(src).toMatch(/\bflex\s*:\s*1\b/);
  });

  it("the backdrop still closes the sheet (the fix must not make it undismissable)", () => {
    expect(src).toMatch(/<Pressable[^>]*onPress=\{onClose\}[^>]*accessibilityLabel="Close"/);
  });
});
