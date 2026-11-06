/**
 * Review step 7 · both stores require reporting and blocking for an app with user-generated content (Apple 1.2; Google
 * Play's UGC policy). This is what stops them quietly going away: every place a person is shown offers both, as two
 * separate labelled controls; the old self-contained "Flag" path is gone; and there is a way to see and undo a block.
 *
 * ⚠️ The project's own rule for a source scan: assert it READ something before it asserts anything was or was not there,
 * so an empty read can never pass. And no regex over JSX: plain `toContain`.
 */
import { readFileSync } from "fs";
import { join } from "path";

import { settingsGroups } from "../settings";

const SRC = join(__dirname, "..");
const read = (rel: string) => {
  const text = readFileSync(join(SRC, rel), "utf8");
  expect(text.length).toBeGreaterThan(200);          // it read a real file
  return text;
};

/** Where a person is shown, and what names them there. The listing poster, a story's author, a shift's shelter, an applicant. */
const PEOPLE: Array<[string, string]> = [
  ["screens/ListingDetailScreen.tsx", "row.listingDetail.person"],
  ["screens/StoryDetailScreen.tsx", "row.storyDetail.person"],
  ["screens/KawangGawaDetailScreen.tsx", "row.kawanggawaDetail.person"],
  ["screens/ApplicantScreen.tsx", "row.applicant.person"],
];

describe("every place a person is shown offers Report and Block", () => {
  it.each(PEOPLE)("%s", (file, testID) => {
    const src = read(file);
    expect(src).toContain("<PersonActions");
    expect(src).toContain(`testID="${testID}"`);
    expect(src).toContain('targetType: "account"');          // reporting a PERSON, not just their post
  });

  it("covers all four, and has read something for each", () => {
    expect(PEOPLE).toHaveLength(4);
  });
});

describe("after a block, the page of the person you blocked is left", () => {
  it.each([
    ["screens/ListingDetailScreen.tsx", true],
    ["screens/StoryDetailScreen.tsx", true],
    ["screens/KawangGawaDetailScreen.tsx", true],
    ["screens/ApplicantScreen.tsx", false],           // an inquiry already under way is never touched
  ])("%s leaves content: %s", (file, leaves) => {
    const src = read(file);
    expect(src.includes("leaveContent: true")).toBe(leaves);
  });
  it("the confirmation screen pops by that depth instead of one", () => {
    const sent = read("screens/ReportContentSentScreen.tsx");
    expect(sent).toContain("navigation.pop(blockExitDepth(leaveContent))");
  });
  it("the form hands the choice on", () => {
    expect(read("screens/ReportContentScreen.tsx")).toContain("leaveContent: params.leaveContent");
  });
  it("clears an error as it is fixed, not only on the next Send", () => {
    expect(read("screens/ReportContentScreen.tsx")).toContain("stillWrong(p, code, text)");
  });
});

describe("the two controls are separate and labelled (Google: not one combined button)", () => {
  const src = read("components/PersonActions.tsx");
  it("is two buttons with their own accessibility labels", () => {
    expect(src).toContain("Report this person");
    expect(src).toContain("`Report ${person.name}`");
    expect(src).toContain("`Block ${person.name}`");
    expect(src.split("accessibilityRole=\"button\"").length - 1).toBe(2);
  });
  it("asks before blocking, and says what it leaves alone", () => {
    expect(src).toContain("<ConfirmModal");
    expect(src).toContain("blockConfirmCopy");
  });
  it("stops offering Block once it has happened, instead of leaving it to press twice", () => {
    expect(src).toContain("setBlocked(true)");
    expect(src).toContain(".blocked`}");
    expect(src.split("accessibilityRole=\"button\"").length - 1).toBe(2);   // still exactly two buttons
  });
  it("shows a guest neither (the screen's own Report link raises the sign-up wall)", () => {
    expect(src).toContain("if (tokens === null) return null");
  });
});

describe("the old self-contained story flag is gone", () => {
  const story = read("screens/StoryDetailScreen.tsx");
  it("routes to the shared form instead of posting a fixed reason itself", () => {
    expect(story).not.toContain("/moderation/flags");
    expect(story).not.toContain("reported from story detail");
    expect(story).not.toContain("confirmFlag");
    expect(story).toContain('targetType: "story"');
  });
  it("says 'Report this', like every other screen, not 'Flag'", () => {
    expect(story).toContain("Report this");
    expect(story).not.toContain(">Flag<");
  });
});

describe("the report form", () => {
  const form = read("screens/ReportContentScreen.tsx");
  it("sends a category and ends on its own confirmation screen, not an Alert", () => {
    expect(form).toContain("REPORT_REASONS");
    expect(form).toContain('navigation.replace("reportContentSent"');
    expect(form).not.toContain("Alert.alert");
  });
});

describe("a block can be seen and undone", () => {
  it("has a Blocked people row in Settings, under Privacy", () => {
    const groups = settingsGroups({ shelter: false, privacyUrl: null });
    expect(groups.length).toBeGreaterThan(0);
    const privacy = groups.find((g) => g.title === "PRIVACY");
    expect(privacy?.rows.map((r) => r.key)).toContain("blockedPeople");
  });
  it("is there for a shelter account too", () => {
    const privacy = settingsGroups({ shelter: true, privacyUrl: null }).find((g) => g.title === "PRIVACY");
    expect(privacy?.rows.map((r) => r.key)).toContain("blockedPeople");
  });
  it("lists blocks from the server and unblocks by the id of the block, never an account id", () => {
    const src = read("screens/BlockedPeopleScreen.tsx");
    expect(src).toContain('api.get("/me/blocks")');
    expect(src).toContain("api.del(`/me/blocks/${person.block_id}`)");
    expect(src).not.toContain("account_id");
  });
});
