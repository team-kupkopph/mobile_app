import { EMPTY, applyPending, coalesce, diff, kindOf, mergeForFirstSync, withKind } from "../shortlist";

describe("withKind / kindOf", () => {
  it("keeps saved and hidden exclusive, newest first", () => {
    let s = withKind(EMPTY, "a", "saved");
    s = withKind(s, "b", "saved");
    expect(s.saved).toEqual(["b", "a"]);
    s = withKind(s, "a", "hidden");
    expect(s).toEqual({ saved: ["b"], hidden: ["a"] });
    expect(kindOf(s, "a")).toBe("hidden");
    expect(kindOf(withKind(s, "a", null), "a")).toBeNull();
  });
});

describe("mergeForFirstSync", () => {
  it("lets the account win where both have an answer, and pushes what only the phone knows", () => {
    const local = { saved: ["x", "y"], hidden: ["z"] };
    const server = { saved: [], hidden: ["x"] };
    const { merged, pushes } = mergeForFirstSync(local, server);
    expect(kindOf(merged, "x")).toBe("hidden");     // account wins
    expect(kindOf(merged, "y")).toBe("saved");      // phone-only, kept…
    expect(kindOf(merged, "z")).toBe("hidden");
    expect(pushes.map((p) => [p.id, p.kind])).toEqual([["y", "saved"], ["z", "hidden"]]); // …and pushed
  });

  it("pushes nothing when the phone has nothing new", () => {
    expect(mergeForFirstSync(EMPTY, { saved: ["a"], hidden: [] }).pushes).toEqual([]);
  });
});

describe("coalesce / applyPending / diff", () => {
  it("keeps only the last word per listing, in order", () => {
    const ops = [
      { id: "a", kind: "saved" as const, at: 1 },
      { id: "b", kind: "hidden" as const, at: 2 },
      { id: "a", kind: null, at: 3 }
    ];
    expect(coalesce(ops)).toEqual([ops[1], ops[2]]);
    expect(applyPending({ saved: ["a"], hidden: [] }, ops)).toEqual({ saved: [], hidden: ["b"] });
  });

  it("diffs two lists into one operation per changed listing", () => {
    const before = { saved: ["a"], hidden: ["b"] };
    const after = { saved: ["c"], hidden: ["a"] };
    const ops = diff(before, after, 9).sort((x, y) => x.id.localeCompare(y.id));
    expect(ops).toEqual([
      { id: "a", kind: "hidden", at: 9 },
      { id: "b", kind: null, at: 9 },
      { id: "c", kind: "saved", at: 9 }
    ]);
    expect(diff(before, before, 9)).toEqual([]);
  });
});
