/**
 * DW1 (Abot-tulong QR plan, OQ2 / AT12): a donor with one phone cannot scan the QR on the screen they are looking at. Both GCash and Maya can scan a SAVED
 * image, so Donate offers "Save QR" (download the code, hand it to the iOS share sheet, whose "Save Image" puts it in Photos) and a hint that says so.
 * The share sheet needs no new native module or Photos permission prompt (expo-file-system and expo-sharing are already in the build).
 */
import { readFileSync } from "fs";
import { join } from "path";

const mockDownload = jest.fn();
const mockShare = jest.fn();
const mockAvailable = jest.fn();
const mockDelete = jest.fn();
let mockExists = false;
jest.mock("expo-file-system", () => {
  class File {
    uri: string; constructor(_d: unknown, name: string) { this.uri = `file:///cache/${name}`; }
    get exists() { return mockExists; }
    delete() { mockDelete(); }
    static downloadFileAsync(url: string, dest: unknown) { return mockDownload(url, dest); }
  }
  return { File, Paths: { cache: "cache" } };
});
jest.mock("expo-sharing", () => ({ isAvailableAsync: () => mockAvailable(), shareAsync: (u: string, o: unknown) => mockShare(u, o) }));

import { saveQrImage } from "../saveQr";

beforeEach(() => { jest.clearAllMocks(); mockExists = false; mockAvailable.mockResolvedValue(true); mockShare.mockResolvedValue(undefined); mockDownload.mockImplementation(async (_u, d) => d); });

describe("saveQrImage", () => {
  it("downloads the code and opens the share sheet as a JPEG", async () => {
    const r = await saveQrImage("https://m/qr.jpg", "gcash");
    expect(r).toEqual({ ok: true });
    expect(mockDownload).toHaveBeenCalledWith("https://m/qr.jpg", expect.anything());
    expect(mockShare).toHaveBeenCalledWith(expect.stringContaining("kupkop-qr-gcash"), expect.objectContaining({ mimeType: "image/jpeg" }));
  });
  it("replaces a stale copy of the same provider's file", async () => {
    mockExists = true;
    await saveQrImage("https://m/qr.jpg", "maya");
    expect(mockDelete).toHaveBeenCalled();
  });
  it("a failed download is a plain 'failed' result, not a throw", async () => {
    mockDownload.mockRejectedValue(new Error("net"));
    expect(await saveQrImage("https://m/qr.jpg", "gcash")).toEqual({ ok: false, reason: "download" });
    expect(mockShare).not.toHaveBeenCalled();
  });
  it("no share sheet available is reported, not thrown", async () => {
    mockAvailable.mockResolvedValue(false);
    expect(await saveQrImage("https://m/qr.jpg", "gcash")).toEqual({ ok: false, reason: "unavailable" });
  });
  it("a dismissed or failed share sheet is not an error the donor must see", async () => {
    mockShare.mockRejectedValue(new Error("cancelled"));
    expect(await saveQrImage("https://m/qr.jpg", "gcash")).toEqual({ ok: true });
  });
});

describe("the donor's QR card", () => {
  const src = readFileSync(join(__dirname, "..", "screens", "DonateScreen.tsx"), "utf-8");
  it("has a Save QR button labelled with the provider, and the scan-a-saved-image hint", () => {
    expect(src).toMatch(/Save QR/);
    expect(src).toMatch(/accessibilityLabel=\{`Save the \$\{[^}]*\} QR code/);
    expect(src).toMatch(/GCash or Maya[\s\S]{0,80}saved image|saved image[\s\S]{0,120}GCash or Maya/);
  });
  it("says so plainly when the save fails", () => {
    expect(src).toMatch(/couldn't save this code/i);
  });
});
