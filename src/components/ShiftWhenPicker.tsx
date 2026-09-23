// K29 · pickers, not ISO text. JS-only (no native module → no dev-client rebuild): the next 21
// local days, start times every 30 min from 06:00 to 21:00, and five durations. Anything
// rarer is an owner decision, not a missing feature.
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { upcomingDays } from "../shiftTime";
import { colors, typography } from "../theme";

const STARTS = Array.from({ length: 31 }, (_, i) => {
  const mins = 6 * 60 + i * 30;
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
});
const DURATIONS = [60, 90, 120, 180, 240];

const dayLabel = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
const timeLabel = (t: string) =>
  new Date(`2000-01-01T${t}:00`).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
const durationLabel = (m: number) => (m % 60 === 0 ? `${m / 60} h` : `${Math.floor(m / 60)} h ${m % 60} min`);

function Row<T extends string | number>({ items, value, label, onPick, testID }: {
  items: T[]; value: T; label: (v: T) => string; onPick: (v: T) => void; testID: string;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {items.map((it) => {
        const on = it === value;
        return (
          <TouchableOpacity key={String(it)} testID={`${testID}.${it}`} activeOpacity={0.85}
            accessibilityRole="button" accessibilityState={{ selected: on }}
            style={[styles.chip, on && styles.chipOn]} onPress={() => onPick(it)}>
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{label(it)}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

export function ShiftWhenPicker({ day, start, durationMins, onChange }: {
  day: string; start: string; durationMins: number;
  onChange: (v: { day: string; start: string; durationMins: number }) => void;
}) {
  const days = upcomingDays(21);
  return (
    <View>
      <Text style={styles.label}>Day</Text>
      <Row items={days} value={day} label={dayLabel} testID="pick.day" onPick={(d) => onChange({ day: d, start, durationMins })} />
      <Text style={styles.label}>Starts</Text>
      <Row items={STARTS} value={start} label={timeLabel} testID="pick.start" onPick={(s) => onChange({ day, start: s, durationMins })} />
      <Text style={styles.label}>How long</Text>
      <Row items={DURATIONS} value={durationMins} label={durationLabel} testID="pick.duration" onPick={(m) => onChange({ day, start, durationMins: m })} />
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginTop: 14, marginBottom: 8, color: colors.muted, ...typography.meta, fontWeight: "700" },
  row: { gap: 8, paddingRight: 24 },
  chip: { height: 44, paddingHorizontal: 16, borderRadius: 22, justifyContent: "center", backgroundColor: colors.white },
  chipOn: { backgroundColor: colors.teal },
  chipText: { color: colors.ink, ...typography.meta, fontWeight: "700" },
  chipTextOn: { color: colors.white }
});
