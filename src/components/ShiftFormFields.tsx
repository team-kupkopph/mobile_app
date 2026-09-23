// K29 / G1 · the shared shelter-shift form: what (type, title, description), where (meeting
// point + optional custom address), who (capacity), and when (ShiftWhenPicker). Used by both
// ShelterVolunteerCreateScreen (POST) and ShelterVolunteerEditScreen (PATCH) so the two forms
// cannot drift the way the old copy-pasted TypeChips + raw ISO-text fields already had.
//
// Errors are per-field (K29, G1): each offending control gets its own message underneath it,
// never a form-level summary — same rule Field.tsx already documents for a single field.
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { shiftWindow } from "../shiftTime";
import { ShiftType, shiftTypeLabel } from "../volunteer";
import { colors, radii, spacing, typography } from "../theme";
import { Field } from "./ui";
import { ShiftWhenPicker } from "./ShiftWhenPicker";

const SHIFT_TYPES: ShiftType[] = ["walking", "feeding", "visitor", "event", "facility", "transport"];

export type ShiftFormValue = {
  type: ShiftType; title: string; description: string; meetingPoint: string;
  day: string; start: string; durationMins: number; capacity: string;
  useShelterAddress: boolean; addressLine1: string; barangay: string; city: string; province: string;
};
export type ShiftFormErrors = Partial<Record<"title" | "when" | "capacity" | "location", string>>;

export function validateShiftForm(v: ShiftFormValue): ShiftFormErrors {
  const e: ShiftFormErrors = {};
  if (!v.title.trim()) e.title = "Give the activity a short name.";
  if (!v.day || !v.start) e.when = "Pick a day and a start time.";
  const cap = Number.parseInt(v.capacity, 10);
  if (!Number.isInteger(cap) || cap < 1 || String(cap) !== v.capacity.trim()) e.capacity = "At least 1 volunteer.";
  if (!v.useShelterAddress && !v.city.trim()) e.location = "Enter the city where this happens.";
  return e;
}

/**
 * Fix round 1 (P2 T5, Finding 2) · a `location_required` 422 says "...or enter one here", but
 * if the toggle is still on, the address fields are hidden and the message points at nothing.
 * Both screens' `submit()` run the form through this before setting the error, so the fields
 * are visible under the message rather than just fixing the copy.
 */
export function revealLocationOnError(v: ShiftFormValue): ShiftFormValue {
  return { ...v, useShelterAddress: false };
}

export function shiftFormBody(v: ShiftFormValue): Record<string, unknown> | null {
  const w = shiftWindow(v.day, v.start, v.durationMins);
  if (!w) return null;
  const body: Record<string, unknown> = {
    type: v.type, title: v.title.trim(), description: v.description.trim(),
    meeting_point: v.meetingPoint.trim(), capacity: Number.parseInt(v.capacity, 10), ...w
  };
  if (!v.useShelterAddress) {
    Object.assign(body, { address_line1: v.addressLine1.trim(), barangay: v.barangay.trim(),
                          city: v.city.trim(), province: v.province.trim() });
  }
  return body;
}

export function ShiftFormFields({ value, onChange, errors, lockShelterAddress }: {
  value: ShiftFormValue; onChange: (v: ShiftFormValue) => void; errors: ShiftFormErrors;
  /**
   * Fix round 1 (P2 T5, Finding 1) · Edit's PATCH only sends keys that changed from the
   * loaded baseline (see ShelterVolunteerEditScreen). Flipping this toggle back on there
   * would omit the address keys from the diff entirely, so the PATCH sends nothing and the
   * shelter's custom address silently persists while the toggle shows "on" — the UI would be
   * lying. Rather than clear the address (which would drop the city too) or fetch the
   * shelter's primary address just to re-populate it, Edit greys the toggle out: honest,
   * and no extra API round trip.
   */
  lockShelterAddress?: boolean;
}) {
  const set = <K extends keyof ShiftFormValue>(key: K) => (val: ShiftFormValue[K]) => onChange({ ...value, [key]: val });

  return (
    <View>
      <Text style={styles.label}>Activity type</Text>
      <TypeChips value={value.type} onChange={set("type")} />

      <Field
        label="Title"
        value={value.title}
        onChangeText={set("title")}
        placeholder="Morning dog walk"
        error={errors.title}
      />

      <Field
        label="Description"
        value={value.description}
        onChangeText={set("description")}
        placeholder="What will volunteers do?"
        multiline
        numberOfLines={3}
      />

      <Field
        label="Meeting point"
        value={value.meetingPoint}
        onChangeText={set("meetingPoint")}
        placeholder="Front gate"
      />

      <Field
        label="Capacity"
        value={value.capacity}
        onChangeText={set("capacity")}
        placeholder="1"
        keyboardType="number-pad"
        error={errors.capacity}
      />

      <Text style={styles.label}>When</Text>
      {errors.when ? <Text style={styles.errorText}>{errors.when}</Text> : null}
      <ShiftWhenPicker
        day={value.day}
        start={value.start}
        durationMins={value.durationMins}
        onChange={(w) => onChange({ ...value, ...w })}
      />

      <TouchableOpacity
        style={[styles.toggleRow, lockShelterAddress && styles.toggleRowLocked]}
        activeOpacity={lockShelterAddress ? 1 : 0.85}
        accessibilityRole="switch"
        accessibilityState={{ checked: value.useShelterAddress, disabled: !!lockShelterAddress }}
        disabled={lockShelterAddress}
        onPress={() => set("useShelterAddress")(!value.useShelterAddress)}
      >
        <View style={[styles.checkbox, value.useShelterAddress && styles.checkboxOn]} />
        <Text style={styles.toggleLabel}>Use our shelter address</Text>
      </TouchableOpacity>
      {lockShelterAddress ? (
        <Text style={styles.helperText}>Address is set — edit the fields below to change it.</Text>
      ) : null}
      {errors.location ? <Text style={styles.errorText}>{errors.location}</Text> : null}

      {!value.useShelterAddress ? (
        <View>
          <Field
            label="Address line 1"
            value={value.addressLine1}
            onChangeText={set("addressLine1")}
            placeholder="12 Shelter Rd"
          />
          <Field
            label="Barangay"
            value={value.barangay}
            onChangeText={set("barangay")}
            placeholder="Concepcion Uno"
          />
          <Field
            label="City"
            value={value.city}
            onChangeText={set("city")}
            placeholder="Marikina"
          />
          <Field
            label="Province"
            value={value.province}
            onChangeText={set("province")}
            placeholder="Metro Manila"
          />
        </View>
      ) : null}
    </View>
  );
}

function TypeChips({ value, onChange }: { value: ShiftType; onChange: (t: ShiftType) => void }) {
  return (
    <View style={styles.chipGrid}>
      {SHIFT_TYPES.map((t) => {
        const active = t === value;
        return (
          <TouchableOpacity
            key={t}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onChange(t)}
            activeOpacity={0.85}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{shiftTypeLabel(t)}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginTop: 20, marginBottom: 10, color: colors.ink, ...typography.strong, fontWeight: "700" },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    minWidth: "47%", height: 48, borderRadius: radii.chip, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 12, backgroundColor: colors.white
  },
  chipActive: { backgroundColor: colors.soft },
  chipText: { color: colors.muted, ...typography.meta, fontWeight: "700" },
  chipTextActive: { color: colors.teal },
  toggleRow: { flexDirection: "row", alignItems: "center", minHeight: 44, marginTop: spacing.md },
  toggleRowLocked: { opacity: 0.5 },
  helperText: { ...typography.meta, color: colors.muted, marginTop: 4 },
  // A circle, not a square: radius is exactly half the box (pill rule) so it doesn't read as
  // off-scale geometry — a rounded-square checkbox would need its own token this app has no
  // other use for.
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.muted, marginRight: spacing.sm },
  checkboxOn: { backgroundColor: colors.teal, borderColor: colors.teal },
  toggleLabel: { color: colors.ink, ...typography.strong, fontWeight: "700" },
  errorText: { ...typography.meta, fontWeight: "600", color: colors.danger, marginTop: 4 }
});
