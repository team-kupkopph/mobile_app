/**
 * The verification document screens at AX5 (seen on `main`, "Quick verification" with an unverified persona; the other two by reading, they need an under-review / rejected verification): "Quick verification"
 * has an uncapped `hero` title ("verificati / on") and its ID card is an icon | `flex: 1` copy | "Upload" row that broke "Valid govern / men / t ID"; the consent row is a 26 pt box | `flex: 1` text.
 * "Document status" has icon | copy rows with fixed `height: 28` status chips, a fixed `height: 46` "Replace this file" button and banner rows of an icon beside a `flex: 1` text; "Resubmit documents" puts the
 * file name beside a fixed `height: 44` "Replace" button. All three use an uncapped `display` / `hero` title.
 *
 * The same fixes as the rest of the AX5 work, above `fontScale > 1.5` only: the icon | copy | action rows stack, cancelling the surviving `flex: 1` with `flex: 0` (#189); chips and buttons take `minHeight` + padding;
 * titles are capped (`maxFontScale.title`). Default-size layout is unchanged.
 *
 * A source scan in the style of homeAx5.test.ts; the device walk is the proof (only Quick verification was seen). Written in the same step as its fix (never seen red).
 */
import { readFileSync } from "fs";
import { join } from "path";

const read = (f: string) => readFileSync(join(__dirname, "..", "screens", f), "utf-8");
const verify = read("MemberVerifyScreen.tsx");
const docs = read("VerifyDocumentsScreen.tsx");
const resub = read("VerifyResubmitScreen.tsx");
const body = (s: string, name: string) => {
  const m = new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*\\{([^{}]*)\\}`).exec(s);
  return m ? m[1] : null;
};
const fixedHeight = /(^|[^a-zA-Z])height\s*:/;
const cancelFlex = (b: string | null) => {
  expect(b).not.toBeNull();
  expect(b).toMatch(/\bflex\s*:\s*0\b/);
  expect(b).toMatch(/alignSelf\s*:\s*"stretch"/);
  expect(b).toMatch(/flexGrow\s*:\s*0/);
  expect(b).toMatch(/flexBasis\s*:\s*"auto"/);
};

test("Quick verification: capped title, a stacking ID card and consent row", () => {
  expect(verify).toMatch(/useLargeText\(\)/);
  expect(verify).toMatch(/styles\.heading\}[^>]*maxFontSizeMultiplier=\{maxFontScale\.title\}/);
  expect(body(verify, "docCardLarge")).toMatch(/flexDirection\s*:\s*"column"/);
  expect(body(verify, "docCardLarge")).toMatch(/alignItems\s*:\s*"flex-start"/);
  cancelFlex(body(verify, "docCopyLarge"));
  expect(verify).toMatch(/styles\.docCard, large && styles\.docCardLarge/);
  expect(verify).toMatch(/large \? styles\.docCopyLarge : styles\.docCopy/);
  expect(body(verify, "consentRowLarge")).toMatch(/flexDirection\s*:\s*"column"/);
  cancelFlex(body(verify, "consentTextLarge"));
  expect(verify).toMatch(/styles\.consentRow, large && styles\.consentRowLarge/);
});

test("Document status: stacking doc rows and banners, growing chips and button, capped title", () => {
  expect(docs).toMatch(/useLargeText\(\)/);
  expect(docs).toMatch(/styles\.h1\}[^>]*maxFontSizeMultiplier=\{maxFontScale\.title\}/);
  for (const n of ["chip", "replaceBtn"]) {
    const b = body(docs, n) as string;
    expect(b).not.toMatch(fixedHeight);
    expect(b).toMatch(/minHeight\s*:/);
    expect(b).toMatch(/paddingVertical\s*:/);
  }
  expect(body(docs, "docRowLarge")).toMatch(/flexDirection\s*:\s*"column"/);
  cancelFlex(body(docs, "docMetaLarge"));
  expect(body(docs, "noteBannerLarge")).toMatch(/flexDirection\s*:\s*"column"/);
  cancelFlex(body(docs, "noteBannerTextLarge"));
  expect(body(docs, "approvedCardLarge")).toMatch(/flexDirection\s*:\s*"column"/);
  expect(docs).toMatch(/styles\.docRow, large && styles\.docRowLarge/);
});

test("Resubmit: the file | Replace row stacks and the button grows", () => {
  expect(resub).toMatch(/useLargeText\(\)/);
  expect(resub).toMatch(/styles\.h1\}[^>]*maxFontSizeMultiplier=\{maxFontScale\.title\}/);
  expect(body(resub, "fileCardLarge")).toMatch(/flexDirection\s*:\s*"column"/);
  expect(body(resub, "fileCardLarge")).toMatch(/alignItems\s*:\s*"flex-start"/);
  cancelFlex(body(resub, "fileNameLarge"));
  expect(resub).toMatch(/styles\.fileCard, large && styles\.fileCardLarge/);
  const b = body(resub, "replaceBtn") as string;
  expect(b).not.toMatch(fixedHeight);
  expect(b).toMatch(/minHeight\s*:/);
  expect(b).toMatch(/paddingVertical\s*:/);
});
