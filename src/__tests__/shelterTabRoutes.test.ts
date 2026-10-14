/**
 * Every shelter screen's bottom tab bar must route to the four OTHER tabs (found in the Run 6 part 18 default-size pass): the Donate tab's bar handled only "Home"
 * (`t === "home" && navigate(...)`), so Animals, Requests and You were dead taps from it, and the Animals tab's bar had no route to Requests. Nothing about text size:
 * a navigation dead end that the AX5 walks happened to step around (they entered each tab from Home).
 *
 * A source scan: each `<ShelterTabs active="x" onTabPress=...>` block must navigate for every tab except its own.
 */
import { readFileSync } from "fs";
import { join } from "path";

const SCREENS: Record<string, string> = {
  ShelterDashboardScreen: "home", ShelterAnimalsScreen: "animals", ShelterDonateScreen: "donate", ShelterRequestsScreen: "requests", ShelterProfileScreen: "profile"
};
const ROUTE: Record<string, string> = { home: "shelterDashboard", animals: "shelterAnimals", donate: "shelterDonate", requests: "shelterRequests", profile: "shelterProfile" };
const TAB_FOR_KEY: Record<string, string> = ROUTE;

const blocks = (src: string) => {
  const out: string[] = [];
  const re = /<ShelterTabs[\s\S]*?\/>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) out.push(m[0]);
  return out;
};

describe.each(Object.entries(SCREENS))("%s's tab bar", (file, own) => {
  const src = readFileSync(join(__dirname, "..", "screens", `${file}.tsx`), "utf-8");
  const bs = blocks(src);
  it("the scan found the tab bar (a guard that matches nothing proves nothing)", () => {
    expect(bs.length).toBeGreaterThan(0);
  });
  it.each(Object.keys(ROUTE).filter((k) => k !== own))("every bar routes %s", (tab) => {
    for (const b of bs) expect(b).toContain(`navigate("${TAB_FOR_KEY[tab]}")`);
  });
});
