/**
 * The Adopt deck's counter said "You have seen all 0" after a relaunch with every listing hidden (hidden listings are filtered when the
 * deck is rebuilt, so its order is empty), while the same session had said "You have seen all 20". With nothing in the deck the counter
 * now says why. Wording is a draft from the previous session, not yet confirmed by the owner.
 *
 * A source scan in the style of adoptDeckPositionAx5.test.ts plus the pure function; the device walk is the proof.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { buildDeck, positionLabel } from "../adoptDeck";

const deck = readFileSync(join(__dirname, "..", "components", "AdoptDeck.tsx"), "utf-8");

describe("the deck's counter when nothing is left to swipe", () => {
  it("the scan found the counter (a guard that matches nothing proves nothing)", () => {
    expect(deck).toMatch(/styles\.position\b/);
    expect(deck).toMatch(/deck\.adopt\.end/);
  });
  it("the component takes its counter from positionLabel, not an inline template", () => {
    expect(deck).toMatch(/positionLabel\(deck/);
    expect(deck).not.toMatch(/You have seen all/);
  });
  it("an empty deck (all hidden) never reads 'all 0'", () => {
    const empty = buildDeck(["a", "b"], [], ["a", "b"]);
    expect(empty.order).toHaveLength(0);
    expect(positionLabel(empty, "")).toBe("You've hidden every listing. Nothing left to swipe.");
    expect(positionLabel(empty, " near Marikina City")).not.toMatch(/all 0/);
  });
  it("the other counters are unchanged", () => {
    const d = buildDeck(["a", "b"], [], []);
    expect(positionLabel(d, " near Pasig")).toBe("1 of 2 near Pasig");
    expect(positionLabel({ ...d, index: 2 }, "")).toBe("You have seen all 2");
  });
});
