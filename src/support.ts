// Review step 7b · how a person reaches Kupkop. Apple 1.2 wants "published contact information so users can easily reach
// you"; 1.5 wants an easy in-app way to do it. This is the one place the address lives, so the screen, the Terms and the
// store listing cannot name different ones.
//
// ⚠️ MQ13 is the owner's: confirm this mailbox is monitored, and name the Support URL for the store listing.
export const SUPPORT_EMAIL = "hello@kupkop.ph";

/** A `mailto:` link that opens the person's mail app with a subject already written, so the message is sortable on arrival. */
export function supportMailto(subject = "Kupkop help"): string {
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}
