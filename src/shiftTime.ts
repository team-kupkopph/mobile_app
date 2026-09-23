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
