// Step 12 / PQ4 · a pet's birthdate, picked rather than typed, with an "Approximate" option for the
// rescues and adoptees whose exact day nobody knows (Feature Spec §3.2). JS-only, like
// ShiftWhenPicker (K29): no native module, so no dev-client rebuild.
//
// Exact date needs a year, a month and a day; Approximate needs only a year and a month and is
// stored as the 1st of that month with `dob_approximate` set. Nothing in the future is offered.
// Until a date is complete the value stays blank, which the server accepts as "not known".
import { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { SegmentedControl } from "./ui";
import { BIRTHDATE_MODES, birthdateParts, birthdateSummary, birthdateValue, daysIn } from "../petForm";
import { TAP_SLOP } from "../touch";
import { colors, typography } from "../theme";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const YEARS_BACK = 30;

function Chips({ items, value, label, onPick, testID }: {
  items: number[]; value: number | null; label: (v: number) => string; onPick: (v: number) => void; testID: string;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {items.map((it) => {
        const on = it === value;
        return (
          <TouchableOpacity key={it} testID={`${testID}.${it}`} activeOpacity={0.85}
            accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={label(it)}
            style={[styles.chip, on && styles.chipOn]} onPress={() => onPick(it)}>
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{label(it)}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

export function BirthdatePicker({ value, approximate, onChange, error, today = new Date() }: {
  value: string; approximate: boolean; error?: string; today?: Date;
  onChange: (v: { birthdate: string; approximate: boolean }) => void;
}) {
  const initial = birthdateParts(value);
  const [year, setYear] = useState<number | null>(initial.year);
  const [month, setMonth] = useState<number | null>(initial.month);
  const [day, setDay] = useState<number | null>(approximate ? null : initial.day);
  const [approx, setApprox] = useState(approximate);

  // An edit form fills `value` after its load: take it once it arrives. A value this picker just
  // emitted is skipped: while an exact date is incomplete it is blank, and re-reading it would wipe
  // the year and month the person has already picked.
  const emitted = useRef<string | null>(null);
  useEffect(() => {
    if (emitted.current === `${value}|${approximate}`) return;
    const p = birthdateParts(value);
    setYear(p.year); setMonth(p.month); setDay(approximate ? null : p.day); setApprox(approximate);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the parent's value changes
  }, [value, approximate]);

  const thisYear = today.getFullYear();
  const years = Array.from({ length: YEARS_BACK + 1 }, (_, i) => thisYear - i);
  const lastMonth = year === thisYear ? today.getMonth() + 1 : 12;
  const months = Array.from({ length: lastMonth }, (_, i) => i + 1);
  const lastDay = year && month ? (year === thisYear && month === today.getMonth() + 1 ? today.getDate() : daysIn(year, month)) : 0;
  const days = Array.from({ length: lastDay }, (_, i) => i + 1);

  function emit(y: number | null, m: number | null, d: number | null, a: boolean) {
    const mm = y && m ? Math.min(m, y === thisYear ? today.getMonth() + 1 : 12) : m;
    const dd = y && mm && d ? Math.min(d, daysIn(y, mm)) : d;
    setYear(y); setMonth(mm); setDay(a ? null : dd); setApprox(a);
    const out = { birthdate: birthdateValue(y, mm, a ? null : dd, a), approximate: a && !!y && !!mm };
    emitted.current = `${out.birthdate}|${out.approximate}`;
    onChange(out);
  }

  return (
    <View testID="picker.birthdate">
      <SegmentedControl testID="seg.birthdate.mode" segments={[...BIRTHDATE_MODES]} index={approx ? 1 : 0}
        onChange={(i) => emit(year, month, day, i === 1)} />
      <Text style={styles.label}>Year</Text>
      <Chips items={years} value={year} label={String} testID="pick.birthYear" onPick={(y) => emit(y, month, day, approx)} />
      <Text style={styles.label}>Month</Text>
      <Chips items={months} value={month} label={(m) => MONTHS[m - 1]} testID="pick.birthMonth"
        onPick={(m) => emit(year, m, day, approx)} />
      {!approx && year && month ? (
        <>
          <Text style={styles.label}>Day</Text>
          <Chips items={days} value={day} label={String} testID="pick.birthDay" onPick={(d) => emit(year, month, d, approx)} />
        </>
      ) : null}
      <View style={styles.summaryRow}>
        <Text style={styles.summary} testID="text.birthdate.summary">{birthdateSummary(year, month, approx ? null : day, approx)}</Text>
        {year || month ? (
          <TouchableOpacity hitSlop={TAP_SLOP} accessibilityRole="button" style={styles.clear} testID="btn.birthdate.clear"
            onPress={() => emit(null, null, null, false)}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? <Text style={styles.error} accessibilityRole="alert" testID="error.petForm.birthdate">{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginTop: 14, marginBottom: 8, color: colors.muted, ...typography.meta, fontWeight: "700" },
  row: { gap: 8, paddingRight: 24 },
  chip: { minHeight: 44, minWidth: 44, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: colors.white },
  chipOn: { backgroundColor: colors.teal },
  chipText: { color: colors.ink, ...typography.meta, fontWeight: "700" },
  chipTextOn: { color: colors.white },
  summaryRow: { marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  summary: { flex: 1, color: colors.ink, ...typography.strong, fontWeight: "700" },
  clear: { minHeight: 44, justifyContent: "center", paddingHorizontal: 8 },
  clearText: { color: colors.teal, ...typography.strong, fontWeight: "700" },
  error: { marginTop: 8, color: colors.danger, ...typography.meta, fontWeight: "600" }
});
