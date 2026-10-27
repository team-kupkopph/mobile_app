/**
 * Run 3 observation (R9-F2 recurrence) · At Dynamic Type AX5 a one-line Field's placeholder that was wider than its
 * box drew small and low: "e.g. Dog food (adult, dry)" on Add a need. Cause, shown on the simulator with three
 * fields side by side: iOS's own text field SHRINKS a placeholder until it fits the width — a short one ("Short")
 * drew at the full AX5 size in the same screen — while React Native sizes the box from the full-size placeholder,
 * so the shrunk text sat at the bottom of a tall box. Nothing in our code asks for the shrink and RN exposes no
 * prop to turn it off.
 *
 * So a one-line Field draws its placeholder itself, as a Text cut at the edge with "…" (what R3-F1 does for a
 * long value), and keeps the native placeholder only invisibly: it still sizes the box and is still what
 * VoiceOver reads. Multi-line fields wrap their native placeholder and are left alone.
 *
 * A source scan; the device walk is the proof.
 */
import { readFileSync } from "fs";
import { join } from "path";

const field = readFileSync(join(__dirname, "..", "components", "ui", "Field.tsx"), "utf8");
const textInput = /<TextInput[\s\S]*?\/>/.exec(field)?.[0] ?? "";
// The drawn placeholder's props hold `=>` and `>`, so match up to its closing tag rather than its first `>`.
const drawn = /<Text\b(?:(?!<Text\b)[\s\S])*?\{input\.placeholder\}\s*<\/Text>/.exec(field)?.[0] ?? "";
const inputStyle = /\n  input: \{([^}]*)\}/.exec(field)?.[1] ?? "";
const placeholderStyle = /\n  placeholder: \{([^}]*)\}/.exec(field)?.[1] ?? "";

describe("Field draws a one-line placeholder itself (long placeholder at AX5)", () => {
  it("the scan found the TextInput (a guard that matches nothing proves nothing)", () => {
    expect(textInput).toMatch(/onChangeText=\{onChangeText\}/);
  });

  it("hides the native placeholder on one-line fields only", () => {
    expect(textInput).toMatch(/placeholderTextColor=\{input\.multiline \? colors\.muted : "transparent"\}/);
  });

  it("draws the placeholder as one line cut with an ellipsis, in the input's own type", () => {
    expect(drawn).toMatch(/numberOfLines=\{1\}/);
    expect(drawn).toMatch(/ellipsizeMode="tail"/);
    expect(placeholderStyle).toMatch(/\.\.\.typography\.subtitle/);
    expect(inputStyle).toMatch(/\.\.\.typography\.subtitle/);
  });

  it("sits where the typed text will, at every text size", () => {
    // iOS sets typed glyphs at the foot of the input's explicit line, half of (that line − the font's own line)
    // below a line pinned to the bottom; both scale with Dynamic Type, so the drop is measured, not a constant.
    // Checked on the simulator: the same glyph rows at the default size and at AX5.
    expect(drawn).toMatch(/onTextLayout=/);
    expect(drawn).toMatch(/\(INPUT_LINE_HEIGHT \* PixelRatio\.getFontScale\(\) - line\.height\) \/ 2/);
    expect(drawn).toMatch(/style=\{\[styles\.placeholder, \{ bottom: -placeholderDrop \}\]\}/);
    expect(field).toMatch(/const INPUT_LINE_HEIGHT = StyleSheet\.flatten\(styles\.input\)\.lineHeight/);
  });

  it("only while the field is empty and one-line", () => {
    expect(field).toMatch(/\{!value && input\.placeholder && !input\.multiline \? \(\s*<Text\b/);
  });

  it("stays out of VoiceOver's way and out of the tap's way", () => {
    // The invisible native placeholder is what VoiceOver reads; reading the drawn copy too would say it twice.
    expect(drawn).toMatch(/accessible=\{false\}/);
    expect(drawn).toMatch(/pointerEvents="none"/);
  });
});
