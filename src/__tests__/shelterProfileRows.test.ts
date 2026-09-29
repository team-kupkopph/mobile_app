/**
 * F-R3-4 (test-plan-volunteer Run 3) · a chevron is a promise that the row goes somewhere.
 *
 * ShelterProfileScreen drew "Organization details", "Account settings" and "Help & support"
 * with chevrons and no onPress — the rows around them (Donation QR, Wishlist, Volunteer
 * program) were wrapped in TouchableOpacity, these three were not. Because "Account settings"
 * was dead and nothing else in the shelter shell navigated to `settings` or `notifications`,
 * a shelter had NO in-app route to its notification feed (every signup_requested /
 * attendance_due / signup_cancelled_by_volunteer was push-only) or to the §12.6 / RA 10173
 * data rights (export, delete) in Settings. US-Q1 had already fixed one dead row on this
 * same screen; this makes it a rule instead of a finding.
 *
 * `Row` draws a chevron whenever it isn't locked, and `locked` here is always a runtime
 * value (`locked={gated}`) — so EVERY `<Row` counts, and each must sit directly inside a
 * touchable that has an onPress.
 */
import { readFileSync } from "fs";
import { join } from "path";

const SCREENS = join(__dirname, "..", "screens");
const read = (f: string) => readFileSync(join(SCREENS, f), "utf8");

/** Block + line comments out, so a row described in a comment isn't scanned as one. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

/** The opening tag starting at `i`, up to its closing `>` — skipping the `>` of `=>`. */
function openingTag(src: string, i: number): string {
  let j = i;
  while (j < src.length) {
    if (src[j] === ">" && src[j - 1] !== "=") return src.slice(i, j + 1);
    j++;
  }
  return src.slice(i);
}

/** Every `<Row …/>` on the screen, with the touchable that encloses it (or null). */
function rows(src: string): Array<{ tag: string; wrapper: string | null }> {
  const body = stripComments(src);
  const out: Array<{ tag: string; wrapper: string | null }> = [];
  for (const m of body.matchAll(/<Row\b/g)) {
    const before = body.slice(0, m.index);
    const open = Math.max(before.lastIndexOf("<TouchableOpacity"), before.lastIndexOf("<Pressable"));
    const close = Math.max(before.lastIndexOf("</TouchableOpacity>"), before.lastIndexOf("</Pressable>"));
    // Enclosed only if the nearest touchable before the row is still open, AND nothing but
    // whitespace sits between its `>` and the row — a sibling's wrapper doesn't count.
    let wrapper: string | null = null;
    if (open > close) {
      const tag = openingTag(body, open);
      if (/^\s*$/.test(body.slice(open + tag.length, m.index))) wrapper = tag;
    }
    out.push({ tag: openingTag(body, m.index!), wrapper });
  }
  return out;
}

describe("ShelterProfileScreen · no chevron row without an onPress (F-R3-4)", () => {
  const found = rows(read("ShelterProfileScreen.tsx"));

  it("found the rows it's checking", () => {
    // Donation QR, Wishlist, Volunteer program, Verification, Account settings. A scan that
    // matches nothing passes every assertion below — make it prove it looked.
    expect(found.length).toBeGreaterThanOrEqual(5);
  });

  it("every <Row sits directly inside a touchable with an onPress", () => {
    const dead = found.filter((r) => !r.wrapper || !/\bonPress=/.test(r.wrapper)).map((r) => r.tag);
    expect(dead).toEqual([]);
  });

  it("Account settings opens Settings in its shelter variant", () => {
    const row = found.find((r) => r.tag.includes('label="Account settings"'));
    expect(row?.wrapper).toMatch(/navigate\(\s*"settings",\s*\{\s*shelter:\s*true\s*\}\s*\)/);
  });

  it("the rows with no destination were removed, not left as chevrons", () => {
    const labels = found.map((r) => r.tag);
    expect(labels.filter((t) => /Organization details|Help & support/.test(t))).toEqual([]);
  });
});

describe("the shelter shell reaches its notification feed and settings (F-R3-4)", () => {
  it("the shelter Home header has a bell that opens `notifications`", () => {
    const dash = stripComments(read("ShelterDashboardScreen.tsx"));
    expect(dash).toMatch(/<NotificationBell\b/);
    expect(dash).toMatch(/navigate\(\s*"notifications"\s*\)/);
  });

  it("Settings hides the owner-only ACCOUNT rows for a shelter", () => {
    // Edit profile → the OWNER ProfileScreen and Phone number → the owner verifyPhone are
    // the wrong surfaces for an org; the shelter variant must gate that group.
    const settings = stripComments(read("SettingsScreen.tsx"));
    expect(settings).toMatch(/route\.params\?\.shelter/);
    expect(settings).toMatch(/\.\.\.\(shelter \? \[\] : \[\{\s*title: "ACCOUNT"/);
  });
});

describe("the in-app feed routes every notificationTarget variant (F-R3-4)", () => {
  // Push taps navigate generically (PushBridge); the in-app feed switches by name. It used to
  // end in a catch-all `else → verifyDocuments`, so pledge_received (a SHELTER's) opened the
  // shelter's verification documents instead of its wishlist.
  const union = readFileSync(join(__dirname, "..", "notifications.ts"), "utf8");
  const variants = [...union.matchAll(/\{\s*screen:\s*"(\w+)"/g)].map((m) => m[1]);
  const feed = stripComments(read("NotificationsScreen.tsx"));

  it("found the NotificationTarget variants", () => {
    expect(variants).toEqual(expect.arrayContaining(["shelterVolunteerActivity", "shelterNeeds"]));
  });

  it("has a case for each, and no catch-all fallback", () => {
    const missing = [...new Set(variants)].filter((v) => !feed.includes(`case "${v}":`));
    expect(missing).toEqual([]);
    expect(feed).toMatch(/const unhandled: never = target;/);
  });
});
