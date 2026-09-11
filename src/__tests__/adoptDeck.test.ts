import { advance, ageLabel, buildDeck, cardMeta, endSummary, factRows, feeLabel, showHidden, topId, undo } from "../adoptDeck";

const ids = ["a", "b", "c", "d"];

describe("the deck state", () => {
  it("starts at the first card with hidden pets already removed", () => {
    const s = buildDeck(ids, [], ["b"]);
    expect(s.order).toEqual(["a", "c", "d"]);
    expect(topId(s)).toBe("a");
  });

  it("saves on a right swipe and hides on a left one, advancing either way", () => {
    let s = buildDeck(ids, [], []);
    s = advance(s, 1);
    expect(s.saved).toEqual(["a"]);
    expect(topId(s)).toBe("b");
    s = advance(s, -1);
    expect(s.hidden).toEqual(["b"]);
    expect(topId(s)).toBe("c");
  });

  it("undo puts the last card back and reverses what the swipe recorded", () => {
    let s = buildDeck(ids, [], []);
    s = advance(advance(s, 1), -1); // a saved, b hidden
    s = undo(s);
    expect(topId(s)).toBe("b");
    expect(s.hidden).toEqual([]);
    expect(s.saved).toEqual(["a"]);
    s = undo(s);
    expect(topId(s)).toBe("a");
    expect(s.saved).toEqual([]);
    expect(undo(s)).toEqual(s); // nothing left to undo is a no-op, not a crash
  });

  it("finishes after the last card, and does not advance past the end", () => {
    let s = buildDeck(["a"], [], []);
    s = advance(s, 1);
    expect(topId(s)).toBeNull();
    expect(advance(s, 1)).toEqual(s);
  });

  it("never records a pet twice", () => {
    let s = buildDeck(["a"], ["a"], []);
    s = advance(s, 1);
    expect(s.saved).toEqual(["a"]);
  });

  it("keeps a pet saved OR hidden, never both — and undo restores exactly", () => {
    // Saved last week, "not for me" today: the end card must not count it twice.
    let s = buildDeck(["a"], ["a"], []);
    s = advance(s, -1);
    expect(s.saved).toEqual([]);
    expect(s.hidden).toEqual(["a"]);
    s = undo(s);
    expect(s.saved).toEqual(["a"]); // the earlier save comes back with the card
    expect(s.hidden).toEqual([]);
    // And the mirror: a pet brought back by "Show hidden again", then saved.
    let h = buildDeck(["b"], [], ["b"]);
    h = showHidden(h, ["b"]);
    h = advance(h, 1);
    expect(h.hidden).toEqual([]);
    expect(h.saved).toEqual(["b"]);
  });

  it("show hidden again forgets every hide but keeps the shortlist", () => {
    let s = buildDeck(ids, [], []);
    s = advance(advance(advance(s, -1), 1), -1); // a hidden, b saved, c hidden
    const back = showHidden(s, ids);
    expect(back.order).toEqual(ids);
    expect(back.hidden).toEqual([]);
    expect(back.saved).toEqual(["b"]);
    expect(topId(back)).toBe("a");
  });

  it("summarises the end state the way the artboard does", () => {
    let s = buildDeck(ids, [], []);
    for (const d of [1, -1, 1, -1] as const) s = advance(s, d);
    expect(endSummary(s)).toBe("You saved 2 and hid 2. Hidden pets stop appearing here — bring them back any time.");
  });
});

describe("card copy", () => {
  const now = new Date("2026-09-11T00:00:00Z");

  it("ages a pet in months under a year and years after", () => {
    expect(ageLabel("2026-06-01", now)).toBe("3 mo");
    expect(ageLabel("2025-09-01", now)).toBe("1 yr");
    expect(ageLabel("2024-03-01", now)).toBe("2 yrs");
    expect(ageLabel("2025-09-20", now)).toBe("11 mo"); // birthday not yet reached this month
  });

  it("says nothing about an unknown or impossible birthdate", () => {
    expect(ageLabel(null, now)).toBeNull();
    expect(ageLabel("not a date", now)).toBeNull();
    expect(ageLabel("2030-01-01", now)).toBeNull();
  });

  it("builds the artboard's 'Aspin · 1 yr · Male' from what is known", () => {
    expect(cardMeta({ name: "Milo", species: "dog", breed: "Aspin", sex: "male", birthdate: "2025-09-01" }, now))
      .toBe("Aspin · 1 yr · Male");
    expect(cardMeta({ name: "X", species: "cat", breed: null }, now)).toBe("Cat");
  });

  it("labels the fee the way the artboard does", () => {
    expect(feeLabel("500.00")).toBe("₱500 adoption fee");
    expect(feeLabel("0.00")).toBe("No adoption fee");
    expect(feeLabel(undefined)).toBe("No adoption fee");
  });

  it("shows only the booleans the listing actually records", () => {
    expect(factRows({ name: "B", species: "dog", breed: null, vaccinated: true, spayed_neutered: false }))
      .toEqual([{ label: "Vaccinated", ok: true }, { label: "Neutered", ok: false }]);
    // null is "not recorded", not "no" — and the artboard's invented rows never appear.
    expect(factRows({ name: "B", species: "dog", breed: null, vaccinated: null, spayed_neutered: null })).toEqual([]);
    expect(factRows({ name: "B", species: "dog", breed: null, walkable: true }).map((r) => r.label)).toEqual(["Walkable"]);
  });
});
