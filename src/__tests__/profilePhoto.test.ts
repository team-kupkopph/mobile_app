/**
 * The profile photo (account/settings review, Task 10's missing half).
 *
 * The You tab has always RENDERED `me.photo_url`, and `PATCH /me` has always accepted a
 * `photo_file_url`, but no screen ever picked one: the avatar was initials for everybody. The
 * backend now only accepts this account's own `profile_photo` upload (backend: profile photo is an
 * upload, not a link), so the picker has to go through the presign flow like every other photo.
 */
import { readFileSync } from "fs";
import { join } from "path";

import { changeProfilePhoto, removeProfilePhoto } from "../profilePhoto";

const read = (...p: string[]) => readFileSync(join(__dirname, "..", ...p), "utf8");

const me = { id: "a", photo_url: "https://bkt/profile_photo/a/b" };
const okApi = (calls: any[]) => ({
  patch: async (path: string, body: any) => { calls.push([path, body]); return { ok: true, status: 200, data: me }; },
});

describe("changeProfilePhoto", () => {
  it("uploads, then saves the uploaded address, and hands back the updated account", async () => {
    const calls: any[] = [];

    const out = await changeProfilePhoto(okApi(calls), async () => ({ ok: true, fileUrl: "https://bkt/profile_photo/a/b" }));

    expect(calls).toEqual([["/me", { photo_file_url: "https://bkt/profile_photo/a/b" }]]);
    expect(out).toEqual({ kind: "saved", me });
  });

  it("cancelling the picker is an ordinary outcome: no request, no message", async () => {
    const calls: any[] = [];

    const out = await changeProfilePhoto(okApi(calls), async () => null);

    expect(out).toEqual({ kind: "cancelled" });
    expect(calls).toEqual([]);
  });

  it("a failed upload says why, in the upload's own words, and saves nothing", async () => {
    const calls: any[] = [];

    const out = await changeProfilePhoto(okApi(calls), async () => ({ ok: false, reason: "too_large" }));

    expect(out).toMatchObject({ kind: "failed", message: expect.stringMatching(/too large/i) });
    expect(calls).toEqual([]);
  });

  it("a refused save does not blame the person, and a dropped connection says so", async () => {
    const refused = { patch: async () => ({ ok: false, status: 400, data: { error: { code: "invalid" } } }) };
    const offline = { patch: async () => ({ ok: false, status: 0, data: undefined }) };
    const pick = async () => ({ ok: true as const, fileUrl: "https://bkt/profile_photo/a/b" });

    expect(await changeProfilePhoto(refused, pick)).toMatchObject({ kind: "failed", message: expect.stringMatching(/try again/i) });
    expect(await changeProfilePhoto(offline, pick)).toMatchObject({ kind: "failed", message: expect.stringMatching(/connect/i) });
  });
});

describe("removeProfilePhoto", () => {
  it("clears it with a blank address", async () => {
    const calls: any[] = [];

    const out = await removeProfilePhoto(okApi(calls));

    expect(calls).toEqual([["/me", { photo_file_url: "" }]]);
    expect(out.kind).toBe("saved");
  });

  it("a failed removal is reported, not swallowed", async () => {
    const out = await removeProfilePhoto({ patch: async () => ({ ok: false, status: 500, data: undefined }) });

    expect(out).toMatchObject({ kind: "failed" });
  });
});

describe("the wiring", () => {
  it("finds the files it means to check", () => {
    // ⚠️ Assert the scan found something before believing it found nothing.
    expect(read("screens", "ProfileScreen.tsx").length).toBeGreaterThan(1000);
    expect(read("upload.ts").length).toBeGreaterThan(500);
  });

  it("profile_photo is a declared upload purpose", () => {
    expect(read("upload.ts")).toMatch(/UploadPurpose[\s\S]{0,400}"profile_photo"/);
  });

  it("the You tab picks through the shared upload path, and offers to remove", () => {
    const src = read("screens", "ProfileScreen.tsx");
    expect(src).toContain('pickAndUpload(api, "profile_photo")');
    expect(src).toContain("changeProfilePhoto(");
    expect(src).toContain("removeProfilePhoto(");
    expect(src).toContain('testID="btn.profile.changePhoto"');
  });

  it("an avatar that fails to load falls back to the initials, never an empty square", () => {
    const src = read("screens", "ProfileScreen.tsx");
    expect(src).toContain("setPhotoBroken(true)");
    expect(src).toMatch(/me\?\.photo_url && !photoBroken/);
  });
});
