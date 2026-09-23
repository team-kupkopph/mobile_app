// US-V8 · Task 5 (K30, G9) — the "My shifts" half of the Kawang-Gawa hub's segmented control.
// Folds what used to be two separate screens (KawangGawaScheduleScreen's upcoming/requested,
// KawangGawaHistoryScreen's stats + history) into one component the hub renders at index 1,
// over the same `/me/signups` payload the hub already fetches for its impact strip. Pure
// presentation: the hub owns the fetch, the load state, and where `onOpen`/`onCancel` go.
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { addToCalendar } from "../../calendarShare";
import { VolunteerIcon } from "../AppIcons";
import {
  historyHours, locationLine, MySignupItem, MySignups, shiftHeadline, shiftTypeLabel,
  signupStatusCard
} from "../../volunteer";
import { TAP_SLOP } from "../../touch";
import { colors, typography } from "../../theme";
import { Card, Chip } from "../ui";

function shiftDateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function shiftWhenLabel(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const date = start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const startTime = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const endTime = end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date} · ${startTime}–${endTime}`;
}

// Sum of `item.hours` across completed shifts only — the numeric aggregate for the Hours stat.
// `historyHours` (from ../../volunteer) formats a single item for display; it isn't summed itself.
function totalCompletedHours(history: MySignupItem[]): number {
  return history
    .filter((i) => i.status === "completed")
    .reduce((sum, i) => sum + (i.hours ?? 0), 0);
}

function hoursLabel(total: number): string {
  return Number.isInteger(total) ? `${total}h` : `${total.toFixed(1)}h`;
}

function StatusChip({ item }: { item: MySignupItem }) {
  const { label, tone } = signupStatusCard(item);
  return <Chip label={label} tone={tone} />;
}

// A small, separately-tappable affordance on an upcoming/requested card. Nested inside the
// card's own TouchableOpacity (which, on an Upcoming row, navigates to check-in) — RN's touch
// responder system lets the innermost Touchable claim the gesture, so tapping "Cancel" never
// also fires the card tap.
function CancelLink({ label = "Cancel", onPress }: { label?: string; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.6} onPress={onPress} hitSlop={TAP_SLOP} style={styles.cancelLink}>
      <Text style={styles.cancelLinkText}>{label}</Text>
    </TouchableOpacity>
  );
}

// G5 · same "Add to calendar" share action as the check-in screen, nested the same way
// CancelLink is — inside the card's own TouchableOpacity, so tapping it never also opens
// check-in. Busy state is local: this list can hold several cards mid-share at once.
function CalendarLink({ item }: { item: MySignupItem }) {
  const [busy, setBusy] = useState(false);

  async function onPress() {
    if (busy) return;
    setBusy(true);
    try {
      await addToCalendar(item);
    } catch {
      // No error slot on a list card — the OS share sheet not opening is visible on its own.
    } finally {
      setBusy(false);
    }
  }

  return (
    <TouchableOpacity activeOpacity={0.6} onPress={onPress} hitSlop={TAP_SLOP} style={styles.calendarLink} disabled={busy}>
      <Text style={styles.calendarLinkText}>Add to calendar</Text>
    </TouchableOpacity>
  );
}

function ShiftCardBody({ item }: { item: MySignupItem }) {
  return (
    <>
      <View style={styles.cardIcon}>
        <VolunteerIcon color={colors.teal} size={22} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{shiftHeadline(item.shift)}</Text>
        <Text style={styles.cardOrg}>{item.shift.org_name}</Text>
        <Text style={styles.cardMeta}>{shiftWhenLabel(item.shift.starts_at, item.shift.ends_at)}</Text>
        {/* G2 · once the shelter approves, `location` shows up on the embedded shift — the
            meeting point earns its own line rather than crowding the time line. */}
        {item.shift.location && (
          <Text style={styles.cardLocation}>{locationLine(item.shift.location)}</Text>
        )}
        {/* G9 · once the shelter assigns an animal, name it here — the volunteer should not
            have to open check-in just to find out who they're walking. */}
        {item.assigned_animal && (
          <Text style={styles.cardLocation}>You'll walk {item.assigned_animal.name}</Text>
        )}
      </View>
      <StatusChip item={item} />
    </>
  );
}

function HistoryRow({ item }: { item: MySignupItem }) {
  const hours = item.status === "completed" ? historyHours(item) : null;
  return (
    <Card style={styles.card}>
      <View style={styles.cardRow}>
        <View style={styles.cardIcon}>
          <VolunteerIcon color={colors.teal} size={22} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{shiftTypeLabel(item.shift.type)}</Text>
          <Text style={styles.cardOrg}>
            {item.shift.org_name} · {shiftDateLabel(item.shift.starts_at)}
            {hours ? ` · ${hours}` : ""}
          </Text>
        </View>
        <StatusChip item={item} />
      </View>
    </Card>
  );
}

export function MyShifts({
  data, onOpen, onCancel
}: {
  data: MySignups;
  onOpen: (item: MySignupItem) => void;
  onCancel: (item: MySignupItem) => void;
}) {
  const { requested, upcoming, history, reliability } = data;
  const isEmpty = requested.length === 0 && upcoming.length === 0 && history.length === 0;

  if (isEmpty) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.empty}>No shifts yet. Browse and request one — it'll show up here.</Text>
      </View>
    );
  }

  return (
    <View>
      <Card style={styles.statsCard}>
        <View style={styles.statCol}>
          <Text style={styles.statValue}>{reliability.shifts_completed}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCol}>
          <Text style={styles.statValue}>{hoursLabel(totalCompletedHours(history))}</Text>
          <Text style={styles.statLabel}>Hours</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCol}>
          <Text style={styles.statValue}>{reliability.no_shows}</Text>
          <Text style={styles.statLabel}>No-shows</Text>
        </View>
      </Card>

      {requested.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Awaiting approval</Text>
          {requested.map((item) => (
            <Card key={item.signup_id} style={[styles.card, styles.cardColumn]}>
              <View style={styles.cardRow}>
                <ShiftCardBody item={item} />
              </View>
              <View style={styles.cancelOnlyRow}>
                <CancelLink label="Cancel request" onPress={() => onCancel(item)} />
              </View>
            </Card>
          ))}
        </>
      )}

      {upcoming.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Upcoming shifts</Text>
          {upcoming.map((item) => (
            <TouchableOpacity
              key={item.signup_id}
              activeOpacity={0.85}
              onPress={() => onOpen(item)}
              accessibilityRole="button"
              accessibilityLabel="Volunteer shift — open to check in"
              // US-W1 · a card with a NESTED touchable (CancelLink) gets its own accessible
              // container flattened by iOS — a VoiceOver user reaching "open to check in" has
              // no other way to reach Cancel. The action joins the element's rotor instead:
              // reachable without moving the visual link or the card's layout.
              accessibilityActions={[{ name: "cancel", label: "Cancel this shift" }]}
              onAccessibilityAction={(event) => {
                if (event.nativeEvent.actionName === "cancel") onCancel(item);
              }}
            >
              <Card style={styles.cardColumn}>
                <View style={styles.cardRow}>
                  <ShiftCardBody item={item} />
                </View>
                <View style={styles.cardLinkRow}>
                  <CalendarLink item={item} />
                  <CancelLink onPress={() => onCancel(item)} />
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </>
      )}

      {history.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Shift history</Text>
          {history.map((item) => <HistoryRow key={item.signup_id} item={item} />)}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyWrap: { paddingTop: 24, paddingHorizontal: 8 },
  empty: { color: colors.muted, ...typography.body, textAlign: "center" },
  statsCard: { flexDirection: "row", alignItems: "center", paddingVertical: 20, marginBottom: 18 },
  statCol: { flex: 1, alignItems: "center" },
  statDivider: { width: 1, height: 40, backgroundColor: colors.border },
  statValue: { color: colors.ink, ...typography.hero },
  statLabel: { marginTop: 4, color: colors.muted, ...typography.meta, fontWeight: "700" },
  sectionLabel: { marginTop: 18, marginBottom: 12, color: colors.ink, ...typography.subtitle, fontWeight: "800" },
  card: { marginBottom: 12 },
  cardColumn: { marginBottom: 12 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardLinkRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  cancelOnlyRow: { alignItems: "flex-end", marginTop: 10 },
  cancelLink: { paddingVertical: 4, paddingHorizontal: 4 },
  cancelLinkText: { color: colors.danger, ...typography.meta, fontWeight: "800" },
  calendarLink: { paddingVertical: 4, paddingHorizontal: 4 },
  calendarLinkText: { color: colors.teal, ...typography.meta, fontWeight: "800" },
  cardIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.soft,
              alignItems: "center", justifyContent: "center" },
  cardTitle: { color: colors.ink, ...typography.subtitle, fontWeight: "800" },
  cardOrg: { marginTop: 2, color: colors.muted, ...typography.meta, fontWeight: "700" },
  cardMeta: { marginTop: 6, color: colors.teal, ...typography.meta, fontWeight: "700" },
  cardLocation: { marginTop: 4, color: colors.muted, ...typography.caption, fontWeight: "600" }
});
