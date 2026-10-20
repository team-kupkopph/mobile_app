import { readFileSync } from "fs";
import { join } from "path";
import { EMPTY_APPLICATION, applicationRows, buildApplication, inquiryBody } from "../inquireApplication";

const read = (rel: string) => readFileSync(join(__dirname, "..", rel), "utf8");

describe("the Inquire sheet's answers (AD8)", () => {
  it("sends nothing the person left blank", () => {
    expect(buildApplication(EMPTY_APPLICATION)).toEqual({});
    expect(inquiryBody("  ", EMPTY_APPLICATION)).toEqual({ message: undefined, application: {} });
  });
  it("asks the landlord question only of renters", () => {
    const own = buildApplication({ ...EMPTY_APPLICATION, rents: false, landlordOk: true });
    expect(own).toEqual({ rents: false });
    const rent = buildApplication({ ...EMPTY_APPLICATION, rents: true, landlordOk: true });
    expect(rent).toEqual({ rents: true, landlord_ok: true });
  });
  it("trims and caps free text at the server's 500", () => {
    const a = buildApplication({ ...EMPTY_APPLICATION, homeType: "condo", experience: ` ${"x".repeat(600)} ` });
    expect(a.home_type).toBe("condo");
    expect((a.experience as string).length).toBe(500);
  });
});

describe("how the poster reads them", () => {
  it("lists answers in the order the sheet asks, with readable labels, and nothing for none", () => {
    expect(applicationRows(null)).toEqual([]);
    expect(applicationRows({ schedule: "WFH", home_type: "apartment", rents: true, landlord_ok: false })).toEqual([
      { label: "Home", value: "Apartment" }, { label: "Renting", value: "Yes" },
      { label: "Landlord allows pets", value: "No" }, { label: "Schedule", value: "WFH" }
    ]);
  });
});

describe("the screens", () => {
  it("Inquire opens the sheet, and the sheet's send posts the body (AD8)", () => {
    const detail = read("screens/ListingDetailScreen.tsx");
    expect(detail).toMatch(/setSheet\(true\)/);
    expect(detail).toMatch(/api\.post\(`\/listings\/\$\{listingId\}\/inquiries`, body\)/);
    expect(read("components/InquireSheet.tsx")).toContain("btn.inquire.send");
  });
  it("a shelter is told up front, not sent into a 403 (AD14)", () => {
    expect(read("screens/ListingDetailScreen.tsx")).toContain("text.listingDetail.shelterNote");
  });
  it("the Applicant screen shows the answers (AD8)", () => {
    expect(read("screens/ApplicantScreen.tsx")).toContain("card.applicant.answers");
  });
});

describe("the Inquire sheet follows the keyboard (Run 9, R9-F1)", () => {
  const sheet = read("components/InquireSheet.tsx");
  it("its ScrollView adds a keyboard inset, so a focused field isn't left behind the keyboard at AX5", () => {
    const tag = /<ScrollView\b[\s\S]*?[}"]\s*>/.exec(sheet)?.[0] ?? "";
    expect(tag).toMatch(/keyboardShouldPersistTaps/);      // the scan found the tag
    expect(tag).toMatch(/\bautomaticallyAdjustKeyboardInsets\b/);
  });
});
