import { readFileSync } from "fs";
import { join } from "path";
import { SAVED_EMPTY, SEGMENTS, SEG_BROWSE, SEG_INQUIRIES, SEG_SAVED, savedFee, savedMeta, savedStatus } from "../savedList";

const read = (rel: string) => readFileSync(join(__dirname, "..", rel), "utf8");
const listing = (over: object = {}) => ({
  listing_id: "l1", city: "Marikina", status: "available", adoption_fee: "0",
  pet: { name: "Bantay", species: "dog", breed: null }, ...over
}) as any;

describe("the Saved segment (AD18)", () => {
  it("sits between Browse and My inquiries, and the indices agree with the labels", () => {
    expect(SEGMENTS).toEqual(["Browse", "Saved", "My inquiries"]);
    expect([SEG_BROWSE, SEG_SAVED, SEG_INQUIRIES]).toEqual([0, 1, 2]);
  });
  it("never says pending: a reserved pet reads Reserved, an adopted one Adopted", () => {
    expect(savedStatus("available")).toEqual({ label: "Available", tone: "success" });
    expect(savedStatus("pending").label).toBe("Reserved");
    expect(savedStatus("adopted").label).toBe("Adopted");
    expect(savedStatus("withdrawn").label).toBe("No longer listed");
  });
  it("describes a card from what the listing records", () => {
    expect(savedMeta(listing())).toBe("Dog · Marikina");
    expect(savedMeta(listing({ pet: { name: "x", species: "cat", breed: "Puspin" } }))).toBe("Puspin · Marikina");
    expect(savedFee(listing())).toBe("No adoption fee");
    expect(savedFee(listing({ adoption_fee: "300.00" }))).toMatch(/₱300/);
    expect(SAVED_EMPTY).toMatch(/right swipe/);
  });
  it("is read from the saved-list endpoint and opens the listing", () => {
    const list = read("components/SavedList.tsx");
    expect(list).toMatch(/\/me\/shortlist\/listings\?page=/);
    expect(list).toMatch(/navigation\.navigate\("listingDetail"/);
    expect(read("screens/AdoptScreen.tsx")).toMatch(/segment === SEG_SAVED/);
  });
});

describe("deck paging (AD17)", () => {
  const screen = read("screens/AdoptScreen.tsx");
  it("fetches the next page the deck asks for and appends it without duplicates", () => {
    expect(screen).toMatch(/&page=\$\{nextPage\}/);
    expect(screen).toMatch(/hasMore=\{!!nextPage\}/);
    expect(screen).toMatch(/onNearEnd=\{loadMore\}/);
    expect(screen).toMatch(/seen\.has\(l\.listing_id\)/);
  });
  it("does not ask twice while a page is in flight, and forgets the extra pages on a refetch", () => {
    expect(screen).toMatch(/loadingMore\.current/);
    expect(screen).toMatch(/setMore\(\[\]\)/);
  });
  it("the deck rebuilds with continueDeck so the person keeps their place", () => {
    const deck = read("components/AdoptDeck.tsx");
    expect(deck).toMatch(/continueDeck\(prev, ids/);
    expect(deck).toMatch(/nearEnd\(deck\)/);
  });
});

describe("the Archived link (AD10) and the removed chip (AD7)", () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { ARCHIVED_STATUS, cardChip } = require("../shelterAnimals");
  it("withdrawn listings are read with their own status, behind a link", () => {
    expect(ARCHIVED_STATUS).toBe("withdrawn");
    const by = read("components/ListingsByStatus.tsx");
    expect(by).toMatch(/archived \? ARCHIVED_STATUS : SEGMENT_STATUS/);
    expect(by).toContain("btn.listings.archived");
  });
  it("a takedown wins over the status on the poster's own card", () => {
    expect(cardChip({ status: "available", removed_by_moderation: true }, false).label).toBe("Removed");
    expect(cardChip({ status: "withdrawn" }, true).label).toBe("Withdrawn");
    expect(cardChip({ status: "pending" }, false).label).toBe("Reserved");
    expect(cardChip({ status: "wat" }, false).label).toBe("Available");
  });
});
