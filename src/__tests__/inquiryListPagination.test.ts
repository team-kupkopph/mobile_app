/**
 * The adopter's inquiry list is paginated by the server (`MyInquiriesView`: `{results, next}`, newest first, `?page=N`).
 * InquiryList fetched `/me/inquiries` once and kept `results`, so every inquiry past the first page was unreachable —
 * including an older pending *placement offer*, which needs an answer (seen: 54 inquiries, two active placements off page 1).
 *
 * Same pattern as PosterListingScreen's applicants: remember `next`, fetch `?page=N`, append on page > 1, show "Load more".
 * A source scan in the style of posterListing.test.ts; each scan asserts it found something before asserting anything else.
 */
import { readFileSync } from "fs";
import { join } from "path";

const list = readFileSync(join(__dirname, "..", "components", "InquiryList.tsx"), "utf-8");
const poster = readFileSync(join(__dirname, "..", "screens", "PosterListingScreen.tsx"), "utf-8");

describe("InquiryList pagination", () => {
  test("the reference pattern is still there to copy", () => {
    expect(poster).toMatch(/setNext\(r\.data\.next \?\? null\)/);
    expect(poster).toContain("Load more");
  });
  test("requests a page of /me/inquiries, not the bare URL", () => {
    expect(list).toMatch(/api\.get\(`\/me\/inquiries\?page=\$\{page\}`\)/);
  });
  test("remembers the server's `next` page", () => {
    expect(list).toMatch(/useState<number \| null>\(null\)/);
    expect(list).toMatch(/setNext\(r\.data\??\.next \?\? null\)/);
  });
  test("page 1 replaces, later pages append", () => {
    expect(list).toMatch(/page === 1 \? .*results.* : \[\.\.\.prev, \.\.\..*results.*\]/);
  });
  test("offers Load more only while there is a next page, and it fetches that page", () => {
    expect(list).toMatch(/\{next && .*\? \(/);
    expect(list).toContain("Load more");
    expect(list).toMatch(/onPress=\{\(\) => load\(next\)\}/);
  });
  test("focus refetches from page 1", () => {
    expect(list).toMatch(/load\(1\)/);
  });
});
