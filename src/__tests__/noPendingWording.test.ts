import { readFileSync } from "fs";
import { join } from "path";

const read = (rel: string) => readFileSync(join(__dirname, "..", rel), "utf8");

// Run 12 · CP-4: no user-facing surface of the adoption loop says "pending" for a listing (the wire's `pending` reads
// "Reserved"). The other half of the plan's row: where it IS used, it is only the wire value or an internal name.
const FILES = [
  "shelterAnimals.ts", "savedList.ts", "applicant.ts", "adoption.ts",
  "screens/PosterListingScreen.tsx", "screens/ListingDetailScreen.tsx", "screens/ShelterAnimalsScreen.tsx",
  "screens/MyListingsScreen.tsx", "screens/ApplicantScreen.tsx", "screens/InquiryScreen.tsx",
  "components/ListingsByStatus.tsx", "components/InquiryList.tsx", "components/SavedList.tsx",
];

/** String literals and JSX text, with comments removed. */
function visibleText(src: string): string[] {
  const code = src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
  const out: string[] = [];
  for (const m of code.matchAll(/"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g)) out.push(m[1] ?? m[2] ?? m[3] ?? "");
  for (const m of code.matchAll(/>([^<>{}\n][^<>{}]*)</g)) out.push(m[1]);
  return out;
}

describe("no user-facing 'pending' on the adoption screens (CP-4)", () => {
  const all = FILES.flatMap((f) => visibleText(read(f)).map((t) => ({ f, t })));
  it("the scan found the wire value, so it is looking at the right text", () => {
    expect(all.filter((x) => x.t === "pending").length).toBeGreaterThan(3);
  });
  it("the only literal containing the word is the wire value itself", () => {
    const hits = all.filter((x) => /pending/i.test(x.t) && x.t !== "pending").map((x) => `${x.f}: ${x.t}`);
    expect(hits).toEqual([]);
  });
  it("a reserved listing is worded Reserved wherever a status becomes a label", () => {
    expect(read("shelterAnimals.ts")).toContain('pending: { label: "Reserved", tone: "warning" }');
    expect(read("savedList.ts")).toContain('if (status === "pending") return { label: "Reserved", tone: "warning" }');
    expect(read("screens/ListingDetailScreen.tsx")).toContain('listing.status === "pending" ? "Reserved for an applicant."');
  });
});

// Run 12 · PL-6: the redirect from the public detail to Your listing compares the poster's id with the signed-in
// account's id, which the screen reads from the tokens at mount. That is safe only because nothing renders before the
// tokens are hydrated; this pins both halves so neither can drift apart unnoticed.
describe("the poster redirect has its account id when the screen mounts (PL-6, C-P11)", () => {
  it("the root navigator renders nothing until the stored tokens have been read", () => {
    expect(read("navigation/RootNavigator.tsx")).toMatch(/if \(!isReady\) return null;/);
  });
  it("the detail screen compares the poster's account id with the one in its tokens, then replaces itself", () => {
    const src = read("screens/ListingDetailScreen.tsx");
    expect(src).toContain("const myAccountId = accountIdFromAccessToken(tokens?.access);");
    expect(src).toMatch(/r\.data\?\.poster\?\.account_id === myAccountId\) \{ navigation\.replace\("posterListing"/);
  });
});

// Run 12 · PL-6c: someone who is not the poster (a stranger, or a shelter looking at another account's listing) stays on
// the ordinary public detail. The redirect is conditional on the ids matching; a shelter is shown a note instead of
// Inquire (AD14), so it is never offered an action the server would refuse.
describe("a non-poster stays on the public detail (PL-6c)", () => {
  const src = read("screens/ListingDetailScreen.tsx");
  it("the redirect is the only navigation off the screen, and it is conditional on the poster being you", () => {
    expect(src.match(/navigation\.replace\(/g)?.length).toBe(1);
    expect(src).toMatch(/if \(r\.data\?\.poster\?\.account_id === myAccountId\) \{ navigation\.replace\("posterListing"/);
  });
  it("a shelter gets the note and not the Inquire button", () => {
    const from = src.indexOf(") : isShelter ? (");
    const shelterBranch = src.slice(from, src.indexOf(") : (", from));   // up to the else branch, which holds the button
    expect(from).toBeGreaterThan(0);                                       // the scan found the branch
    expect(shelterBranch).toContain("text.listingDetail.shelterNote");
    expect(shelterBranch).not.toContain("btn.listingDetail.inquire");
    expect(src.slice(src.indexOf(") : (", from))).toContain("btn.listingDetail.inquire");
  });
});
