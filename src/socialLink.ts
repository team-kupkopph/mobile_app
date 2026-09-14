// Canonical Verified Member / shelter "social link" rule (dev/onboarding-validation.md
// §member-verify): required · parses as an http(s) URL · warn-don't-block if the host isn't a
// known social domain — a rescue's proof may be a Linktree or a community page. The SAME
// string the server raises (verifications/serializers.py :: SocialProofURLField) so the two
// never disagree. F9: the screens used to check only "non-empty", so `javascript:alert(1)` was
// stored and rendered to reviewers.
export const SOCIAL_LINK_RULE = "Enter a link, e.g. https://facebook.com/yourpage";

export const SOCIAL_LINK_NOTE = "Not a social site we recognise — that's fine if it's your public page.";

// Hosts we call "social" for the note. Subdomains count (www., m.); look-alikes
// (facebook.com.evil.example, notfacebook.com) do not.
const SOCIAL_HOSTS = [
  "facebook.com", "fb.com", "fb.me", "instagram.com", "tiktok.com", "x.com", "twitter.com",
  "threads.net", "youtube.com", "youtu.be", "linktr.ee"
];

const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
// host = dotted labels with a real TLD; optional port; optional path/query/fragment with no
// whitespace. Deliberately no `URL` — Hermes' implementation is partial.
const HTTP_URL = /^https?:\/\/([a-z0-9-]+\.)+[a-z]{2,}(:\d+)?([/?#]\S*)?$/i;

/** What is sent as `social_proof_url`: trimmed, with https:// assumed when no scheme was typed
 *  (the placeholder itself reads `facebook.com/your.name`). A typed scheme is left alone so a
 *  bad one is refused, not disguised. */
export function normalizeSocialLink(raw: string): string {
  const s = raw.trim();
  if (s.length === 0 || HAS_SCHEME.test(s)) return s;
  return `https://${s}`;
}

/** The field error, or undefined when the link is acceptable. One rule, one copy: empty, a
 *  non-http(s) scheme and not-a-URL all say what to do and give the example. */
export function socialLinkError(raw: string): string | undefined {
  return HTTP_URL.test(normalizeSocialLink(raw)) ? undefined : SOCIAL_LINK_RULE;
}

/** The warn-don't-block note for a valid link whose host isn't a social site we know. Silent
 *  while the link is empty or invalid — the error speaks then. */
export function socialLinkNote(raw: string): string | undefined {
  if (socialLinkError(raw)) return undefined;
  const host = normalizeSocialLink(raw).replace(/^https?:\/\//i, "").split(/[/?#:]/)[0].toLowerCase();
  const social = SOCIAL_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  return social ? undefined : SOCIAL_LINK_NOTE;
}
