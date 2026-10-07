import { readFileSync } from "fs";
import { join } from "path";
const read = (rel: string) => readFileSync(join(__dirname, "..", rel), "utf8");

describe("the Applicant screen (spec §2)", () => {
  const screen = read("screens/ApplicantScreen.tsx");
  it("is a registered route keyed by inquiry", () => {
    expect(read("navigation/types.ts")).toMatch(/applicant: \{ inquiryId: string \}/);
    expect(read("navigation/RootNavigator.tsx")).toMatch(/<Stack\.Screen name="applicant" component=\{ApplicantScreen\}/);
  });
  it("renders from the poster tier alone and hands an adopter to their ladder", () => {
    expect(screen).toMatch(/api\.get\(`\/inquiries\/\$\{inquiryId\}`\)/);
    expect(screen).toMatch(/viewer === "adopter"/);
    expect(screen).toMatch(/navigation\.replace\("inquiry", \{ inquiryId \}\)/);
    expect(screen).not.toMatch(/api\.get\(`\/listings\//);
  });
  it("drives the footer, confirms and refusals through the helpers", () => {
    for (const fn of ["applicantFooter(", "confirmCopy(", "actionPath(", "applicantRefusal(", "posterLadderHeader("]) {
      expect(screen).toContain(fn);
    }
    expect(screen).toMatch(/<ConfirmModal/);
    expect(screen).toMatch(/<DeclineSheet/);
    expect(screen).toMatch(/<StepSheet/);
  });
  it("keeps contact locked until screening and calls by tel:", () => {
    expect(screen).toMatch(/testID="text\.applicant\.contactLocked"/);
    expect(screen).toMatch(/Linking\.openURL\(`tel:/);
  });
  it("never disables the footer buttons", () => {
    expect(screen).not.toMatch(/disabled=\{/);
  });
});
