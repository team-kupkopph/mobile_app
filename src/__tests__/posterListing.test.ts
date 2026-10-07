import { readFileSync } from "fs";
import { join } from "path";
const read = (rel: string) => readFileSync(join(__dirname, "..", rel), "utf8");

describe("Your listing (spec §3)", () => {
  const screen = read("screens/PosterListingScreen.tsx");
  const detail = read("screens/ListingDetailScreen.tsx");
  it("is registered and loads the listing plus its applicants", () => {
    expect(read("navigation/types.ts")).toMatch(/posterListing: \{ listingId: string \}/);
    expect(screen).toMatch(/api\.get\(`\/listings\/\$\{listingId\}`\)/);
    expect(screen).toMatch(/\/inquiries\?page=/);
  });
  it("says Reserved, not pending, and lists applicants through the helpers", () => {
    expect(screen).toContain("listingStatusChip(");
    expect(screen).toContain("applicantStatusLine(");
    expect(screen).toMatch(/navigation\.navigate\("applicant", \{ inquiryId: a\.inquiry_id \}\)/);
  });
  it("carries the draft's Publish and Edit, which left listingDetail", () => {
    expect(screen).toMatch(/testID="btn\.posterListing\.publish"/);
    expect(screen).toMatch(/\/publish`/);
    expect(detail).not.toMatch(/btn\.listingDetail\.publish/);
  });
  it("listingDetail hands the poster to their own view", () => {
    expect(detail).toMatch(/navigation\.replace\("posterListing", \{ listingId \}\)/);
  });
});
