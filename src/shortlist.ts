/**
 * The Adopt deck's shortlist — what the person saved and hid — as it moves between this phone
 * and the account. Pure; `useShortlist` does the storage and the network.
 *
 * ⚠️ LOCAL FIRST, SERVER WINS. The deck renders from what the phone remembers the instant it
 * mounts; the server's list arrives a moment later and is merged ONCE per session. On a
 * conflict — the phone says saved, the account says hidden — the account wins, because it is
 * what every other device already sees. Entries the phone has and the account lacks are
 * PUSHED, not dropped: that is the one-time migration of what people saved before the
 * shortlist lived on the account, and it happens on their first sync, unasked.
 *
 * ⚠️ WRITES ARE OPTIMISTIC AND IDEMPOTENT. A swipe updates the phone at once and queues one
 * operation per listing; the queue is coalesced (the last word per listing) and flushed with
 * PUT / DELETE, both of which the server treats as repeatable. A failed flush leaves the
 * operation queued; nothing the person did is lost, and nothing is applied twice.
 */
export type Kind = "saved" | "hidden";
export type Shortlist = { saved: string[]; hidden: string[] };
/** `kind: null` is a delete — the undo of a save or a hide. */
export type PendingOp = { id: string; kind: Kind | null; at: number };

export const EMPTY: Shortlist = { saved: [], hidden: [] };

/** Which list an id is in, if any. Saved and hidden are exclusive, so at most one. */
export function kindOf(s: Shortlist, id: string): Kind | null {
  if (s.saved.includes(id)) return "saved";
  if (s.hidden.includes(id)) return "hidden";
  return null;
}

/** The shortlist with one listing's answer set — moved between lists, or removed. */
export function withKind(s: Shortlist, id: string, kind: Kind | null): Shortlist {
  const saved = s.saved.filter((x) => x !== id);
  const hidden = s.hidden.filter((x) => x !== id);
  if (kind === "saved") saved.unshift(id);
  if (kind === "hidden") hidden.unshift(id);
  return { saved, hidden };
}

/**
 * The first sync of a session: what the deck should now show, and what the server is missing.
 * Server wins where both have an answer; the phone's other answers are pushed.
 */
export function mergeForFirstSync(local: Shortlist, server: Shortlist): { merged: Shortlist; pushes: PendingOp[] } {
  let merged = server;
  const pushes: PendingOp[] = [];
  for (const kind of ["saved", "hidden"] as const) {
    for (const id of local[kind]) {
      if (kindOf(server, id) === null) {
        merged = withKind(merged, id, kind);
        pushes.push({ id, kind, at: 0 });
      }
    }
  }
  return { merged, pushes };
}

/** The last word per listing, in the order the last words were said. */
export function coalesce(ops: PendingOp[]): PendingOp[] {
  const last = new Map<string, PendingOp>();
  for (const op of ops) last.set(op.id, op);
  return [...last.values()].sort((a, b) => a.at - b.at);
}

/** The queued operations applied over a list — what the server will hold once they land. */
export function applyPending(s: Shortlist, ops: PendingOp[]): Shortlist {
  return coalesce(ops).reduce((acc, op) => withKind(acc, op.id, op.kind), s);
}

/** The operations that turn `before` into `after` — one per listing whose answer changed. */
export function diff(before: Shortlist, after: Shortlist, at: number): PendingOp[] {
  const ids = new Set([...before.saved, ...before.hidden, ...after.saved, ...after.hidden]);
  const out: PendingOp[] = [];
  for (const id of ids) {
    const was = kindOf(before, id), now = kindOf(after, id);
    if (was !== now) out.push({ id, kind: now, at });
  }
  return out;
}
