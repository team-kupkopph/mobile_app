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

/**
 * The `›` chevrons the screen draws OUTSIDE `<Row` — the accents — each with the innermost
 * touchable enclosing it (or null). The Row component's own chevron is cut out first: every
 * `<Row` call site is checked above, so its body would only be a false positive here.
 */
function looseChevrons(src: string): { rowChevronCut: boolean; found: Array<{ at: string; wrapper: string | null }> } {
  const noComments = stripComments(src);
  const body = noComments.replace(/\nfunction Row\([\s\S]*?\n\}\n/, "\n");
  const rowChevronCut = body !== noComments;
  const found: Array<{ at: string; wrapper: string | null }> = [];
  for (const m of body.matchAll(/›/g)) {
    // Walk every touchable tag before the glyph with a stack, so a sibling's wrapper that
    // opened AND closed earlier doesn't count as enclosing it.
    const stack: string[] = [];
    for (const t of body.slice(0, m.index).matchAll(/<(\/?)(TouchableOpacity|Pressable)\b/g)) {
      if (t[1]) stack.pop();
      else {
        const tag = openingTag(body, t.index!);
        if (!tag.endsWith("/>")) stack.push(tag);
      }
    }
    const line = body.slice(body.lastIndexOf("\n", m.index) + 1, body.indexOf("\n", m.index)).trim();
    found.push({ at: line, wrapper: stack.length ? stack[stack.length - 1] : null });
  }
  return { rowChevronCut, found };
}

describe("ShelterProfileScreen · no `›` glyph outside a touchable with an onPress", () => {
  // The <Row scan above missed the approved tier-1's "Upgrade to Verified Shelter" accent: a
  // teal block with a chevron and no touchable at all. Any `›` is a promise, not just Row's.
  const { rowChevronCut, found } = looseChevrons(read("ShelterProfileScreen.tsx"));

  it("cut Row's own chevron and found the accents' chevrons", () => {
    expect(rowChevronCut).toBe(true);
    // The gated accent and the tier-1 upgrade accent, at least.
    expect(found.length).toBeGreaterThanOrEqual(2);
  });

  it("every `›` sits inside a touchable with an onPress", () => {
    const dead = found.filter((c) => !c.wrapper || !/\bonPress=/.test(c.wrapper)).map((c) => c.at);
    expect(dead).toEqual([]);
  });

  it("the tier-1 upgrade accent opens the NGO papers in upgrade mode", () => {
    const body = stripComments(read("ShelterProfileScreen.tsx"));
    expect(body).toMatch(/navigate\(\s*"shelterVerifyNgo",\s*\{\s*upgrade:\s*true\s*\}\s*\)/);
  });
});

describe("the tier-1 → tier-2 upgrade posts only the NGO delta", () => {
  // An approved tier-1's base documents are on file; POST /verifications/upgrade (US-X4)
  // counts them, so the upgrade must not route through step 1 and re-upload them.
  const ngo = stripComments(read("ShelterVerifyNgoScreen.tsx"));

  it("upgrade mode posts to /verifications/upgrade", () => {
    expect(ngo).toMatch(/"\/verifications\/upgrade"/);
  });

  it("upgrade mode asks for consent itself — there is no step 1 to have asked", () => {
    expect(ngo).toMatch(/testID="chk\.shelterVerifyNgo\.consentDpa"/);
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
