import { readFileSync } from "fs";
import { join } from "path";
import { markAdoptedConfirm, posterActions, takedownRefusal, withdrawConfirm } from "../posterActions";

const read = (rel: string) => readFileSync(join(__dirname, "..", rel), "utf8");

describe("which take-down actions a status offers (AD10)", () => {
  it("offers Publish only on a draft, Mark adopted only while nobody holds the reservation", () => {
    expect(posterActions({ status: "draft" }, false)).toEqual(["publish", "edit", "withdraw"]);
    expect(posterActions({ status: "available" }, false)).toEqual(["edit", "markAdopted", "withdraw"]);
    expect(posterActions({ status: "pending" }, true)).toEqual(["edit", "withdraw"]);
    expect(posterActions({ status: "pending" }, false)).toContain("markAdopted");
  });
  it("offers nothing on an adopted, withdrawn or removed listing", () => {
    expect(posterActions({ status: "adopted" }, false)).toEqual([]);
    expect(posterActions({ status: "withdrawn" }, false)).toEqual([]);
    expect(posterActions({ status: "available", removed_by_moderation: true }, false)).toEqual([]);
  });
});

describe("the confirms say who is affected", () => {
  it("withdraw with nobody waiting is plain, and with people waiting names them", () => {
    expect(withdrawConfirm("Bantay", 0).body).not.toMatch(/asked/);
    expect(withdrawConfirm("Bantay", 1)).toMatchObject({ title: "Close their inquiry?", confirm: "Withdraw and close" });
    expect(withdrawConfirm("Bantay", 3).body).toMatch(/3 people have asked about Bantay/);
  });
  it("mark adopted says it is for homes found outside Kupkop", () => {
    expect(markAdoptedConfirm("Bantay", 0).body).toMatch(/outside Kupkop/);
    expect(markAdoptedConfirm("Bantay", 2).body).toMatch(/2 people who asked will be told Bantay found a home/);
  });
  it("maps the server's stale-screen refusals and nothing else", () => {
    expect(takedownRefusal("use_complete")).toMatch(/complete the adoption/);
    expect(takedownRefusal("already_adopted")).toBeTruthy();
    expect(takedownRefusal("boom")).toBeNull();
  });
});

describe("Your listing screen", () => {
  const screen = read("screens/PosterListingScreen.tsx");
  it("posts to the withdraw and mark-adopted endpoints, sending the consent flag when people are waiting", () => {
    expect(screen).toMatch(/`\/listings\/\$\{listingId\}\/\$\{path\}`/);
    expect(screen).toMatch(/close_inquiries: true/);
    expect(screen).toMatch(/has_active_inquiries/);
  });
  it("says a removed listing was removed by moderation", () => {
    expect(screen).toContain("text.posterListing.removed");
  });
  it("explains a refused publish instead of a bare failure (AD12)", () => {
    expect(screen).toMatch(/publishRefusal\(/);
  });
});
