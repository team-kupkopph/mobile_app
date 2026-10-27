import {
  appendShelters, helpGroups, HelpShelter, helpRowMeta, needCountLabel, WAYS_TO_HELP_EMPTY, WAYS_TO_HELP_INTRO
} from "../waysToHelp";

const s = (id: string, over: Partial<HelpShelter> = {}): HelpShelter => ({
  account_id: id, org_name: id, city: "Marikina City", near: false, open_needs: 4,
  need_titles: ["Dog food", "Deworming"], takes_qr: false, ...over
});

describe("needCountLabel", () => {
  it("is singular for one and plural otherwise", () => {
    expect(needCountLabel(1)).toBe("1 need");
    expect(needCountLabel(4)).toBe("4 needs");
  });
});

describe("helpRowMeta (the Home row's line)", () => {
  it("joins the city and the need count", () => {
    expect(helpRowMeta(s("a"))).toBe("Marikina City · 4 needs");
  });
  it("drops a blank city", () => {
    expect(helpRowMeta(s("a", { city: "" }))).toBe("4 needs");
  });
  it("says a QR-only shelter takes QR donations", () => {
    expect(helpRowMeta(s("a", { open_needs: 0, need_titles: [], takes_qr: true }))).toBe("Marikina City · Takes QR donations");
  });
});

describe("helpGroups", () => {
  it("splits near and other shelters under headings when the viewer has a city", () => {
    const rows = [s("n1", { near: true }), s("n2", { near: true }), s("o1")];
    expect(helpGroups(rows, "Marikina City")).toEqual([
      { title: "Near Marikina City", rows: [rows[0], rows[1]] },
      { title: "Other shelters", rows: [rows[2]] }
    ]);
  });
  it("omits the Other group when every shelter is near", () => {
    const rows = [s("n1", { near: true })];
    expect(helpGroups(rows, "Marikina City")).toEqual([{ title: "Near Marikina City", rows }]);
  });
  it("is one unheaded group when the viewer has a city but nothing is near", () => {
    const rows = [s("o1"), s("o2")];
    expect(helpGroups(rows, "Marikina City")).toEqual([{ title: null, rows }]);
  });
  it("without a viewer city is one unheaded group", () => {
    const rows = [s("o1"), s("o2")];
    expect(helpGroups(rows, null)).toEqual([{ title: null, rows }]);
  });
  it("is empty for no rows", () => {
    expect(helpGroups([], "Marikina City")).toEqual([]);
  });
});

describe("appendShelters (Load more)", () => {
  it("appends the next page", () => {
    expect(appendShelters([s("a")], [s("b")]).map((x) => x.account_id)).toEqual(["a", "b"]);
  });
  it("drops a shelter already shown", () => {
    expect(appendShelters([s("a"), s("b")], [s("b"), s("c")]).map((x) => x.account_id)).toEqual(["a", "b", "c"]);
  });
  it("starts from nothing", () => {
    expect(appendShelters(null, [s("a")]).map((x) => x.account_id)).toEqual(["a"]);
  });
});

describe("the fixed words", () => {
  it("match the approved design", () => {
    expect(WAYS_TO_HELP_EMPTY).toBe("No shelters are asking for help right now.");
    expect(WAYS_TO_HELP_INTRO).toBe("Verified shelters asking for help. Pledge an item from their wishlist, or give through their QR.");
  });
});
