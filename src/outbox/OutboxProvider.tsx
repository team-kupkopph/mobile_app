// US-O3 · the outbox's storage and flush loop.
//
// The rules live in `src/outbox.ts` (pure, tested). This is the part that has to survive an
// app restart — because the scenario the outbox exists for is someone in a dead spot who
// backgrounds the app, and a queue held only in memory would lose exactly the report §13.3
// says must never be lost.
//
// Stored with SecureStore rather than AsyncStorage: a queued report holds the animal's
// precise coordinates, which §12.5 treats as sensitive, and it sits on the device until the
// network returns.
import * as SecureStore from "expo-secure-store";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import { useApi } from "../api/useApi";
import { useAuth } from "../auth/AuthContext";
import { accountIdFromAccessToken } from "../auth/idToken";
import { useConnectivity } from "../net/ConnectivityProvider";
import {
  applyFlushResult, applyResult, dueItems, nextFlushDelay, ownedBy, QueuedReport, queueReport, visibleTo,
} from "../outbox";

const KEY = "kupkop.outbox.reports";

type Value = {
  queue: QueuedReport[];
  /** Queue a report that could not be sent. Returns its idempotency key. */
  enqueue: (body: Record<string, unknown>, key: string, photoUri?: string) => Promise<void>;
  /** Try everything that is due, now. */
  flush: () => Promise<void>;
  /** Force one item past its backoff (the user tapped "Try again"). */
  retry: (key: string) => Promise<void>;
  /** The user chose to discard it. The ONLY way a report leaves unsent. */
  discard: (key: string) => Promise<void>;
  /** C16 · drop every queued report that belongs to this account (Log out → Discard, or the
   *  account being deleted). Legacy items without an owner count as the account's. */
  discardAllFor: (ownerId: string | null) => Promise<void>;
};

const OutboxContext = createContext<Value>({
  queue: [], enqueue: async () => {}, flush: async () => {},
  retry: async () => {}, discard: async () => {}, discardAllFor: async () => {},
});

async function load(): Promise<QueuedReport[]> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    return raw ? (JSON.parse(raw) as QueuedReport[]) : [];
  } catch {
    // A corrupt queue must not crash the app on launch. Losing it is bad; failing to start
    // is worse, and the person can re-file.
    return [];
  }
}

async function save(queue: QueuedReport[]) {
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify(queue));
  } catch { /* a failed write means one lost retry, not a crash */ }
}

export function OutboxProvider({ children }: { children: React.ReactNode }) {
  const api = useApi();
  const { tokens } = useAuth();
  const { online, onReconnect } = useConnectivity();
  // C16 · whose reports this session may send and see.
  const ownerId = accountIdFromAccessToken(tokens?.access ?? undefined);
  const [queue, setQueue] = useState<QueuedReport[]>([]);
  const flushing = useRef(false);
  // PR3-F2 · a flush asked for while one is running (a report queued mid-send, the retry timer)
  // runs again when the current pass ends, instead of being dropped.
  const flushAgain = useRef(false);
  const queueRef = useRef<QueuedReport[]>([]);

  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { void load().then(setQueue); }, []);

  const write = useCallback(async (next: QueuedReport[]) => {
    queueRef.current = next;
    setQueue(next);
    await save(next);
  }, []);

  const flush = useCallback(async () => {
    // One flush at a time. Two concurrent passes would send the same item twice — the server
    // would dedupe it (that is what the idempotency key is for), but the second response
    // would race the first's queue write and could resurrect a sent report.
    if (!tokens) return;
    if (flushing.current) { flushAgain.current = true; return; }
    flushing.current = true;
    try {
      do {
        flushAgain.current = false;
        const now = Date.now();
        for (const item of dueItems(queueRef.current, now, ownerId)) {
          // PR3-F1 · an item discarded while an earlier POST was in flight is not sent.
          if (!queueRef.current.some((i) => i.idempotency_key === item.idempotency_key)) continue;
          const res = await api.post("/reports", item.body);
          const next = applyResult(item, { ok: res.ok, status: res.status }, Date.now());
          // PR3-F1 · re-read the queue AFTER the await: a report enqueued or discarded during the
          // send must survive / stay discarded, not be overwritten by a stale snapshot.
          const latest = queueRef.current;
          const updated = applyFlushResult(latest, item, next);
          if (updated !== latest) await write(updated);
        }
      } while (flushAgain.current);
    } finally {
      flushing.current = false;
    }
  }, [api, tokens, ownerId, write]);

  // Flush when the network comes back — the whole point of queueing.
  useEffect(() => onReconnect(() => { void flush(); }), [onReconnect, flush]);
  // ...and once on launch, in case the app was killed while offline and reopened online.
  useEffect(() => { if (online && tokens) void flush(); }, [online, tokens, flush]);
  // PR3-F2 · ...and on a timer while online. A timeout or a 502/503/504 queues the report with
  // the phone still online (C17), so no reconnect is coming: wake up when the earliest retry is due.
  useEffect(() => {
    if (!online || !tokens) return;
    const delay = nextFlushDelay(queue, Date.now(), ownerId);
    if (delay === null) return;
    const timer = setTimeout(() => { void flush(); }, delay);
    return () => clearTimeout(timer);
  }, [online, tokens, queue, ownerId, flush]);

  const enqueue = useCallback(async (body: Record<string, unknown>, key: string, photoUri?: string) => {
    await write([...queueRef.current, queueReport(body, key, Date.now(), photoUri, ownerId ?? undefined)]);
    // PR3-F2 · queued with the phone online (a timeout, a gateway error): try it now.
    if (online) void flush();
  }, [write, ownerId, online, flush]);

  const retry = useCallback(async (key: string) => {
    await write(queueRef.current.map((i) =>
      i.idempotency_key === key ? { ...i, attempts: 0, nextAttemptAt: 0, lastError: undefined } : i));
    await flush();
  }, [write, flush]);

  const discard = useCallback(async (key: string) => {
    await write(queueRef.current.filter((i) => i.idempotency_key !== key));
  }, [write]);

  const discardAllFor = useCallback(async (owner: string | null) => {
    await write(queueRef.current.filter((i) => !ownedBy(i, owner)));
  }, [write]);

  return (
    <OutboxContext.Provider value={{ queue: visibleTo(queue, ownerId), enqueue, flush, retry, discard, discardAllFor }}>
      {children}
    </OutboxContext.Provider>
  );
}

export function useOutbox() {
  return useContext(OutboxContext);
}
