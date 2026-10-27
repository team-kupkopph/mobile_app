/**
 * US-W4 · Ways to help — source scans in the house style (the rules themselves are unit-tested in waysToHelp.test.ts).
 *
 *  - WaysToHelpScreen lists `GET /shelters/ways-to-help` with the viewer's cached city, groups it, pages it, and opens a
 *    shelter's existing Donate screen.
 *  - Home carries a "Ways to help" section (three rows, See all) that is one of its data panels.
 */
import { readFileSync } from "fs";
import { join } from "path";

const read = (...p: string[]) => readFileSync(join(__dirname, "..", ...p), "utf-8");
const screen = read("screens", "WaysToHelpScreen.tsx");
const nav = read("navigation", "RootNavigator.tsx");
const types = read("navigation", "types.ts");
const home = read("screens", "HomeScreen.tsx");
const sections = read("components", "home", "HomeSections.tsx");

describe("the scan found its files (a guard that matches nothing proves nothing)", () => {
  it("WaysToHelpScreen is a non-trivial source", () => {
    expect(screen.length).toBeGreaterThan(1500);
    expect(screen).toMatch(/export function WaysToHelpScreen/);
  });
});

describe("WaysToHelpScreen", () => {
  it("is a registered route with no params", () => {
    expect(nav).toMatch(/<Stack\.Screen name="waysToHelp" component=\{WaysToHelpScreen\} \/>/);
    expect(types).toMatch(/waysToHelp: undefined;/);
  });
  it("asks for the list with the viewer's cached city, and refetches on focus", () => {
    expect(screen).toMatch(/const \{ city \} = useAuth\(\)/);
    expect(screen).toMatch(/`\/shelters\/ways-to-help\?city=\$\{encodeURIComponent\(city \?\? ""\)\}`/);
    expect(screen).toMatch(/useFocusEffect\(load\)/);
  });
  it("groups the rows and gives the list its load, empty and retry states", () => {
    expect(screen).toMatch(/helpGroups\(rows/);
    expect(screen).toMatch(/<LoadStateView[^>]*emptyTitle=\{WAYS_TO_HELP_EMPTY\}[^>]*onRetry=/s);
    expect(screen).toMatch(/\{WAYS_TO_HELP_INTRO\}/);
  });
  it("opens the shelter's existing Donate screen", () => {
    expect(screen).toMatch(/navigate\("donate", \{ accountId: s\.account_id, orgName: s\.org_name, city: s\.city \}\)/);
  });
  it("pages with a secondary Load more and says when a page fails", () => {
    expect(screen).toMatch(/&page=\$\{next\}/);
    expect(screen).toMatch(/appendShelters\(prev, r\.data\.results\)/);
    expect(screen).toMatch(/<Button label="Load more" variant="secondary" onPress=\{loadMore\} loading=\{loadingMore\}/);
    expect(screen).toMatch(/Couldn't load more\. Try again\./);
  });
  it("shows each shelter's need count, titles and QR line through the shared helpers", () => {
    expect(screen).toMatch(/needCountLabel\(s\.open_needs\)/);
    expect(screen).toMatch(/s\.need_titles\.join\(" · "\)/);
    expect(screen).toMatch(/\{TAKES_QR\}/);
  });
});

describe("Home · the Ways to help section", () => {
  it("fetches page 1 with the same city as the other city panels, and keeps three", () => {
    const loader = home.slice(home.indexOf("const loadCityPanels"), home.indexOf("const loadStories"));
    expect(loader).toMatch(/\/shelters\/ways-to-help\?city=\$\{encodeURIComponent\(city \?\? ""\)\}/);
    expect(loader).toMatch(/setHelpers\(\(r\.data\?\.results \?\? \[\]\)\.slice\(0, 3\)\)/);
  });
  it("the help panel is one of Home's data panels", () => {
    expect(home).toMatch(/const helpPanel = loadState\(helpRes, helpers\.length\)/);
    expect(home).toMatch(/const dataPanels = \[[^\]]*\bhelpPanel\b[^\]]*\]/);
  });
  it("sits between Adopt near you and Community stories, with See all to the Ways to help screen", () => {
    const adopt = home.indexOf('title="Adopt near you"');
    const help = home.indexOf('title="Ways to help"');
    const stories = home.indexOf('title="Community stories"');
    expect(adopt).toBeGreaterThan(0);
    expect(help).toBeGreaterThan(adopt);
    expect(stories).toBeGreaterThan(help);
    expect(home.slice(help, stories)).toMatch(/actionLabel="See all ›"/);
    expect(home.slice(help, stories)).toMatch(/navigation\.navigate\("waysToHelp"\)/);
  });
  it("has load, empty and row states, and a row opens that shelter's Donate screen", () => {
    const block = home.slice(home.indexOf('title="Ways to help"'), home.indexOf('title="Community stories"'));
    expect(block).toMatch(/<LoadStateView state=\{helpPanel\} onRetry=\{loadCityPanels\} \/>/);
    expect(block).toMatch(/<EmptyNote>\{WAYS_TO_HELP_EMPTY\}<\/EmptyNote>/);
    expect(block).toMatch(/<ShelterHelpRow/);
    expect(block).toMatch(/navigation\.navigate\("donate", \{ accountId: s\.account_id, orgName: s\.org_name, city: s\.city \}\)/);
  });
  it("ShelterHelpRow shows the name and the shared meta line", () => {
    expect(sections).toMatch(/export function ShelterHelpRow\(/);
    expect(sections).toMatch(/helpRowMeta\(shelter\)/);
  });
});
