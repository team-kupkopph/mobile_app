// K3 · how a shift time crosses the wire. The server refuses a time without an offset (it
// used to guess US Central), so every value leaves the app as "local wall clock + this
// device's offset", and every value shown for editing is converted back to wall clock.
// Pure and offset-injectable so it is testable in any CI time zone.

const deviceOffset = () => -new Date().getTimezoneOffset();

const LOCAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

function pad(n: number): string { return String(Math.abs(n)).padStart(2, "0"); }

function offsetSuffix(mins: number): string {
  const sign = mins < 0 ? "-" : "+";
  return `${sign}${pad(Math.trunc(mins / 60))}:${pad(mins % 60)}`;
}

export function toOffsetIso(text: string, offsetMinutes: number = deviceOffset()): string | null {
  const m = LOCAL.exec(text.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  const month = Number(mo), day = Number(d), hour = Number(h), minute = Number(mi);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;
  return `${y}-${mo}-${d}T${h}:${mi}:${s ?? "00"}${offsetSuffix(offsetMinutes)}`;
}

export function toLocalInputValue(iso: string, offsetMinutes: number = deviceOffset()): string {
  const shifted = new Date(new Date(iso).getTime() + offsetMinutes * 60000);
  const y = shifted.getUTCFullYear();
  return `${y}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}` +
         `T${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`;
}

// ── Kawang-Gawa shift picker (P2 · what/where/who, 2026-09-23) ─────────────────────────────

function localParts(ms: number, offsetMinutes: number) {
  const d = new Date(ms + offsetMinutes * 60000);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes() };
}
const ymd = (p: { y: number; m: number; d: number }) => `${p.y}-${pad(p.m)}-${pad(p.d)}`;

/** The next `count` local calendar days, starting today, as "YYYY-MM-DD" — for the shift picker. */
export function upcomingDays(count: number, nowMs: number = Date.now(), offsetMinutes: number = deviceOffset()): string[] {
  const days: string[] = [];
  for (let i = 0; i < count; i++) days.push(ymd(localParts(nowMs + i * 86400000, offsetMinutes)));
  return days;
}

/** Builds an offset-aware start/end pair from a local day, start time and duration. Null on an
 *  invalid day/time or a non-positive duration. */
export function shiftWindow(day: string, start: string, durationMins: number, offsetMinutes: number = deviceOffset()) {
  const startsAt = toOffsetIso(`${day}T${start}`, offsetMinutes);
  if (!startsAt || durationMins <= 0) return null;
  const endMs = new Date(startsAt).getTime() + durationMins * 60000;
  const e = localParts(endMs, offsetMinutes);
  const endsAt = toOffsetIso(`${ymd(e)}T${pad(e.h)}:${pad(e.mi)}`, offsetMinutes)!;
  return { starts_at: startsAt, ends_at: endsAt };
}

/** `shiftWindow`'s inverse — splits a start/end ISO pair back into local day, start time and
 *  duration, for prefilling the picker when editing an existing shift. */
export function windowParts(startsIso: string, endsIso: string, offsetMinutes: number = deviceOffset()) {
  const s = localParts(new Date(startsIso).getTime(), offsetMinutes);
  const durationMins = Math.round((new Date(endsIso).getTime() - new Date(startsIso).getTime()) / 60000);
  return { day: ymd(s), start: `${pad(s.h)}:${pad(s.mi)}`, durationMins };
}
