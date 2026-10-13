/**
 * The Settings screens at AX5 (seen on `main` at `418ac48`, owner persona): a Settings row is a label | (value + chevron) row, so "Privacy controls" pushed its summary value off the right
 * edge ("Ci…"); a Privacy toggle row is a `flex: 1` label column beside a Switch, and "Push notifications" broke "notificatio / ns"; the Delete-account screen puts its "Removed" and "Kept, anonymous"
 * cards side by side in two `flex: 1` columns (about 150 pt each); the Export and Delete headlines are uncapped `hero` text. The rest of Export and Delete flowed and fit.
 *
 * The same fixes as the rest of the AX5 work, above `fontScale > 1.5` only: a Settings row and a toggle row stack, cancelling the surviving `flex: 1` with `flex: 0` (#189); Delete's columns stack; labels and headlines are capped
 * (`maxFontScale.title`). Default-size layout is unchanged.
 *
 * A source scan in the style of homeAx5.test.ts; the device walk is the proof (Delete's columns and the Settings row's after were not re-seen). Written in the same step as its fix (never seen red).
 */
import { readFileSync } from "fs";
import { join } from "path";

const read = (f: string) => readFileSync(join(__dirname, "..", "screens", f), "utf-8");
const settings = read("SettingsScreen.tsx");
const privacy = read("SettingsPrivacyScreen.tsx");
const del = read("DeleteAccountScreen.tsx");
const exp = read("ExportDataScreen.tsx");
const body = (s: string, name: string) => {
  const m = new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*\\{([^{}]*)\\}`).exec(s);
  return m ? m[1] : null;
};
const cancelFlex = (b: string | null) => {
  expect(b).not.toBeNull();
  expect(b).toMatch(/\bflex\s*:\s*0\b/);
  expect(b).toMatch(/alignSelf\s*:\s*"stretch"/);
  expect(b).toMatch(/flexGrow\s*:\s*0/);
  expect(b).toMatch(/flexBasis\s*:\s*"auto"/);
};

test("a Settings row stacks its label over its value and chevron at large text", () => {
  expect(settings).toMatch(/useLargeText\(\)/);
  expect(body(settings, "rowLarge")).toMatch(/flexDirection\s*:\s*"column"/);
  expect(body(settings, "rowLarge")).toMatch(/alignItems\s*:\s*"flex-start"/);
  expect(body(settings, "rowRightLarge")).toMatch(/alignSelf\s*:\s*"stretch"/);
  expect(body(settings, "rowValue")).toMatch(/flexShrink\s*:\s*1/);
  expect(settings).toMatch(/styles\.row, large && styles\.rowLarge/);
});

test("a Privacy toggle row stacks and the label is capped", () => {
  expect(privacy).toMatch(/useLargeText\(\)/);
  expect(body(privacy, "toggleRowLarge")).toMatch(/flexDirection\s*:\s*"column"/);
  expect(body(privacy, "toggleRowLarge")).toMatch(/alignItems\s*:\s*"flex-start"/);
  cancelFlex(body(privacy, "toggleTextLarge"));
  expect(privacy).toMatch(/styles\.toggleRow, large && styles\.toggleRowLarge/);
  expect(privacy).toMatch(/styles\.toggleLabel\}[^>]*maxFontSizeMultiplier=\{maxFontScale\.title\}/);
  expect(body(privacy, "policyLabel")).toMatch(/flexShrink\s*:\s*1/);
});

test("Delete's two columns stack at large text and the headlines are capped", () => {
  expect(del).toMatch(/useLargeText\(\)/);
  expect(body(del, "columnsLarge")).toMatch(/flexDirection\s*:\s*"column"/);
  cancelFlex(body(del, "columnLarge"));
  expect(del).toMatch(/styles\.columns, large && styles\.columnsLarge/);
  expect(del).toMatch(/large \? styles\.columnLarge : styles\.column/);
  expect(del).toMatch(/styles\.h1\}[^>]*maxFontSizeMultiplier=\{maxFontScale\.title\}/);
  expect(exp).toMatch(/styles\.h1\}[^>]*maxFontSizeMultiplier=\{maxFontScale\.title\}/);
});
